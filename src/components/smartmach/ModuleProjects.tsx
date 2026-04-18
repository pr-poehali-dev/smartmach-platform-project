import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  Project, Dashboard, Employee, ProjectStatus,
  STATUS_CFG, projGet,
  fmt,
} from "@/lib/projects";
import ProjectCard   from "@/components/smartmach/ProjectCard";
import ProjectForm   from "@/components/smartmach/ProjectForm";
import ProjectDetail from "@/components/smartmach/ProjectDetail";

type View = "registry" | "detail";

function DashboardKPI({ dash }: { dash: Dashboard }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {[
        { label: "Всего проектов",   value: dash.total_count,        icon: "FolderOpen",    color: "text-slate-600 bg-secondary/50" },
        { label: "Активных",         value: dash.active_count,       icon: "PlayCircle",    color: "text-emerald-700 bg-emerald-50" },
        { label: "Планирование",     value: dash.planning_count,     icon: "Clock",         color: "text-blue-700 bg-blue-50"   },
        { label: "Завершены",        value: dash.completed_count,    icon: "CheckCircle",   color: "text-slate-500 bg-secondary/40" },
        { label: "Просроченных",     value: dash.overdue_count,      icon: "AlertCircle",   color: dash.overdue_count > 0 ? "text-red-600 bg-red-50" : "text-slate-400 bg-secondary/30" },
        { label: "Задач в работе",   value: dash.tasks_in_progress,  icon: "ListChecks",    color: "text-violet-600 bg-violet-50" },
      ].map(kpi => (
        <div key={kpi.label} className={cn("rounded-xl p-3 flex items-center gap-3 border border-transparent", kpi.color.split(" ")[1])}>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", kpi.color.split(" ")[1])}>
            <Icon name={kpi.icon as Parameters<typeof Icon>[0]["name"]} size={18} className={kpi.color.split(" ")[0]} />
          </div>
          <div>
            <div className={cn("text-xl font-bold", kpi.color.split(" ")[0])}>{kpi.value}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{kpi.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ModuleProjects() {
  const [view,       setView]       = useState<View>("registry");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [employees,  setEmployees]  = useState<Employee[]>([]);
  const [dashboard,  setDashboard]  = useState<Dashboard | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter,     setFilter]     = useState<ProjectStatus | "all">("all");
  const [search,     setSearch]     = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [list, dash, emps] = await Promise.all([
        projGet<Project[]>({ resource: "list" }),
        projGet<Dashboard>({ resource: "dashboard" }),
        projGet<Employee[]>({ resource: "employees" }),
      ]);
      setProjects(list);
      setDashboard(dash);
      setEmployees(emps);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = projects.filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.customer ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (view === "detail" && selectedId) {
    return (
      <div className="p-4 md:p-6">
        <ProjectDetail
          projectId={selectedId}
          employees={employees}
          onBack={() => { setView("registry"); setSelectedId(null); }}
          onUpdated={loadAll}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Шапка */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Управление проектами</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">
            Реестр · Задачи · Бюджет · Аналитика
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shrink-0">
          <Icon name="Plus" size={16} />Новый проект
        </button>
      </div>

      {/* KPI дашборд */}
      {dashboard && <DashboardKPI dash={dashboard} />}

      {/* Бюджет-сводка */}
      {dashboard && dashboard.total_budget_plan > 0 && (
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Icon name="Wallet" size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Суммарный бюджет</div>
              <div className="font-bold text-foreground">{fmt(Number(dashboard.total_budget_plan))} ₽</div>
            </div>
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Израсходовано</span>
              <span className="font-medium text-foreground">
                {dashboard.total_budget_plan > 0
                  ? `${((Number(dashboard.total_budget_fact) / Number(dashboard.total_budget_plan)) * 100).toFixed(1)}%`
                  : "0%"}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (Number(dashboard.total_budget_fact) / Number(dashboard.total_budget_plan)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Факт</div>
            <div className="font-bold text-foreground">{fmt(Number(dashboard.total_budget_fact))} ₽</div>
          </div>
        </div>
      )}

      {/* Фильтры и поиск */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию, коду, заказчику…"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(["all", "active", "planning", "paused", "completed", "cancelled"] as const).map(s => {
            const cfg = s === "all" ? null : STATUS_CFG[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
                  filter === s
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}>
                {s === "all" ? `Все (${projects.length})` : `${cfg!.label} (${projects.filter(p => p.status === s).length})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Список проектов */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Icon name="Loader" size={22} className="animate-spin mr-2" />Загрузка…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
            <Icon name="FolderOpen" size={28} className="text-muted-foreground opacity-50" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {projects.length === 0 ? "Проектов пока нет" : "Ничего не найдено"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length === 0
                ? "Создайте первый проект, нажав «Новый проект»"
                : "Измените фильтры или поисковый запрос"}
            </p>
          </div>
          {projects.length === 0 && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              <Icon name="Plus" size={15} />Создать проект
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => { setSelectedId(p.id); setView("detail"); }}
            />
          ))}
        </div>
      )}

      {/* Последние активные проекты в дашборде */}
      {!loading && dashboard && dashboard.recent_projects.length > 0 && filter === "all" && !search && projects.length > 0 && (
        <div className="bg-secondary/20 border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Недавняя активность</h3>
          <div className="space-y-2">
            {dashboard.recent_projects.slice(0, 4).map(p => {
              const cfg = STATUS_CFG[p.status as ProjectStatus];
              return (
                <button key={p.id}
                  onClick={() => { setSelectedId(p.id); setView("detail"); }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors text-left">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", {
                    "bg-emerald-500": p.status === "active",
                    "bg-blue-500": p.status === "planning",
                    "bg-amber-500": p.status === "paused",
                    "bg-slate-400": p.status === "completed",
                    "bg-red-400": p.status === "cancelled",
                  })} />
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{p.name}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", cfg.bg, cfg.color)}>{cfg.label}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fmt(p.budget_plan ?? 0)} ₽</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <ProjectForm
          employees={employees}
          onSaved={() => { setShowCreate(false); loadAll(); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
