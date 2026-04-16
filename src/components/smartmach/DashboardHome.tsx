import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, Stats } from "@/lib/manufacture";
import { apiGet } from "@/lib/api";
import { ModuleId } from "@/pages/Index";
import { type Machine as EquipmentItem } from "@/components/smartmach/equipment.types";

interface Props {
  onNavigate: (id: ModuleId) => void;
}

interface PlmStats {
  by_stage: Record<string, number>;
  total: number;
  total_versions: number;
}

interface PlmProduct {
  id: number;
  code: string;
  name: string;
  stage: string;
  stage_label: string;
  updated_at: string;
  owner_name: string | null;
  version_count: number;
  latest_revision: string | null;
}

const MODULES = [
  { id: "cad" as ModuleId,       label: "Проектирование",  desc: "Библиотека деталей и версии",         icon: "Box",           color: "#1e88e5", bg: "#e3f2fd" },
  { id: "cam" as ModuleId,       label: "Программы ЧПУ",   desc: "Управляющие программы, очередь",      icon: "FileCode",      color: "#8e24aa", bg: "#f3e5f5" },
  { id: "cae" as ModuleId,       label: "Расчёты",         desc: "Прочностные и тепловые расчёты",      icon: "FlaskConical",  color: "#00897b", bg: "#e0f2f1" },
  { id: "plm" as ModuleId,       label: "Жизн. цикл",      desc: "Управление версиями изделий",         icon: "GitBranch",     color: "#f4511e", bg: "#fbe9e7" },
  { id: "equipment" as ModuleId, label: "Оборудование",    desc: "Мониторинг станочного парка",         icon: "Radio",         color: "#43a047", bg: "#e8f5e9" },
  { id: "analytics" as ModuleId, label: "Задания",         desc: "Производственный цикл и задания",     icon: "ClipboardList", color: "#fb8c00", bg: "#fff3e0" },
];

const EQ_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  active:         { label: "Активен",        color: "text-green-700",  dot: "bg-green-500" },
  idle:           { label: "Простой",         color: "text-amber-700",  dot: "bg-amber-400" },
  maintenance:    { label: "Обслуживание",   color: "text-red-700",    dot: "bg-red-500" },
  decommissioned: { label: "Списан",         color: "text-gray-400",   dot: "bg-gray-300" },
};

const PLM_STAGE_COLOR: Record<string, string> = {
  draft:       "bg-gray-100 text-gray-600",
  development: "bg-blue-100 text-blue-700",
  review:      "bg-amber-100 text-amber-700",
  approved:    "bg-green-100 text-green-700",
  production:  "bg-purple-100 text-purple-700",
  archive:     "bg-gray-200 text-gray-500",
};

function daysUntil(dateStr: string): number | null {
  if (!dateStr || dateStr === "—") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export default function DashboardHome({ onNavigate }: Props) {
  const [stats, setStats]             = useState<Stats | null>(null);
  const [equipment, setEquipment]     = useState<EquipmentItem[] | null>(null);
  const [plmStats, setPlmStats]       = useState<PlmStats | null>(null);
  const [plmProducts, setPlmProducts] = useState<PlmProduct[]>([]);
  const [employeesCount, setEmployeesCount] = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.allSettled([
      mGet<Stats>("stats"),
      apiGet<EquipmentItem[]>("equipment"),
      apiGet<PlmStats>("plm", "/", { resource: "stats" }),
      apiGet<PlmProduct[]>("plm", "/", { resource: "products" }),
      apiGet<{ id: number }[]>("economics", "", { resource: "employees" }),
    ]).then(([s, eq, ps, pp, emp]) => {
      if (s.status   === "fulfilled") setStats(s.value);
      if (eq.status  === "fulfilled") setEquipment(eq.value);
      if (ps.status  === "fulfilled") setPlmStats(ps.value);
      if (pp.status  === "fulfilled") setPlmProducts(
        (pp.value as PlmProduct[]).filter((p) => p.stage !== "archive").slice(0, 5)
      );
      if (emp.status === "fulfilled") setEmployeesCount(Array.isArray(emp.value) ? emp.value.length : 0);
    }).finally(() => setLoading(false));
  }, []);

  const KPI = [
    {
      label: "Деталей в библиотеке",
      value: stats?.parts_total ?? "—",
      icon: "Box",
      color: "text-blue-600",
      bg: "bg-blue-50",
      onClick: () => onNavigate("cad"),
    },
    {
      label: "Изделий (PLM)",
      value: plmStats?.total ?? "—",
      icon: "GitBranch",
      color: "text-red-600",
      bg: "bg-red-50",
      onClick: () => onNavigate("plm"),
    },
    {
      label: "Активных заданий",
      value: stats?.jobs_active ?? "—",
      icon: "ClipboardList",
      color: "text-orange-600",
      bg: "bg-orange-50",
      onClick: () => onNavigate("analytics"),
    },
    {
      label: "Сотрудников",
      value: employeesCount ?? "—",
      icon: "Users",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      onClick: () => onNavigate("employees"),
    },
  ];

  const activeEquipment = equipment?.filter((e) => e.status !== "decommissioned") ?? [];
  const maintenanceCount = equipment?.filter((e) => e.status === "maintenance").length ?? 0;

  return (
    <div className="p-6 space-y-6">

      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">СмартМаш</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Единая система управления производственным циклом</p>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k) => (
          <button
            key={k.label}
            onClick={k.onClick}
            className="bg-white rounded-xl border border-border p-4 shadow-sm text-left hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.bg}`}>
                <Icon name={k.icon as Parameters<typeof Icon>[0]["name"]} size={16} className={k.color} />
              </div>
              <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : k.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
          </button>
        ))}
      </div>

      {/* Состояние оборудования */}
      {equipment !== null && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Состояние оборудования</h2>
              {maintenanceCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {maintenanceCount} на обслуживании
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate("equipment")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Все станки <Icon name="ChevronRight" size={12} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {activeEquipment.length === 0 ? (
              <p className="text-sm text-muted-foreground p-5">Оборудование не найдено</p>
            ) : (
              activeEquipment.map((eq) => {
                const st = EQ_STATUS[eq.status] ?? EQ_STATUS.idle;
                const days = daysUntil(eq.nextMaintenance);
                const isOverdue = days !== null && days < 0;
                const isSoon = days !== null && days >= 0 && days <= 14;
                return (
                  <div key={eq.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface/50 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{eq.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{eq.type} · {eq.location}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-medium ${st.color}`}>{st.label}</p>
                      {eq.nextMaintenance && eq.nextMaintenance !== "—" && (
                        <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-500 font-semibold" : isSoon ? "text-amber-600" : "text-muted-foreground"}`}>
                          {isOverdue
                            ? `ТО просрочено ${Math.abs(days!)} дн.`
                            : isSoon
                              ? `ТО через ${days} дн.`
                              : `ТО ${eq.nextMaintenance}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Изделия PLM */}
      {plmProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Активные изделия</h2>
            <button
              onClick={() => onNavigate("plm")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Все изделия <Icon name="ChevronRight" size={12} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {plmProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code} · {p.version_count} версий</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PLM_STAGE_COLOR[p.stage] ?? "bg-gray-100 text-gray-600"}`}>
                  {p.stage_label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Быстрый переход по модулям */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Модули</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map((m) => (
            <button key={m.id} onClick={() => onNavigate(m.id)}
              className="bg-white rounded-xl border border-border p-4 text-left hover:shadow-md hover:border-primary/30 transition-all group flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.bg }}>
                <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={18} style={{ color: m.color }} />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}