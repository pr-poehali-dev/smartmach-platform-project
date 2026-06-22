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
import { useRef, useState, useEffect, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { ProjectTask } from "@/lib/projects";
import {
  NAME_W, HDR_H, SCALE_DAY_W,
  toMidnight, parseDate, addDays, diffDays, fmtShort, isWeekend, buildMonths,
} from "@/components/smartmach/gantt.utils";
import GanttToolbar          from "@/components/smartmach/GanttToolbar";
import { GanttNameRow }      from "@/components/smartmach/GanttRow";
import GanttGrid             from "@/components/smartmach/GanttGrid";
import GanttTooltip          from "@/components/smartmach/GanttTooltip";
import { useGanttDrag }      from "@/components/smartmach/useGanttDrag";

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

  const dayW = SCALE_DAY_W[scale];

  const { localDates, drag, savingId, startDrag } = useGanttDrag({
    tasks,
    dayW,
    onTaskUpdated,
    onDragStart: () => setTooltip(null),
  });

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
          <GanttGrid
            tasks={tasks}
            scale={scale}
            dayW={dayW}
            rangeStart={rangeStart}
            totalDays={totalDays}
            gridWidth={gridWidth}
            months={months}
            dayLabels={dayLabels}
            weekendCols={weekendCols}
            todayOff={todayOff}
            todayX={todayX}
            projectStart={projectStart}
            projectEnd={projectEnd}
            localDates={localDates}
            drag={drag}
            savingId={savingId}
            barGeom={barGeom}
            onPointerDown={startDrag}
            onBarMouseEnter={(e, t) => {
              if (drag) return;
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTooltip({ task: t, x: r.left + r.width / 2, y: r.top });
            }}
            onBarMouseLeave={() => !drag && setTooltip(null)}
          />
        </div>
      </div>

      {/* Тултип */}
      {tooltip && !drag && (
        <GanttTooltip task={tooltip.task} x={tooltip.x} y={tooltip.y} />
      )}
    </div>
  );
}
