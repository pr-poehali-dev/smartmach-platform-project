import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ProjectTask, TASK_STATUS_CFG, PRIORITY_CFG } from "@/lib/projects";
import { BAR_CFG, DragMode, fmtShort } from "@/components/smartmach/gantt.utils";

interface LocalDate {
  start: Date | null;
  end: Date | null;
}

interface Props {
  task: ProjectTask;
  index: number;
  geom: { left: number; width: number; valid: boolean };
  localDate: LocalDate | undefined;
  isDragging: boolean;
  isSaving: boolean;
  dragMode: DragMode | null;
  dayW: number;
  todayX: number;
  onPointerDown: (e: React.PointerEvent, task: ProjectTask, mode: DragMode) => void;
  onMouseEnter: (e: React.MouseEvent, task: ProjectTask) => void;
  onMouseLeave: () => void;
}

export default function GanttRow({
  task,
  index,
  geom,
  localDate,
  isDragging,
  isSaving,
  dragMode,
  dayW,
  todayX,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const cfg    = TASK_STATUS_CFG[task.status];
  const priCfg = PRIORITY_CFG[task.priority];
  const colors = BAR_CFG[task.status];
  const pct    = Math.min(100, Math.max(0, task.progress_pct ?? 0));

  return (
    <div
      className={cn(
        "relative border-b border-border/20 transition-colors",
        index % 2 === 1 && "bg-secondary/[0.03]",
      )}
      style={{ height: 40 }}
    >
      {geom.valid && (
        <div
          className={cn(
            "absolute rounded-lg border transition-shadow",
            isDragging
              ? "shadow-xl ring-2 ring-primary/40 z-30"
              : "shadow-sm hover:shadow-md z-10",
          )}
          style={{
            left: geom.left,
            width: geom.width,
            top: 7,
            height: 40 - 14,
            background: colors.bg,
            borderColor: colors.border,
            cursor: dragMode
              ? (dragMode === "move" ? "grabbing" : "ew-resize")
              : "grab",
          }}
          onPointerDown={e => onPointerDown(e, task, "move")}
          onMouseEnter={e => onMouseEnter(e, task)}
          onMouseLeave={onMouseLeave}
        >
          {/* Прогресс-заливка */}
          {pct > 0 && (
            <div
              className="absolute top-0 left-0 bottom-0 rounded-l-lg"
              style={{ width: `${pct}%`, background: "rgba(255,255,255,0.28)" }}
            />
          )}

          {/* Текст на полосе */}
          {geom.width > 48 && (
            <span
              className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold truncate pointer-events-none"
              style={{ color: colors.text }}
            >
              {task.name}
            </span>
          )}

          {/* Живые даты при перетаскивании */}
          {isDragging && localDate && (
            <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-[9px] font-mono whitespace-nowrap bg-gray-900 text-white px-1.5 py-0.5 rounded-md pointer-events-none z-50">
              {localDate.start && fmtShort(localDate.start)}
              {localDate.start && localDate.end && " → "}
              {localDate.end && fmtShort(localDate.end)}
            </div>
          )}

          {/* Ручка resize (правый край) */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3 rounded-r-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ cursor: "ew-resize", background: "rgba(0,0,0,0.15)" }}
            onPointerDown={e => onPointerDown(e, task, "resize-right")}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 rounded-full bg-white opacity-80" />
              <div className="w-0.5 h-3 rounded-full bg-white opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Ромб — задача без дат */}
      {!geom.valid && todayX >= 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border border-slate-400 bg-slate-200 pointer-events-none z-10"
          style={{ left: todayX - 6 }}
        />
      )}
    </div>
  );
}

// ─── Левая панель — имя задачи ─────────────────────────────────
interface NameRowProps {
  task: ProjectTask;
  index: number;
  isSaving: boolean;
}

export function GanttNameRow({ task, index, isSaving }: NameRowProps) {
  const cfg    = TASK_STATUS_CFG[task.status];
  const priCfg = PRIORITY_CFG[task.priority];
  const hasDate = !!(task.start_date || task.due_date);

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border/30 px-3",
        index % 2 === 1 && "bg-secondary/[0.04]",
        !hasDate && "opacity-40",
      )}
      style={{
        height: 40,
        paddingLeft: task.parent_id ? 28 : 12,
      }}
    >
      {/* Индикатор статуса */}
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border"
        style={{
          background: BAR_CFG[task.status].bg,
          borderColor: BAR_CFG[task.status].border,
        }}
      >
        <Icon
          name={cfg.icon as Parameters<typeof Icon>[0]["name"]}
          size={10}
          className="text-white opacity-90"
        />
      </div>

      {/* Название */}
      <span className={cn(
        "text-xs flex-1 truncate",
        task.status === "done"
          ? "line-through text-muted-foreground"
          : "text-foreground font-medium"
      )}>
        {task.name}
      </span>

      {/* Сохранение / точка приоритета */}
      {isSaving
        ? <Icon name="Loader" size={11} className="text-primary animate-spin shrink-0" />
        : <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", priCfg.dot)} />
      }
    </div>
  );
}
