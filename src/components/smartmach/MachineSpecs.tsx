import Icon from "@/components/ui/icon";
import { MACHINE_SPECS_BASE, MACHINE_ADVANTAGES, MACHINE_SAFETY, MACHINE_SCENARIOS } from "./machine.data";

export default function MachineSpecs() {
  return (
    <div className="space-y-6">

      {/* Визуальная модель станка */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="Box" size={15} className="text-primary" />
          <span className="text-sm font-semibold">Визуальная модель МАТ-1 — гибрид 4-в-1</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center p-4">
            <img
              src="https://cdn.poehali.dev/projects/4a414f55-f964-427a-bda6-0016a78c34e4/files/607b5be0-8a5d-4260-9e03-cb81b9dcc0e2.jpg"
              alt="Гибридный станок МАТ-1 — токарная, фрезерная, сверлильная и лазерная обработка"
              className="max-h-80 w-auto object-contain rounded-lg"
            />
          </div>
          <div className="p-5 space-y-3 border-t lg:border-t-0 lg:border-l border-border">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Габариты (Д×Ш×В)</div>
              <div className="text-sm font-semibold text-foreground">1100 × 750 × 950 мм</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Рабочая зона (X×Y×Z)</div>
              <div className="text-sm font-semibold text-foreground">500 × 300 × 250 мм</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Технологии</div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {["Точение", "Фрезерование", "Сверление", "Лазер"].map((t) => (
                  <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              Габаритный чертёж в 3 видах доступен в редакторе чертежей — раздел библиотеки «Станок МАТ-1».
            </p>
          </div>
        </div>
      </div>

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