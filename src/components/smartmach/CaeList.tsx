import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Simulation } from "@/lib/manufacture";
import { STATUS_CFG, NEXT_LABEL } from "@/components/smartmach/cae.data";

interface Props {
  sims: Simulation[];
  filtered: Simulation[];
  loading: boolean;
  error: string | null;
  filterStatus: string;
  filterType: string;
  simTypeGroups: string[];
  onFilterStatus: (v: string) => void;
  onFilterType: (v: string) => void;
  onAdvance: (s: Simulation) => void;
  onRetry: () => void;
}

export default function CaeList({
  sims, filtered, loading, error,
  filterStatus, filterType, simTypeGroups,
  onFilterStatus, onFilterType, onAdvance, onRetry,
}: Props) {
  const [selected, setSelected] = useState<Simulation | null>(null);

  return (
    <>
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {(["all", "queue", "running", "review", "done", "error"] as const).map((s) => {
            const cfg = s === "all" ? { label: "Все", color: "" } : STATUS_CFG[s];
            return (
              <button key={s} onClick={() => onFilterStatus(s === filterStatus ? "all" : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterStatus === s
                    ? (s === "all" ? "bg-primary text-white border-primary" : `${cfg.color} border-current`)
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}>
                {cfg.label}
              </button>
            );
          })}
        </div>
        {simTypeGroups.length > 1 && (
          <select value={filterType} onChange={(e) => onFilterType(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">Все типы анализа</option>
            {simTypeGroups.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40 flex justify-between items-center">
          <span className="text-sm font-semibold">Расчёты</span>
          <span className="text-xs text-muted-foreground">{filtered.length} из {sims.length}</span>
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
            <Icon name="FlaskConical" size={36} className="mx-auto mb-2 opacity-20" />
            {sims.length === 0 ? "Расчётов пока нет. Добавьте первый." : "Нет расчётов по выбранным фильтрам."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((s) => {
              const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.queue;
              const nextAction = NEXT_LABEL[s.status];
              const stressColor = (s.stress_pct ?? 0) > 80 ? "bg-red-400" : (s.stress_pct ?? 0) > 60 ? "bg-yellow-400" : "bg-green-400";
              return (
                <div key={s.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(s)}>
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                    <Icon name="FlaskConical" size={16} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Icon name="Layers" size={10} />{s.sim_type}</span>
                      {s.part_name && <span className="flex items-center gap-1"><Icon name="Box" size={10} />{s.part_name}</span>}
                      {s.result && <span className="truncate max-w-[180px]">{s.result}</span>}
                    </div>
                  </div>
                  {s.stress_pct != null && s.stress_pct > 0 && (
                    <div className="w-24 hidden sm:block shrink-0">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stressColor}`} style={{ width: `${s.stress_pct}%` }} />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 text-right">{s.stress_pct}%</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {nextAction && (
                      <button onClick={(e) => { e.stopPropagation(); onAdvance(s); }}
                        className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90">
                        {nextAction}
                      </button>
                    )}
                    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                      <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={11} />{cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selected.sim_type}{selected.part_name ? ` · ${selected.part_name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium border px-2.5 py-1 rounded-full flex items-center gap-1 ${STATUS_CFG[selected.status]?.color ?? ""}`}>
                  <Icon name={STATUS_CFG[selected.status]?.icon as Parameters<typeof Icon>[0]["name"]} size={11} />
                  {STATUS_CFG[selected.status]?.label}
                </span>
                <button onClick={() => setSelected(null)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Stress gauge */}
              {selected.stress_pct != null && selected.stress_pct > 0 && (
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Уровень нагрузки</span>
                    <span className={`text-lg font-bold ${selected.stress_pct > 80 ? "text-red-500" : selected.stress_pct > 60 ? "text-yellow-500" : "text-green-600"}`}>
                      {selected.stress_pct}%
                    </span>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden border border-border">
                    <div
                      className={`h-full rounded-full transition-all ${selected.stress_pct > 80 ? "bg-red-400" : selected.stress_pct > 60 ? "bg-yellow-400" : "bg-green-400"}`}
                      style={{ width: `${selected.stress_pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>Безопасно</span>
                    <span>Внимание (&gt;60%)</span>
                    <span>Критично (&gt;80%)</span>
                  </div>
                </div>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Автор",    value: selected.author_name },
                  { label: "Деталь",   value: selected.part_name },
                  { label: "Создан",   value: selected.created_at ? new Date(selected.created_at).toLocaleDateString("ru") : null },
                  { label: "Обновлён", value: selected.updated_at ? new Date(selected.updated_at).toLocaleDateString("ru") : null },
                ].filter((r) => r.value).map((r) => (
                  <div key={r.label} className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{r.label}</p>
                    <p className="text-sm font-medium">{r.value}</p>
                  </div>
                ))}
              </div>

              {/* Result conclusion */}
              {selected.result && (
                <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Заключение</p>
                  <p className="text-sm text-green-900">{selected.result}</p>
                </div>
              )}

              {/* Advance button */}
              {NEXT_LABEL[selected.status] && (
                <div className="flex justify-end">
                  <button onClick={() => { onAdvance(selected); setSelected(null); }}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                    <Icon name="ArrowRight" size={15} />
                    {NEXT_LABEL[selected.status]}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
