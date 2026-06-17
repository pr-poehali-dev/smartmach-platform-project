import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { MACHINE_CONFIGS } from "./machine.data";

export default function MachineConfigurator() {
  const [selected, setSelected] = useState<string>("extended");

  const cfg = MACHINE_CONFIGS.find((c) => c.id === selected)!;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="SlidersHorizontal" size={15} className="text-primary" />
          <span className="text-sm font-semibold">Конфигурации станка</span>
        </div>

        {/* Переключатель конфигурации */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {MACHINE_CONFIGS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  selected === c.id
                    ? c.border + " bg-primary/3 shadow-sm"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="mb-2">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", c.badgeColor)}>
                    {c.badge}
                  </span>
                </div>
                <div className="font-bold text-foreground text-base">{c.name}</div>
                <div className="text-sm text-primary font-semibold mt-0.5">{c.price}</div>
              </button>
            ))}
          </div>

          {/* Состав выбранной конфигурации */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="CheckCircle2" size={15} className="text-green-600" />
                <span className="text-sm font-semibold text-foreground">Входит в комплект</span>
              </div>
              <ul className="space-y-2">
                {cfg.includes.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Icon name="Check" size={10} className="text-green-600" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {cfg.notIncludes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="XCircle" size={15} className="text-slate-400" />
                  <span className="text-sm font-semibold text-muted-foreground">Не входит (опция)</span>
                </div>
                <ul className="space-y-2">
                  {cfg.notIncludes.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm">
                      <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon name="Minus" size={10} className="text-slate-400" />
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Целевая аудитория */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="Users" size={15} className="text-primary" />
          <span className="text-sm font-semibold">Целевая аудитория</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
          {[
            { icon: "Wrench",       title: "Малые мастерские",       desc: "Мелкосерийное производство деталей без закупки нескольких станков" },
            { icon: "GraduationCap", title: "Учебные заведения",     desc: "Обучение основам ЧПУ, обработки металла, прототипирования" },
            { icon: "Home",          title: "Домашние мастерские",   desc: "Хобби-проекты и малые заказы с высоким качеством обработки" },
          ].map((a) => (
            <div key={a.title} className="px-5 py-4 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Icon name={a.icon as Parameters<typeof Icon>[0]["name"]} size={17} className="text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">{a.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Принцип модульности */}
      <div className="bg-gradient-to-r from-primary/5 to-blue-50 rounded-xl border border-primary/15 p-5 flex gap-4">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon name="Puzzle" size={18} className="text-white" />
        </div>
        <div>
          <div className="font-semibold text-foreground mb-1">Принцип модульного апгрейда</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Станок спроектирован с возможностью поэтапного расширения. Начните с базовой версии
            и докупите лазерный модуль или расширенную систему ЧПУ по мере роста задач —
            без полной замены оборудования.
          </p>
        </div>
      </div>
    </div>
  );
}
