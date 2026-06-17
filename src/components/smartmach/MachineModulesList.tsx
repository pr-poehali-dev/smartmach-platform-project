import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { MACHINE_MODULES_LIST } from "./machine.data";

export default function MachineModulesList() {
  const [expanded, setExpanded] = useState<string | null>("lathe");

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="Layers" size={15} className="text-primary" />
          <span className="text-sm font-semibold">Модули конструкции</span>
          <span className="ml-auto text-xs text-muted-foreground">Нажмите для раскрытия</span>
        </div>

        <div className="divide-y divide-border/60">
          {MACHINE_MODULES_LIST.map((mod, i) => {
            const isOpen = expanded === mod.id;
            return (
              <div key={mod.id}>
                <button
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/20 transition-colors",
                    isOpen && "bg-primary/3"
                  )}
                  onClick={() => setExpanded(isOpen ? null : mod.id)}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", mod.color)}>
                    <Icon name={mod.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{mod.title}</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", mod.color, mod.border)}>
                        {mod.badge}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium shrink-0 mr-2">
                    Модуль {String(i + 1).padStart(2, "0")}
                  </div>
                  <Icon
                    name={isOpen ? "ChevronUp" : "ChevronDown"}
                    size={16}
                    className="text-muted-foreground flex-shrink-0"
                  />
                </button>

                {isOpen && (
                  <div className={cn("px-5 pb-4 border-t border-border/40 bg-secondary/5")}>
                    <ul className="mt-4 space-y-2">
                      {mod.specs.map((spec) => (
                        <li key={spec} className="flex items-start gap-2.5 text-sm text-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          {spec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Принципы снижения стоимости */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="TrendingDown" size={15} className="text-green-600" />
          <span className="text-sm font-semibold">Как снижается стоимость</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/30">
          {[
            {
              icon: "Package",
              title: "Стандартные компоненты",
              desc: "ШВП, направляющие, двигатели — серийные, доступные на рынке. Электрика: частотники Delta, реле Omron.",
            },
            {
              icon: "Minimize2",
              title: "Упрощённая механика",
              desc: "Отказ от 5-осевой обработки в базовой версии. Одна каретка для фрезерной и лазерной головок.",
            },
            {
              icon: "Code",
              title: "Открытая архитектура",
              desc: "ПО с открытым кодом (LinuxCNC, GRBL). Возможность самостоятельной доработки прошивки.",
            },
            {
              icon: "Puzzle",
              title: "Модульная сборка",
              desc: "Поставка в разобранном виде снижает стоимость доставки. Инструкция по сборке с видеоуроками.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-white px-5 py-4 flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={15} className="text-green-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground mb-0.5">{item.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
