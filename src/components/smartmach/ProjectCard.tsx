import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  Project, STATUS_CFG, PRIORITY_CFG,
  fmt, fmtDate, isOverdue,
} from "@/lib/projects";

interface Props {
  project: Project;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: Props) {
  const statusCfg   = STATUS_CFG[project.status];
  const priorityCfg = PRIORITY_CFG[project.priority];
  const overdue     = isOverdue(project.end_date, project.status);
  const taskPct     = project.task_count ? Math.round(((project.task_done ?? 0) / project.task_count) * 100) : 0;
  const budgetPct   = project.budget_plan > 0 ? Math.round((project.budget_fact / project.budget_plan) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      {/* Шапка карточки */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {project.code && (
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                {project.code}
              </span>
            )}
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded border",
              statusCfg.bg, statusCfg.color
            )}>
              {statusCfg.label}
            </span>
            {overdue && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-600">
                Просрочен
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {project.name}
          </h3>
          {project.customer && (
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Icon name="Building2" size={11} />{project.customer}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className={cn("w-2 h-2 rounded-full", priorityCfg.dot)} />
          <span className={cn("text-[10px] font-medium", priorityCfg.color)}>{priorityCfg.label}</span>
        </div>
      </div>

      {/* Прогресс */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Прогресс задач</span>
          <span className="font-medium text-foreground">{taskPct}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", taskPct >= 100 ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${Math.min(taskPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-secondary/40 rounded-lg py-1.5 px-1">
          <div className="text-sm font-bold text-foreground">{project.task_count ?? 0}</div>
          <div className="text-[9px] text-muted-foreground">задач</div>
        </div>
        <div className="bg-secondary/40 rounded-lg py-1.5 px-1">
          <div className="text-sm font-bold text-foreground">{project.member_count ?? 0}</div>
          <div className="text-[9px] text-muted-foreground">участников</div>
        </div>
        <div className={cn(
          "rounded-lg py-1.5 px-1",
          budgetPct > 100 ? "bg-red-50" : "bg-secondary/40"
        )}>
          <div className={cn("text-sm font-bold", budgetPct > 100 ? "text-red-600" : "text-foreground")}>
            {budgetPct}%
          </div>
          <div className="text-[9px] text-muted-foreground">бюджета</div>
        </div>
      </div>

      {/* Нижняя строка */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2">
        <div className="flex items-center gap-1">
          <Icon name="User" size={11} />
          <span>{project.manager_name ?? "Не назначен"}</span>
        </div>
        <div className={cn("flex items-center gap-1", overdue && "text-red-500 font-medium")}>
          <Icon name="Calendar" size={11} />
          <span>{fmtDate(project.end_date)}</span>
        </div>
      </div>
    </button>
  );
}
