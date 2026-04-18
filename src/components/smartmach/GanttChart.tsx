/**
 * GanttChart — полноценная интерактивная диаграмма Ганта
 * • Перетаскивание полосы (move) → меняет start_date + due_date
 * • Растяжка правого края (resize) → меняет due_date
 * • Snap по дням
 * • Живое сохранение в БД через PUT /projects?resource=task&id=N
 * • Тултип с деталями задачи
 * • Масштаб: месяц / неделя / день
 * • Автоскролл к «сегодня»
 * • Зебра-полосы, выходные дни, линия сегодня
 */
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ProjectTask, TASK_STATUS_CFG, PRIORITY_CFG } from "@/lib/projects";
import {
  ROW_H, NAME_W, HDR_H, SCALE_DAY_W,
  DragState, DragMode,
  toMidnight, parseDate, addDays, diffDays, fmtShort, fmtFull, isWeekend, buildMonths,
  scheduleSave,
} from "@/components/smartmach/gantt.utils";
import GanttToolbar          from "@/components/smartmach/GanttToolbar";
import GanttHeader           from "@/components/smartmach/GanttHeader";
import GanttRow, { GanttNameRow } from "@/components/smartmach/GanttRow";

// ─── Props ────────────────────────────────────────────────────
interface Props {
  tasks: ProjectTask[];
  projectStart: string | null;
  projectEnd: string | null;
  onTaskUpdated: () => void;
}

const TODAY = toMidnight(new Date());

