import { useRef, useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ProjectTask, TASK_STATUS_CFG, PRIORITY_CFG } from "@/lib/projects";

interface Props {
  tasks: ProjectTask[];
  projectStart: string | null;
  projectEnd: string | null;
}

// ── Цвета полос по статусу ────────────────────────────────────
const BAR_COLORS: Record<string, { bar: string; border: string; done: boolean }> = {
  todo:        { bar: "bg-slate-300",   border: "border-slate-400",   done: false },
  in_progress: { bar: "bg-blue-400",    border: "border-blue-600",    done: false },
  review:      { bar: "bg-amber-400",   border: "border-amber-600",   done: false },
  done:        { bar: "bg-emerald-400", border: "border-emerald-600", done: true  },
  cancelled:   { bar: "bg-red-200",     border: "border-red-300",     done: false },
};

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

// Разбить диапазон на месячные группы для шапки
function buildMonths(start: Date, totalDays: number): { label: string; days: number }[] {
  const months: { label: string; days: number }[] = [];
  let cur = new Date(start);
  let remaining = totalDays;
  while (remaining > 0) {
    const endOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    endOfMonth.setHours(0, 0, 0, 0);
    const daysInRange = Math.min(diffDays(cur, endOfMonth) + 1, remaining);
    months.push({ label: formatMonth(cur), days: daysInRange });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    remaining -= daysInRange;
  }
  return months;
}

// Разбить диапазон на недели для меток
function buildWeekLabels(start: Date, totalDays: number): { offset: number; label: string }[] {
  const labels: { offset: number; label: string }[] = [];
  // Первый понедельник >= start
  const firstMonday = new Date(start);
  const dow = firstMonday.getDay();
  const daysToMonday = dow === 0 ? 1 : (8 - dow) % 7;
  if (daysToMonday < totalDays) firstMonday.setDate(firstMonday.getDate() + daysToMonday);

  let cur = new Date(firstMonday);
  while (diffDays(start, cur) < totalDays) {
    labels.push({ offset: diffDays(start, cur), label: formatDay(cur) });
    cur = addDays(cur, 7);
  }
  return labels;
}

const ROW_H   = 38; // высота строки px
const NAME_W  = 220; // ширина колонки имён
const DAY_W   = 28;  // ширина одного дня px

