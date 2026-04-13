import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, Stats } from "@/lib/manufacture";
import { ModuleId } from "@/pages/Index";

interface Props {
  onNavigate: (id: ModuleId) => void;
}

const MODULES = [
  { id: "cad" as ModuleId,       label: "Проектирование",  desc: "Библиотека деталей, версии, проверка геометрии", icon: "Box",          color: "#1e88e5", bg: "#e3f2fd" },
  { id: "cam" as ModuleId,       label: "Программы ЧПУ",   desc: "Управляющие программы для станков, очередь",     icon: "FileCode",     color: "#8e24aa", bg: "#f3e5f5" },
  { id: "cae" as ModuleId,       label: "Расчёты",         desc: "Прочностные, тепловые и динамические расчёты",   icon: "FlaskConical", color: "#00897b", bg: "#e0f2f1" },
  { id: "plm" as ModuleId,       label: "Жизн. цикл",      desc: "Управление версиями изделий и документацией",    icon: "GitBranch",    color: "#f4511e", bg: "#fbe9e7" },
  { id: "cnc" as ModuleId,       label: "Оборудование",    desc: "Мониторинг и управление станочным парком",       icon: "Radio",        color: "#43a047", bg: "#e8f5e9" },
  { id: "analytics" as ModuleId, label: "Задания",         desc: "Производственный цикл и задания",                icon: "ClipboardList",color: "#fb8c00", bg: "#fff3e0" },
];

export default function DashboardHome({ onNavigate }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    mGet<Stats>("stats").then(setStats).catch(() => {});
  }, []);

  const KPI = stats ? [
    { label: "Деталей",             value: stats.parts_total,       icon: "Box",           color: "text-blue-600" },
    { label: "Станков",             value: stats.machines_total,    icon: "Cpu",           color: "text-indigo-600" },
    { label: "Станков в работе",    value: stats.machines_running,  icon: "Activity",      color: "text-green-600" },
    { label: "Заданий активных",    value: stats.jobs_active,       icon: "ClipboardList", color: "text-orange-600" },
  ] : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">СмартМаш</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Единая система управления производственным циклом</p>
      </div>

      {KPI && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <Icon name={k.icon as Parameters<typeof Icon>[0]["name"]} size={15} className={k.color} />
              </div>
              <div className="text-2xl font-bold text-foreground">{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Модули</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <button key={m.id} onClick={() => onNavigate(m.id)}
              className="bg-white rounded-xl border border-border p-5 text-left hover:shadow-md hover:border-primary/30 transition-all group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: m.bg }}>
                <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={20} style={{ color: m.color }} />
              </div>
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}