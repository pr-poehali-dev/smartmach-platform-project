import Icon from "@/components/ui/icon";
import { MACHINE_SPECS_BASE, MACHINE_ADVANTAGES, MACHINE_SAFETY, MACHINE_SCENARIOS } from "./machine.data";

export default function MachineSpecs() {
  return (
    <div className="space-y-6">

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MACHINE_ADVANTAGES.map((a) => (
          <div key={a.value} className="bg-white rounded-xl border border-border p-5 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{a.value}</div>
            <div className="text-xs text-muted-foreground leading-snug">{a.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Технические характеристики */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
            <Icon name="Table" size={15} className="text-primary" />
            <span className="text-sm font-semibold">Технические характеристики (базовая версия)</span>
          </div>
          <div className="divide-y divide-border/60">
            {MACHINE_SPECS_BASE.map((s) => (
              <div key={s.param} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-muted-foreground">{s.param}</span>
                <span className="font-semibold text-foreground text-right ml-4">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Сценарии */}
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
              <Icon name="ListChecks" size={15} className="text-primary" />
              <span className="text-sm font-semibold">Сценарии использования</span>
            </div>
            <div className="divide-y divide-border/60">
              {MACHINE_SCENARIOS.map((s) => (
                <div key={s.label} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={14} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Безопасность */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="ShieldCheck" size={15} className="text-green-600" />
          <span className="text-sm font-semibold">Меры безопасности</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {MACHINE_SAFETY.map((s) => (
            <div key={s.text} className="flex items-start gap-3 px-5 py-3.5">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={14} className="text-green-600" />
              </div>
              <p className="text-sm text-foreground leading-snug">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
