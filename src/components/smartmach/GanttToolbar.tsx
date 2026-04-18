import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { TASK_STATUS_CFG } from "@/lib/projects";
import { BAR_CFG } from "@/components/smartmach/gantt.utils";

type Scale = "month" | "week" | "day";

interface Props {
  scale: Scale;
  tasksWithDatesCount: number;
  totalTasksCount: number;
  onScaleChange: (s: Scale) => void;
  onScrollToToday: () => void;
}

export default function GanttToolbar({
  scale,
  tasksWithDatesCount,
  totalTasksCount,
  onScaleChange,
  onScrollToToday,
}: Props) {
  return (
    <>
      {/* Тулбар */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white">
        <div className="flex items-center gap-2.5">
          <Icon name="BarChart2" size={16} className="text-primary" />
          <span className="font-semibold text-sm text-foreground">Диаграмма Ганта</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {tasksWithDatesCount} / {totalTasksCount} задач с датами
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 hidden sm:inline-block">
            Перетаскивайте полосы для изменения дат
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onScrollToToday}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-border rounded-lg hover:bg-secondary/60 transition-colors font-medium"
          >
            <Icon name="CalendarDays" size={13} />Сегодня
          </button>
          <div className="flex border border-border rounded-lg overflow-hidden text-xs">
            {(["month", "week", "day"] as const).map(s => (
              <button key={s} onClick={() => onScaleChange(s)}
                className={cn("px-2.5 py-1.5 transition-colors",
                  scale === s
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/60")}>
                {s === "month" ? "Мес" : s === "week" ? "Нед" : "День"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border/40 bg-secondary/5 flex-wrap">
        {Object.entries(TASK_STATUS_CFG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{ background: BAR_CFG[k].bg, borderColor: BAR_CFG[k].border }}
            />
            <span className="text-[11px] text-muted-foreground">{v.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-0.5 h-4 bg-rose-500 rounded" />
          <span className="text-[11px] text-muted-foreground">Сегодня</span>
          <div className="w-4 h-2.5 bg-slate-100 border border-slate-200 rounded-sm ml-2" />
          <span className="text-[11px] text-muted-foreground">Выходной</span>
        </div>
      </div>
    </>
  );
}
