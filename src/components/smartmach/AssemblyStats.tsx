import Icon from "@/components/ui/icon";
import { AssemblyStats as Stats } from "@/lib/assembly";

interface Props {
  stats: Stats;
}

const CARDS = [
  { key: "parts_count",     label: "Деталей",     icon: "Box",         color: "text-slate-600",   bg: "bg-slate-50" },
  { key: "subasm_count",    label: "Подсборок",   icon: "Layers",      color: "text-blue-600",    bg: "bg-blue-50"  },
  { key: "standards_count", label: "Стандартных", icon: "Hexagon",     color: "text-purple-600",  bg: "bg-purple-50"},
  { key: "purchased_count", label: "Покупных",    icon: "ShoppingCart",color: "text-orange-600",  bg: "bg-orange-50"},
  { key: "materials_count", label: "Материалов",  icon: "FlaskConical",color: "text-teal-600",    bg: "bg-teal-50"  },
  { key: "issues_count",    label: "Замечаний",   icon: "AlertTriangle",color: "text-red-600",    bg: "bg-red-50"   },
] as const;

export default function AssemblyStats({ stats }: Props) {
  const issues = Number(stats.issues_count);
  return (
    <div className="space-y-3">
      {/* Главная карточка */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon name="Package" size={20} className="text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.total_nodes}</div>
            <div className="text-xs text-muted-foreground">Всего узлов в составе</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-lg font-semibold text-foreground">
              {Number(stats.total_weight_kg).toFixed(1)} кг
            </div>
            <div className="text-xs text-muted-foreground">Масса изделия</div>
          </div>
        </div>
      </div>

      {/* Сетка KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CARDS.map(({ key, label, icon, color, bg }) => {
          const val = Number(stats[key as keyof Stats]);
          const isIssue = key === "issues_count" && val > 0;
          return (
            <div
              key={key}
              className={`rounded-xl border p-3 flex items-center gap-2.5 ${
                isIssue ? "border-red-300 bg-red-50" : "border-border bg-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${isIssue ? "bg-red-100" : bg} flex items-center justify-center flex-shrink-0`}>
                <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={15} className={isIssue ? "text-red-600" : color} />
              </div>
              <div className="min-w-0">
                <div className={`text-xl font-bold leading-none ${isIssue ? "text-red-600" : "text-foreground"}`}>{val}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Степень готовности */}
      {Number(stats.total_nodes) > 0 && (
        <div className="bg-white rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Готовность</span>
            <span className="text-xs font-bold text-foreground">
              {Math.round((Number(stats.approved_count) / Number(stats.total_nodes)) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((Number(stats.approved_count) / Number(stats.total_nodes)) * 100))}%` }}
            />
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Утверждено: {stats.approved_count}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              В работе: {stats.draft_count}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
