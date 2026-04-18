import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  ProjectFull, Employee,
  STATUS_CFG, PRIORITY_CFG, STAGE_CFG,
  projGet, projPost,
  fmt, fmtDate, isOverdue,
} from "@/lib/projects";
import ProjectTasks  from "@/components/smartmach/ProjectTasks";
import ProjectBudget from "@/components/smartmach/ProjectBudget";
import ProjectForm   from "@/components/smartmach/ProjectForm";
import GanttChart    from "@/components/smartmach/GanttChart";

type Tab = "tasks" | "gantt" | "budget" | "members" | "info";

interface Props {
  projectId: number;
  employees: Employee[];
  onBack: () => void;
  onUpdated: () => void;
}

export default function ProjectDetail({ projectId, employees, onBack, onUpdated }: Props) {
  const [project,   setProject]   = useState<ProjectFull | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<Tab>("tasks");
  const [showEdit,  setShowEdit]  = useState(false);
  const [addMember, setAddMember] = useState(false);
  const [newEmpId,  setNewEmpId]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await projGet<ProjectFull>({ resource: "one", id: projectId });
      setProject(p);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  async function handleAddMember() {
    if (!newEmpId || !project) return;
    await projPost({}, { resource: "member", project_id: project.id, employee_id: parseInt(newEmpId) });
    setNewEmpId("");
    setAddMember(false);
    load();
  }

  if (loading || !project) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Icon name="Loader" size={22} className="animate-spin mr-2" />Загрузка…
    </div>
  );

  const statusCfg   = STATUS_CFG[project.status];
  const priorityCfg = PRIORITY_CFG[project.priority];
  const overdue     = isOverdue(project.end_date, project.status);
  const taskDone    = project.tasks.filter(t => t.status === "done").length;
  const taskPct     = project.tasks.length ? Math.round((taskDone / project.tasks.length) * 100) : 0;
  const budgetPct   = project.budget_plan > 0 ? Math.round((project.budget_fact / project.budget_plan) * 100) : 0;

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "tasks",   label: "Задачи",      icon: "CheckSquare", badge: project.tasks.length },
    { id: "gantt",   label: "Гант",        icon: "BarChart2"                                },
    { id: "budget",  label: "Бюджет",      icon: "Wallet",      badge: project.budgets.length },
    { id: "members", label: "Участники",   icon: "Users",       badge: project.members.length },
    { id: "info",    label: "Информация",  icon: "Info" },
  ];

  return (
    <div className="space-y-4">
      {/* Навигация назад */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Icon name="ArrowLeft" size={15} />Все проекты
      </button>

      {/* Шапка проекта */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {project.code && (
                <span className="text-xs font-mono text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded">
                  {project.code}
                </span>
              )}
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded border", statusCfg.bg, statusCfg.color)}>
                {statusCfg.label}
              </span>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1", priorityCfg.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block", priorityCfg.dot)} />
                {priorityCfg.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {STAGE_CFG[project.stage]}
              </span>
              {overdue && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-600">
                  Просрочен
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-secondary/60">
            <Icon name="Pencil" size={14} />Редактировать
          </button>
        </div>

        {/* KPI строка */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Задачи",
              value: `${taskDone}/${project.tasks.length}`,
              sub: `${taskPct}% выполнено`,
              icon: "CheckCircle2",
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              label: "Бюджет (план)",
              value: `${fmt(project.budget_plan)} ₽`,
              sub: project.budget_plan > 0 ? `освоено ${budgetPct}%` : "не задан",
              icon: "Wallet",
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "Срок",
              value: fmtDate(project.end_date),
              sub: project.customer ? `Заказчик: ${project.customer}` : "—",
              icon: overdue ? "AlertCircle" : "Calendar",
              color: overdue ? "text-red-600 bg-red-50" : "text-slate-600 bg-secondary/40",
            },
            {
              label: "Руководитель",
              value: project.manager_name ?? "Не назначен",
              sub: project.manager_position ?? "",
              icon: "UserCheck",
              color: "text-violet-600 bg-violet-50",
            },
          ].map(kpi => (
            <div key={kpi.label} className={cn("rounded-xl p-3 flex items-center gap-3", kpi.color.split(" ")[1])}>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", kpi.color.split(" ")[1])}>
                <Icon name={kpi.icon as Parameters<typeof Icon>[0]["name"]} size={18} className={kpi.color.split(" ")[0]} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-foreground text-sm leading-tight truncate">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground truncate">{kpi.sub || kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Прогресс */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Прогресс по задачам</span>
            <span className="font-medium text-foreground">{taskPct}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", taskPct >= 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${Math.min(taskPct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl w-full sm:w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                tab === t.id ? "bg-primary/10 text-primary" : "bg-secondary/60 text-muted-foreground")}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      {tab === "tasks" && (
        <ProjectTasks
          projectId={project.id}
          tasks={project.tasks}
          employees={employees}
          onRefresh={load}
        />
      )}

      {tab === "gantt" && (
        <GanttChart
          tasks={project.tasks}
          projectStart={project.start_date}
          projectEnd={project.end_date}
          onTaskUpdated={load}
        />
      )}

      {tab === "budget" && (
        <ProjectBudget
          projectId={project.id}
          budgetPlan={project.budget_plan}
          items={project.budgets}
          onRefresh={load}
        />
      )}

      {tab === "members" && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
            <h3 className="font-semibold text-sm">Команда проекта</h3>
            <button onClick={() => setAddMember(!addMember)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
              <Icon name="UserPlus" size={13} />Добавить
            </button>
          </div>

          {addMember && (
            <div className="px-4 py-3 border-b border-border bg-blue-50/50 flex items-center gap-3">
              <select value={newEmpId} onChange={e => setNewEmpId(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Выберите сотрудника…</option>
                {employees
                  .filter(e => !project.members.some(m => m.employee_id === e.id))
                  .map(e => <option key={e.id} value={e.id}>{e.full_name} — {e.position}</option>)}
              </select>
              <button onClick={handleAddMember} disabled={!newEmpId}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium">
                Добавить
              </button>
              <button onClick={() => setAddMember(false)}
                className="p-1.5 rounded-lg hover:bg-secondary/60">
                <Icon name="X" size={15} className="text-muted-foreground" />
              </button>
            </div>
          )}

          {project.members.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Icon name="Users" size={28} className="mx-auto mb-2 opacity-30" />
              Участников нет. Добавьте команду.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {project.members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/10">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{m.full_name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground">{m.position} · {m.department}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-secondary/60 rounded-full text-muted-foreground capitalize">
                    {m.role === "manager" ? "Руководитель" : m.role === "lead" ? "Лид" : m.role === "observer" ? "Наблюдатель" : "Участник"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "info" && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-4 text-foreground">Основная информация</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {[
              { label: "Название",       value: project.name },
              { label: "Код",            value: project.code || "—" },
              { label: "Статус",         value: STATUS_CFG[project.status].label },
              { label: "Приоритет",      value: PRIORITY_CFG[project.priority].label },
              { label: "Стадия",         value: STAGE_CFG[project.stage] },
              { label: "Категория",      value: project.category ?? "—" },
              { label: "Заказчик",       value: project.customer ?? "—" },
              { label: "Руководитель",   value: project.manager_name ?? "—" },
              { label: "Начало",         value: fmtDate(project.start_date) },
              { label: "Дедлайн",        value: fmtDate(project.end_date) },
              { label: "Факт завершения",value: fmtDate(project.actual_end) },
              { label: "Бюджет (план)",  value: `${fmt(project.budget_plan)} ₽` },
              { label: "Бюджет (факт)",  value: `${fmt(project.budget_fact)} ₽` },
              { label: "Создан",         value: fmtDate(project.created_at) },
            ].map(row => (
              <div key={row.label}>
                <dt className="text-xs text-muted-foreground mb-0.5">{row.label}</dt>
                <dd className="font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
            {project.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground mb-0.5">Примечание</dt>
                <dd className="text-foreground">{project.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {showEdit && (
        <ProjectForm
          project={project}
          employees={employees}
          onSaved={() => { setShowEdit(false); load(); onUpdated(); }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}