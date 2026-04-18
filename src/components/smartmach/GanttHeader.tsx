import { cn } from "@/lib/utils";
import { HDR_H } from "@/components/smartmach/gantt.utils";

interface DayLabel {
  offset: number;
  label: string;
  weekend: boolean;
}

interface MonthGroup {
  label: string;
  days: number;
}

interface Props {
  months: MonthGroup[];
  dayLabels: DayLabel[];
  dayW: number;
  scale: "month" | "week" | "day";
  todayOff: number;
  todayX: number;
  totalDays: number;
}

export default function GanttHeader({
  months,
  dayLabels,
  dayW,
  scale,
  todayOff,
  todayX,
  totalDays,
}: Props) {
  return (
    <div
      className="sticky top-0 z-20 bg-white border-b border-border"
      style={{ height: HDR_H }}
    >
      {/* Строка месяцев */}
      <div className="flex border-b border-border/40" style={{ height: HDR_H / 2 }}>
        {months.map((m, i) => (
          <div
            key={i}
            className="border-r border-border/30 flex items-center px-2 shrink-0 overflow-hidden bg-white"
            style={{ width: m.days * dayW }}
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate capitalize">
              {m.label}
            </span>
          </div>
        ))}
      </div>

      {/* Строка дней/недель */}
      <div className="relative overflow-hidden" style={{ height: HDR_H / 2 }}>
        {dayLabels.map((dl) => (
          <div
            key={dl.offset}
            className={cn(
              "absolute top-0 h-full flex items-center border-r border-border/20",
              dl.weekend ? "bg-rose-50/60" : "bg-white"
            )}
            style={{ left: dl.offset * dayW, width: (scale === "day" ? 1 : 7) * dayW }}
          >
            <span className={cn(
              "text-[9px] px-1 truncate",
              dl.weekend ? "text-rose-400 font-semibold" : "text-muted-foreground"
            )}>
              {dl.label}
            </span>
          </div>
        ))}

        {/* Линия «сегодня» в шапке */}
        {todayOff >= 0 && todayOff <= totalDays && (
          <div
            className="absolute top-0 bottom-0 z-10 pointer-events-none"
            style={{ left: todayX, width: 2, background: "rgba(239,68,68,0.7)", borderRadius: 1 }}
          />
        )}
      </div>
    </div>
  );
}
