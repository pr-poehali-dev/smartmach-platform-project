import Icon from "@/components/ui/icon";
import { Simulation } from "@/lib/manufacture";

interface Props {
  sims: Simulation[];
}

export default function CaeKpi({ sims }: Props) {
  const done     = sims.filter((s) => s.status === "done").length;
  const running  = sims.filter((s) => s.status === "running").length;
  const problems = sims.filter((s) => s.status === "error").length;
  const withStress = sims.filter((s) => s.stress_pct != null);
  const avgStress = withStress.length > 0
    ? Math.round(withStress.reduce((a, s) => a + (s.stress_pct ?? 0), 0) / withStress.length)
    : null;

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Всего расчётов", value: sims.length, icon: "FlaskConical", color: "text-purple-600 bg-purple-50" },
          { label: "В работе",       value: running,     icon: "Loader",       color: "text-blue-600 bg-blue-50" },
          { label: "Завершено",      value: done,        icon: "CheckCircle",  color: "text-green-600 bg-green-50" },
          { label: "Проблемы",       value: problems,    icon: "AlertTriangle",color: "text-red-600 bg-red-50" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
              <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Avg stress indicator */}
      {avgStress != null && (
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">Средний уровень нагрузки по расчётам</p>
            <p className="text-2xl font-bold mt-0.5">{avgStress}%</p>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${avgStress > 80 ? "bg-red-400" : avgStress > 60 ? "bg-yellow-400" : "bg-green-400"}`}
                style={{ width: `${avgStress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>0% — норма</span>
              <span>60% — внимание</span>
              <span>80% — критично</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
