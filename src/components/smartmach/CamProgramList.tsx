import Icon from "@/components/ui/icon";
import { STATUS_CFG, PRIORITY_CFG, NEXT_LABEL } from "@/components/smartmach/cam.data";
import { type Program } from "@/lib/manufacture";

interface Props {
  programs: Program[];
  filtered: Program[];
  loading: boolean;
  error: string | null;
  onSelect: (p: Program) => void;
  onAdvance: (p: Program) => void;
  onRetry: () => void;
}

export default function CamProgramList({ programs, filtered, loading, error, onSelect, onAdvance, onRetry }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
        <span className="text-sm font-semibold">Управляющие программы</span>
        <span className="text-xs text-muted-foreground">{filtered.length} из {programs.length}</span>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground text-sm">
          <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
        </div>
      ) : error ? (
        <div className="p-10 text-center text-red-500 text-sm">
          <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error}
          <button onClick={onRetry} className="mt-2 block mx-auto text-xs underline">Повторить</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground text-sm">
          <Icon name="FileCode" size={36} className="mx-auto mb-2 opacity-20" />
          {programs.length === 0 ? "Программ пока нет. Добавьте первую." : "Нет программ по выбранным фильтрам."}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((p) => {
            const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.queue;
            const nextAction = NEXT_LABEL[p.status];
            const pr = (p as Record<string, unknown>).priority as string | undefined;
            const prio = PRIORITY_CFG[pr ?? "normal"];
            return (
              <div key={p.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                onClick={() => onSelect(p)}>
                <div className={`w-1 h-10 rounded-full shrink-0 ${
                  pr === "high" ? "bg-red-400" : pr === "low" ? "bg-gray-300" : "bg-blue-400"
                }`} />
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                  <Icon name="FileCode" size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    {p.part_name    && <span className="flex items-center gap-1"><Icon name="Box"   size={10} />{p.part_name}</span>}
                    {p.machine_name && <span className="flex items-center gap-1"><Icon name="Cpu"   size={10} />{p.machine_name}</span>}
                    {p.author_name  && <span className="flex items-center gap-1"><Icon name="User"  size={10} />{p.author_name}</span>}
                    {p.est_time     && <span className="flex items-center gap-1"><Icon name="Clock" size={10} />{p.est_time}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {prio && (
                    <span className={`text-[11px] font-medium border px-2 py-0.5 rounded-full hidden sm:inline ${prio.color}`}>
                      {prio.label}
                    </span>
                  )}
                  {nextAction && (
                    <button onClick={(e) => { e.stopPropagation(); onAdvance(p); }}
                      className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90">
                      {nextAction}
                    </button>
                  )}
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
