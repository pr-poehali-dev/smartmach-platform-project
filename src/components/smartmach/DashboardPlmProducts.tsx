/**
 * DashboardPlmProducts — блок «Активные изделия» (PLM) на главной панели.
 * Извлечено 1:1 из DashboardHome без изменения логики.
 */
import Icon from "@/components/ui/icon";

export interface PlmProduct {
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

const PLM_STAGE_COLOR: Record<string, string> = {
  draft:       "bg-gray-100 text-gray-600",
  development: "bg-blue-100 text-blue-700",
  review:      "bg-amber-100 text-amber-700",
  approved:    "bg-green-100 text-green-700",
  production:  "bg-purple-100 text-purple-700",
  archive:     "bg-gray-200 text-gray-500",
};

interface Props {
  products: PlmProduct[];
  onNavigate: () => void;
}

export default function DashboardPlmProducts({ products, onNavigate }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Активные изделия</h2>
        <button
          onClick={onNavigate}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Все изделия <Icon name="ChevronRight" size={12} />
        </button>
      </div>
      <div className="divide-y divide-border">
        {products.map((p) => (
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
  );
}