export default function GanttChart({ tasks, projectStart, projectEnd, onTaskUpdated }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]     = useState<"month" | "week" | "day">("week");
  const [tooltip, setTooltip] = useState<{ task: ProjectTask; x: number; y: number } | null>(null);
  const [localDates, setLocalDates] = useState<Record<number, { start: Date | null; end: Date | null }>>({});
  const [drag, setDrag]       = useState<DragState | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const dayW = SCALE_DAY_W[scale];

  // ── Инициализация localDates из задач ─────────────────────────
  useEffect(() => {
    const init: Record<number, { start: Date | null; end: Date | null }> = {};
    tasks.forEach(t => { init[t.id] = { start: parseDate(t.start_date), end: parseDate(t.due_date) }; });
    setLocalDates(init);
  }, [tasks]);

  // ── Временной диапазон ────────────────────────────────────────
  const { rangeStart, totalDays } = useMemo(() => {
    const allDates: Date[] = [TODAY];
    tasks.forEach(t => {
      const s = parseDate(t.start_date); if (s) allDates.push(s);
      const e = parseDate(t.due_date);   if (e) allDates.push(e);
    });
    if (projectStart) { const d = parseDate(projectStart); if (d) allDates.push(d); }
    if (projectEnd)   { const d = parseDate(projectEnd);   if (d) allDates.push(d); }
    const minT = Math.min(...allDates.map(d => d.getTime()));
    const maxT = Math.max(...allDates.map(d => d.getTime()));
    const rs = addDays(new Date(minT), -5);
    const re = addDays(new Date(maxT), +8);
    return { rangeStart: rs, totalDays: Math.max(diffDays(rs, re), 30) };
  }, [tasks, projectStart, projectEnd]);

  const gridWidth = totalDays * dayW;

  // Метки дней/недель
  const dayLabels = useMemo<{ offset: number; label: string; weekend: boolean }[]>(() => {
    if (scale === "month") return [];
    const step = scale === "week" ? 7 : 1;
    const out: { offset: number; label: string; weekend: boolean }[] = [];
    for (let i = 0; i < totalDays; i += step) {
      const d = addDays(rangeStart, i);
      out.push({ offset: i, label: fmtShort(d), weekend: isWeekend(d) });
    }
    return out;
  }, [scale, rangeStart, totalDays]);

  const months   = useMemo(() => buildMonths(rangeStart, totalDays), [rangeStart, totalDays]);
  const todayOff = diffDays(rangeStart, TODAY);
  const todayX   = todayOff * dayW;

  // Скролл к сегодня при монтировании
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayX - 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Координаты полосы ─────────────────────────────────────────
  function barGeom(taskId: number): { left: number; width: number; valid: boolean } {
    const ld = localDates[taskId];
    if (!ld) return { left: 0, width: 0, valid: false };
    const s = ld.start ?? ld.end;
    const e = ld.end   ?? ld.start;
    if (!s || !e) return { left: 0, width: 0, valid: false };
    const left  = diffDays(rangeStart, s) * dayW;
    const width = Math.max(dayW, (diffDays(s, e) + 1) * dayW);
    return { left, width, valid: true };
  }

  // ── Drag handlers ─────────────────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startMouseX;
    const deltaDays = Math.round(dx / dayW);

    setLocalDates(prev => {
      const cur = prev[drag.taskId];
      if (!cur) return prev;

      let newStart = cur.start;
      let newEnd   = cur.end;

      if (drag.mode === "move") {
        newStart = drag.origStart ? addDays(drag.origStart, deltaDays) : null;
        newEnd   = drag.origEnd   ? addDays(drag.origEnd,   deltaDays) : null;
      } else {
        const minEnd = drag.origStart ? addDays(drag.origStart, 0) : null;
        let candidate = drag.origEnd ? addDays(drag.origEnd, deltaDays) : null;
        if (candidate && minEnd && diffDays(minEnd, candidate) < 0) candidate = minEnd;
        newEnd = candidate;
      }

      return { ...prev, [drag.taskId]: { start: newStart, end: newEnd } };
    });
  }, [drag, dayW]);

  const onPointerUp = useCallback(() => {
    if (!drag) return;
    const ld = localDates[drag.taskId];
    if (ld) {
      setSavingId(drag.taskId);
      scheduleSave(drag.taskId, ld.start, ld.end, () => {
        setSavingId(null);
        onTaskUpdated();
      });
    }
    setDrag(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [drag, localDates, onTaskUpdated]);

  useEffect(() => {
    if (drag) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = drag.mode === "move" ? "grabbing" : "ew-resize";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      return () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
    }
  }, [drag, onPointerMove, onPointerUp]);

  function startDrag(e: React.PointerEvent, task: ProjectTask, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    setTooltip(null);
    const ld = localDates[task.id] ?? { start: parseDate(task.start_date), end: parseDate(task.due_date) };
    setDrag({
      taskId: task.id,
      mode,
      startMouseX: e.clientX,
      origStart: ld.start ? new Date(ld.start) : null,
      origEnd:   ld.end   ? new Date(ld.end)   : null,
    });
  }

  // ── Выходные для фона ─────────────────────────────────────────
  const weekendCols: number[] = [];
  for (let i = 0; i < totalDays; i++) {
    if (isWeekend(addDays(rangeStart, i))) weekendCols.push(i);
  }

  // ── Нет задач с датами ────────────────────────────────────────
  const tasksWithDates = tasks.filter(t => t.start_date || t.due_date);
  if (tasksWithDates.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
          <Icon name="BarChart2" size={30} className="text-muted-foreground opacity-30" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-base">Нет данных для диаграммы</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Укажите <strong>дату начала</strong> и/или <strong>срок выполнения</strong> у задач —
            они появятся на диаграмме и их можно будет перетаскивать.
          </p>
        </div>
      </div>
    );
  }

  // ── Рендер ───────────────────────────────────────────────────
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden select-none">

      <GanttToolbar
        scale={scale}
        tasksWithDatesCount={tasksWithDates.length}
        totalTasksCount={tasks.length}
        onScaleChange={setScale}
        onScrollToToday={() =>
          scrollRef.current?.scrollTo({ left: Math.max(0, todayX - 200), behavior: "smooth" })
        }
      />

      {/* Основной грид */}
      <div className="flex overflow-hidden" style={{ maxHeight: "70vh" }}>

        {/* Левая колонка — названия (фиксированная) */}
        <div className="flex-shrink-0 border-r border-border flex flex-col" style={{ width: NAME_W }}>

          {/* Шапка над именами */}
          <div
            className="flex-shrink-0 bg-secondary/20 border-b border-border flex items-end px-3 pb-1.5"
            style={{ height: HDR_H }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Задача
            </span>
          </div>

          {/* Строки имён */}
          <div className="overflow-y-auto flex-1" id="gantt-names-scroll">
            {tasks.map((task, i) => (
              <GanttNameRow
                key={task.id}
                task={task}
                index={i}
                isSaving={savingId === task.id}
              />
            ))}
          </div>
        </div>

        {/* Правая часть — полотно Ганта */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          style={{ scrollbarWidth: "thin" }}
          onScroll={e => {
            const nameCol = document.getElementById("gantt-names-scroll");
            if (nameCol) nameCol.scrollTop = (e.target as HTMLElement).scrollTop;
          }}
        >
          <div style={{ width: Math.max(gridWidth, 400), position: "relative" }}>

            <GanttHeader
              months={months}
              dayLabels={dayLabels}
              dayW={dayW}
              scale={scale}
              todayOff={todayOff}
              todayX={todayX}
              totalDays={totalDays}
            />

            {/* Полотно задач */}
            <div className="relative">

              {/* Фон выходных */}
              {weekendCols.map(off => (
                <div
                  key={off}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: off * dayW, width: dayW, background: "rgba(239,68,68,0.04)" }}
                />
              ))}

              {/* Вертикальные линии недель */}
              {dayLabels
                .filter((_, i) => i % (scale === "day" ? 7 : 1) === 0)
                .map(dl => (
                  <div
                    key={dl.offset}
                    className="absolute top-0 bottom-0 pointer-events-none border-l border-border/20"
                    style={{ left: dl.offset * dayW }}
                  />
                ))}

              {/* Линия «сегодня» */}
              {todayOff >= 0 && todayOff <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                  style={{ left: todayX, width: 2, background: "rgba(239,68,68,0.6)", borderRadius: 1 }}
                >
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-500" />
                </div>
              )}

              {/* Диапазон проекта */}
              {projectStart && projectEnd && (() => {
                const ps = parseDate(projectStart);
                const pe = parseDate(projectEnd);
                if (!ps || !pe) return null;
                const left  = diffDays(rangeStart, ps) * dayW;
                const width = (diffDays(ps, pe) + 1) * dayW;
                return (
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-0"
                    style={{
                      left, width,
                      background: "rgba(99,102,241,0.04)",
                      borderLeft:  "2px solid rgba(99,102,241,0.3)",
                      borderRight: "2px solid rgba(99,102,241,0.3)",
                    }}
                  />
                );
              })()}

              {/* Строки задач */}
              {tasks.map((task, i) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  index={i}
                  geom={barGeom(task.id)}
                  localDate={localDates[task.id]}
                  isDragging={drag?.taskId === task.id}
                  isSaving={savingId === task.id}
                  dragMode={drag ? drag.mode : null}
                  dayW={dayW}
                  todayX={todayX}
                  onPointerDown={startDrag}
                  onMouseEnter={(e, t) => {
                    if (drag) return;
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTooltip({ task: t, x: r.left + r.width / 2, y: r.top });
                  }}
                  onMouseLeave={() => !drag && setTooltip(null)}
                />
              ))}

              <div style={{ height: 12 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Тултип */}
      {tooltip && !drag && (
        <TooltipBox task={tooltip.task} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  );
}

// ─── Тултип ────────────────────────────────────────────────────
function TooltipBox({ task, x, y }: { task: ProjectTask; x: number; y: number }) {
  const ld = { start: parseDate(task.start_date), end: parseDate(task.due_date) };
  const overdue = ld.end && ld.end < TODAY && !["done", "cancelled"].includes(task.status);
  const durationDays = ld.start && ld.end ? diffDays(ld.start, ld.end) + 1 : null;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: Math.min(x, window.innerWidth - 240),
        top: y - 8,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div
        className="bg-gray-900 text-white rounded-xl shadow-2xl px-3.5 py-3 text-xs"
        style={{ minWidth: 200, maxWidth: 260 }}
      >
        <div className="font-semibold text-sm mb-2 leading-tight">{task.name}</div>

        <div className="space-y-1 text-gray-300">
          <TooltipRow label="Статус"    value={TASK_STATUS_CFG[task.status].label} highlight />
          {task.priority !== "medium" && (
            <TooltipRow label="Приоритет" value={PRIORITY_CFG[task.priority].label} />
          )}
          {ld.start && <TooltipRow label="Начало"   value={fmtFull(ld.start)} />}
          {ld.end   && <TooltipRow label="Дедлайн"  value={fmtFull(ld.end)}  danger={!!overdue} />}
          {durationDays !== null && durationDays > 0 && (
            <TooltipRow label="Длительность" value={`${durationDays} дн.`} />
          )}
          {task.assignee_name && (
            <TooltipRow label="Исполнитель" value={task.assignee_name} />
          )}
          {(task.estimated_h > 0 || task.spent_h > 0) && (
            <TooltipRow label="Часы" value={`${task.spent_h} / ${task.estimated_h} ч`} />
          )}
          {task.progress_pct > 0 && (
            <div className="pt-1">
              <div className="flex justify-between mb-1">
                <span>Прогресс</span>
                <span className="text-white font-semibold">{Math.round(task.progress_pct)}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${task.progress_pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {overdue && (
          <div className="mt-2 flex items-center gap-1.5 text-rose-400 text-[10px] font-semibold">
            <span>⚠</span>Срок истёк
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-500">
          Перетащите полосу для изменения дат
        </div>
      </div>
    </div>
  );
}

function TooltipRow({
  label, value, highlight, danger,
}: {
  label: string; value: string; highlight?: boolean; danger?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0">{label}:</span>
      <span className={cn(
        "font-medium truncate text-right",
        highlight ? "text-white" : danger ? "text-rose-400" : "text-gray-200"
      )}>
        {value}
      </span>
    </div>
  );
}