export default function GanttChart({ tasks, projectStart, projectEnd }: Props) {
  const scrollRef   = useRef<HTMLDivElement>(null);
  const [tooltip,   setTooltip]   = useState<{ task: ProjectTask; x: number; y: number } | null>(null);
  const [scale,     setScale]     = useState<"day" | "week">("week");
  const [todayVisible, setTodayVisible] = useState(false);

  // ── Вычисляем временной диапазон ─────────────────────────────
  const tasksWithDates = tasks.filter(t => t.start_date || t.due_date);

  // Крайние даты: берём min/max по задачам, расширяем от проекта
  let rangeStart: Date;
  let rangeEnd: Date;

  const allDates: Date[] = [];
  tasks.forEach(t => {
    const s = parseDate(t.start_date);
    const e = parseDate(t.due_date);
    if (s) allDates.push(s);
    if (e) allDates.push(e);
  });
  if (projectStart) { const d = parseDate(projectStart); if (d) allDates.push(d); }
  if (projectEnd)   { const d = parseDate(projectEnd);   if (d) allDates.push(d); }
  allDates.push(TODAY);

  if (allDates.length === 0) {
    rangeStart = addDays(TODAY, -7);
    rangeEnd   = addDays(TODAY, 30);
  } else {
    rangeStart = addDays(new Date(Math.min(...allDates.map(d => d.getTime()))), -3);
    rangeEnd   = addDays(new Date(Math.max(...allDates.map(d => d.getTime()))), 5);
  }

  const totalDays  = Math.max(diffDays(rangeStart, rangeEnd), 14);
  const dayW       = scale === "day" ? DAY_W : Math.max(8, Math.round(DAY_W * 7 / 14));
  const gridWidth  = totalDays * dayW;

  const months     = buildMonths(rangeStart, totalDays);
  const weekLabels = buildWeekLabels(rangeStart, totalDays);

  // Позиция «сегодня»
  const todayOffset = diffDays(rangeStart, TODAY);
  const todayX      = todayOffset * dayW;

  // Скролл к «сегодня» при монтировании
  useEffect(() => {
    if (scrollRef.current && todayOffset >= 0) {
      const scrollTo = Math.max(0, todayX - 120);
      scrollRef.current.scrollLeft = scrollTo;
      setTodayVisible(todayOffset >= 0 && todayOffset <= totalDays);
    }
  }, [todayX, todayOffset, totalDays]);

  function scrollToToday() {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: Math.max(0, todayX - 120), behavior: "smooth" });
    }
  }

  // ── Функции расчёта полосы ────────────────────────────────────
  function barProps(task: ProjectTask): { left: number; width: number; valid: boolean } {
    const s = parseDate(task.start_date) ?? parseDate(task.due_date);
    const e = parseDate(task.due_date)   ?? parseDate(task.start_date);
    if (!s || !e) return { left: 0, width: 0, valid: false };

    const left  = Math.max(0, diffDays(rangeStart, s)) * dayW;
    const width = Math.max(dayW, diffDays(s, e) * dayW + dayW);
    return { left, width, valid: true };
  }

  // ── Нет задач с датами ────────────────────────────────────────
  if (tasksWithDates.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-secondary/40 flex items-center justify-center">
          <Icon name="BarChart2" size={26} className="text-muted-foreground opacity-40" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Нет данных для диаграммы</p>
          <p className="text-sm text-muted-foreground mt-1">
            Укажите даты начала и/или срок выполнения у задач — они появятся на диаграмме.
          </p>
        </div>
      </div>
    );
  }

  // ── Рендер ───────────────────────────────────────────────────
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">

      {/* Тулбар */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/10">
        <div className="flex items-center gap-2">
          <Icon name="BarChart2" size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Диаграмма Ганта</span>
          <span className="text-xs text-muted-foreground">
            · {tasksWithDates.length} из {tasks.length} задач имеют даты
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={scrollToToday}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border rounded-lg hover:bg-secondary/60 transition-colors">
            <Icon name="CalendarDays" size={13} />Сегодня
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden">
            {(["week", "day"] as const).map(s => (
              <button key={s} onClick={() => setScale(s)}
                className={cn("text-xs px-2.5 py-1.5 transition-colors",
                  scale === s ? "bg-primary text-primary-foreground" : "hover:bg-secondary/60 text-muted-foreground")}>
                {s === "week" ? "Неделя" : "День"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border/50 flex-wrap bg-white">
        {Object.entries(TASK_STATUS_CFG).map(([k, v]) => {
          const c = BAR_COLORS[k];
          return (
            <div key={k} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded-sm border", c.bar, c.border)} />
              <span className="text-[11px] text-muted-foreground">{v.label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-0.5 h-4 bg-red-500" />
          <span className="text-[11px] text-muted-foreground">Сегодня</span>
        </div>
      </div>

      {/* Основная таблица */}
      <div className="flex overflow-hidden" style={{ maxHeight: "72vh" }}>

        {/* Левая колонка — имена задач (sticky) */}
        <div className="flex-shrink-0 border-r border-border overflow-y-auto" style={{ width: NAME_W }}>
          {/* Шапка имён */}
          <div className="sticky top-0 z-10 bg-secondary/30 border-b border-border px-3 flex items-center"
            style={{ height: ROW_H * 2 }}>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Задача</span>
          </div>

          {/* Строки */}
          {tasks.map((task, i) => {
            const cfg    = TASK_STATUS_CFG[task.status];
            const priCfg = PRIORITY_CFG[task.priority];
            const hasDates = !!(task.start_date || task.due_date);
            const isChild  = !!task.parent_id;

            return (
              <div key={task.id}
                className={cn(
                  "flex items-center gap-2 px-3 border-b border-border/40 transition-colors hover:bg-secondary/20",
                  i % 2 === 1 && "bg-secondary/5",
                  !hasDates && "opacity-50"
                )}
                style={{ height: ROW_H, paddingLeft: isChild ? 28 : 12 }}
              >
                {/* Иконка статуса */}
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 border", BAR_COLORS[task.status].bar, BAR_COLORS[task.status].border)}>
                  <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={10} className="text-white" />
                </div>
                {/* Название */}
                <span className={cn("text-xs truncate flex-1",
                  task.status === "done" ? "line-through text-muted-foreground" : "text-foreground font-medium"
                )}>
                  {task.name}
                </span>
                {/* Приоритет (точка) */}
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priCfg.dot)} />
              </div>
            );
          })}
        </div>

        {/* Правая часть — Гант, с горизонтальным скроллом */}
        <div ref={scrollRef} className="flex-1 overflow-auto" style={{ scrollbarWidth: "thin" }}>
          <div style={{ width: gridWidth, minWidth: "100%" }}>

            {/* Шапка — месяцы */}
            <div className="sticky top-0 z-10 bg-white border-b border-border/50"
              style={{ height: ROW_H, display: "flex" }}>
              {months.map((m, i) => (
                <div key={i} className="border-r border-border/30 flex items-center px-2 shrink-0 overflow-hidden"
                  style={{ width: m.days * dayW }}>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate capitalize">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Шапка — недели/дни */}
            <div className="sticky bg-secondary/20 border-b border-border"
              style={{ top: ROW_H, zIndex: 9, height: ROW_H, display: "flex", alignItems: "center", position: "sticky" }}>
              <div className="relative w-full h-full">
                {weekLabels.map((wl, i) => (
                  <div key={i} className="absolute top-0 h-full flex items-center"
                    style={{ left: wl.offset * dayW }}>
                    <div className="h-4 border-l border-border/40 ml-0" />
                    <span className="text-[9px] text-muted-foreground ml-1 whitespace-nowrap">{wl.label}</span>
                  </div>
                ))}
                {/* Сегодня метка */}
                {todayOffset >= 0 && todayOffset <= totalDays && (
                  <div className="absolute top-0 h-full flex items-center pointer-events-none"
                    style={{ left: todayX }}>
                    <div className="h-full border-l-2 border-red-400 border-dashed opacity-60" />
                  </div>
                )}
              </div>
            </div>

            {/* Строки задач */}
            <div className="relative">
              {/* Вертикальные линии недель */}
              {weekLabels.map((wl, i) => (
                <div key={i} className="absolute top-0 bottom-0 border-l border-border/20 pointer-events-none"
                  style={{ left: wl.offset * dayW }} />
              ))}

              {/* Вертикальная линия «сегодня» */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div className="absolute top-0 bottom-0 pointer-events-none z-10"
                  style={{ left: todayX }}>
                  <div className="w-0.5 h-full bg-red-400 opacity-70" />
                </div>
              )}

              {tasks.map((task, i) => {
                const bp     = barProps(task);
                const colors = BAR_COLORS[task.status];
                const pct    = Math.min(100, Math.max(0, task.progress_pct ?? 0));
                const hasDates = bp.valid;

                return (
                  <div key={task.id}
                    className={cn(
                      "relative border-b border-border/30 transition-colors",
                      i % 2 === 1 && "bg-secondary/5"
                    )}
                    style={{ height: ROW_H }}>

                    {hasDates && (
                      <div
                        className={cn(
                          "absolute top-[7px] rounded-md border cursor-pointer transition-all hover:opacity-90 hover:shadow-md",
                          colors.bar, colors.border
                        )}
                        style={{ left: bp.left, width: bp.width, height: ROW_H - 14 }}
                        onMouseEnter={e => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setTooltip({ task, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {/* Прогресс внутри полосы */}
                        {pct > 0 && pct < 100 && (
                          <div
                            className="absolute top-0 left-0 bottom-0 rounded-l-md bg-white/30"
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        {/* Текст на полосе (только если широко) */}
                        {bp.width > 60 && (
                          <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-white/90 truncate select-none">
                            {task.name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Ромб — задача без дат (отмечаем позицию сегодня) */}
                    {!hasDates && (
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-300 border border-slate-400 rotate-45"
                        style={{ left: todayX - 6 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Тултип */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-xl shadow-2xl px-3 py-2.5 text-xs pointer-events-none"
          style={{
            left: Math.min(tooltip.x, window.innerWidth - 220),
            top: tooltip.y - 10,
            transform: "translate(-50%, -100%)",
            minWidth: 180,
            maxWidth: 240,
          }}
        >
          <div className="font-semibold mb-1 leading-tight">{tooltip.task.name}</div>
          <div className="space-y-0.5 text-gray-300">
            <div className="flex justify-between gap-3">
              <span>Статус:</span>
              <span className="text-white font-medium">{TASK_STATUS_CFG[tooltip.task.status].label}</span>
            </div>
            {tooltip.task.start_date && (
              <div className="flex justify-between gap-3">
                <span>Начало:</span>
                <span className="text-white">{new Date(tooltip.task.start_date).toLocaleDateString("ru-RU")}</span>
              </div>
            )}
            {tooltip.task.due_date && (
              <div className="flex justify-between gap-3">
                <span>Дедлайн:</span>
                <span className={cn("font-medium",
                  isOverdueDate(tooltip.task.due_date, tooltip.task.status) ? "text-red-400" : "text-white")}>
                  {new Date(tooltip.task.due_date).toLocaleDateString("ru-RU")}
                </span>
              </div>
            )}
            {tooltip.task.assignee_name && (
              <div className="flex justify-between gap-3">
                <span>Исполнитель:</span>
                <span className="text-white truncate max-w-[110px]">{tooltip.task.assignee_name}</span>
              </div>
            )}
            {tooltip.task.estimated_h > 0 && (
              <div className="flex justify-between gap-3">
                <span>Часы:</span>
                <span className="text-white">{tooltip.task.spent_h}/{tooltip.task.estimated_h} ч</span>
              </div>
            )}
            {tooltip.task.progress_pct > 0 && (
              <div className="flex justify-between gap-3">
                <span>Прогресс:</span>
                <span className="text-white">{Math.round(tooltip.task.progress_pct)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function isOverdueDate(dateStr: string | null, status: string): boolean {
  if (!dateStr || ["done", "cancelled"].includes(status)) return false;
  return new Date(dateStr) < TODAY;
}
