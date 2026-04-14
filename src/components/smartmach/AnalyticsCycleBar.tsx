import Icon from "@/components/ui/icon";
import { CYCLE_STEPS } from "@/components/smartmach/analytics.types";
import { type Stats, type Job } from "@/lib/manufacture";

interface Props {
  stats: Stats | null;
  jobs: Job[];
}

export default function AnalyticsCycleBar({ stats, jobs }: Props) {
  return (
    <>
      {/* Цикл производства */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="text-sm font-semibold text-foreground mb-3">Цикл производства</div>
        <div className="flex items-center gap-1 flex-wrap">
          {CYCLE_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium ${step.color}`}>
                <Icon name={step.icon as Parameters<typeof Icon>[0]["name"]} size={13} />
                {step.label}
                {stats && (
                  <span className="ml-1 bg-white/20 rounded px-1">
                    {jobs.filter((j) => j.status === step.key).length}
                  </span>
                )}
              </div>
              {i < CYCLE_STEPS.length - 1 && <Icon name="ChevronRight" size={14} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Деталей",           value: stats.parts_total,    icon: "Box",           color: "text-blue-600 bg-blue-50" },
            { label: "Станков",           value: stats.machines_total, icon: "Cpu",           color: "text-indigo-600 bg-indigo-50" },
            { label: "Заданий активных",  value: stats.jobs_active,    icon: "Layers",        color: "text-orange-600 bg-orange-50" },
            { label: "Заданий выполнено", value: stats.jobs_done,      icon: "CheckCircle",   color: "text-green-600 bg-green-50" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${k.color}`}>
                <Icon name={k.icon as Parameters<typeof Icon>[0]["name"]} size={16} />
              </div>
              <div className="text-xl font-bold text-foreground">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}