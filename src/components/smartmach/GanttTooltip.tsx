/**
 * GanttTooltip — всплывающая подсказка с деталями задачи на диаграмме Ганта.
 * Извлечено 1:1 из GanttChart без изменения логики.
 */
import { cn } from "@/lib/utils";
import { ProjectTask, TASK_STATUS_CFG, PRIORITY_CFG } from "@/lib/projects";
import { toMidnight, parseDate, diffDays, fmtFull } from "@/components/smartmach/gantt.utils";

const TODAY = toMidnight(new Date());

export default function GanttTooltip({ task, x, y }: { task: ProjectTask; x: number; y: number }) {
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
