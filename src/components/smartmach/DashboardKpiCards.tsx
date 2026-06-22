/**
 * DashboardKpiCards — сетка KPI-карточек на главной панели.
 * Извлечено 1:1 из DashboardHome без изменения логики.
 */
import Icon from "@/components/ui/icon";

export interface KpiCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bg: string;
  onClick: () => void;
}

export default function DashboardKpiCards({ kpi, loading }: { kpi: KpiCard[]; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpi.map((k) => (
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
  );
}
