/**
 * DashboardModules — сетка быстрого перехода по модулям на главной панели.
 * Извлечено 1:1 из DashboardHome без изменения логики.
 */
import Icon from "@/components/ui/icon";
import { ModuleId } from "@/pages/Index";

const MODULES = [
  { id: "cad" as ModuleId,       label: "Проектирование",  desc: "Библиотека деталей и версии",         icon: "Box",           color: "#1e88e5", bg: "#e3f2fd" },
  { id: "cam" as ModuleId,       label: "Программы ЧПУ",   desc: "Управляющие программы, очередь",      icon: "FileCode",      color: "#8e24aa", bg: "#f3e5f5" },
  { id: "cae" as ModuleId,       label: "Расчёты",         desc: "Прочностные и тепловые расчёты",      icon: "FlaskConical",  color: "#00897b", bg: "#e0f2f1" },
  { id: "plm" as ModuleId,       label: "Жизн. цикл",      desc: "Управление версиями изделий",         icon: "GitBranch",     color: "#f4511e", bg: "#fbe9e7" },
  { id: "equipment" as ModuleId, label: "Оборудование",    desc: "Мониторинг станочного парка",         icon: "Radio",         color: "#43a047", bg: "#e8f5e9" },
  { id: "analytics" as ModuleId, label: "Задания",         desc: "Производственный цикл и задания",     icon: "ClipboardList", color: "#fb8c00", bg: "#fff3e0" },
];

export default function DashboardModules({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  return (
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
  );
}
