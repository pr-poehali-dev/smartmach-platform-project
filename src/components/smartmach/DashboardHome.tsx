import Icon from "@/components/ui/icon";
import { ModuleId } from "@/pages/Index";

interface Props {
  onNavigate: (id: ModuleId) => void;
}

const MODULES = [
  { id: "cad" as ModuleId,       label: "CAD",       desc: "3D-моделирование и проверка коллизий", icon: "Box",          color: "#1e88e5", bg: "#e3f2fd" },
  { id: "cam" as ModuleId,       label: "CAM",       desc: "AI-оптимизация траекторий, 5-ось",      icon: "Cpu",          color: "#8e24aa", bg: "#f3e5f5" },
  { id: "cae" as ModuleId,       label: "CAE",       desc: "Анализ прочности и теплового поля",     icon: "FlaskConical", color: "#00897b", bg: "#e0f2f1" },
  { id: "plm" as ModuleId,       label: "PLM",       desc: "Версионирование, интеграция с ERP",     icon: "GitBranch",    color: "#f4511e", bg: "#fbe9e7" },
  { id: "cnc" as ModuleId,       label: "ЧПУ",       desc: "Удалённый мониторинг станков",          icon: "Radio",        color: "#43a047", bg: "#e8f5e9" },
  { id: "analytics" as ModuleId, label: "Аналитика", desc: "KPI и предиктивная диагностика",        icon: "BarChart2",    color: "#fb8c00", bg: "#fff3e0" },
];

const KPI = [
  { label: "Активных станков", value: "48", change: "+3", up: true,  icon: "Radio" },
  { label: "Задач в обработке", value: "127", change: "+12", up: true, icon: "Cpu" },
  { label: "Время отклика",    value: "0.3 с", change: "-0.1", up: true, icon: "Zap" },
  { label: "Пользователей",    value: "84", change: "+7", up: true,  icon: "Users" },
];

export default function DashboardHome({ onNavigate }: Props) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SmartMach Platform</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Единая платформа для станкостроения</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          Все системы работают
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <Icon name={k.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-foreground">{k.value}</div>
            <div className={`text-xs mt-1 font-medium ${k.up ? "text-green-600" : "text-red-500"}`}>
              {k.change} за сегодня
            </div>
          </div>
        ))}
      </div>

      {/* Modules Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Модули</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => onNavigate(m.id)}
              className="bg-white rounded-xl border border-border p-5 text-left hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ background: m.bg }}
              >
                <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={20} style={{ color: m.color }} />
              </div>
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-3 text-foreground">Активность системы</h2>
        <div className="space-y-2">
          {[
            { label: "Загрузка серверов", val: 42 },
            { label: "Использование памяти", val: 67 },
            { label: "Нагрузка на БД", val: 29 },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-44 flex-shrink-0">{s.label}</span>
              <div className="flex-1 bg-secondary rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${s.val}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground w-8 text-right">{s.val}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
