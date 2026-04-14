import Icon from "@/components/ui/icon";
import { STATUS_CFG, PRIORITY_CFG } from "@/components/smartmach/cam.data";
import { type Program } from "@/lib/manufacture";

const STATUS_ORDER = ["queue", "running", "review", "done", "error", "cancelled"];

interface Props {
  programs: Program[];
  filterStatus: string;
  filterPriority: string;
  search: string;
  onFilterStatus: (v: string) => void;
  onFilterPriority: (v: string) => void;
  onSearch: (v: string) => void;
}

export default function CamPipelineBar({
  programs, filterStatus, filterPriority, search,
  onFilterStatus, onFilterPriority, onSearch,
}: Props) {
  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = programs.filter((p) => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      {/* Pipeline status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CFG[s];
          return (
            <button key={s} onClick={() => onFilterStatus(filterStatus === s ? "all" : s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium shrink-0 transition-colors ${
                filterStatus === s ? `${cfg.color} border-current` : "border-border text-muted-foreground hover:border-primary/40"
              }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${filterStatus === s ? "" : "bg-secondary"}`}>
                {counts[s] ?? 0}
              </span>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Search + priority filter */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Поиск по названию, детали, станку..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          {[["all", "Все приоритеты"], ...Object.entries(PRIORITY_CFG).map(([k, v]) => [k, v.label])].map(([id, label]) => (
            <button key={id} onClick={() => onFilterPriority(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterPriority === id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
