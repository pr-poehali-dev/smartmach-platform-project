/**
 * EconomicsWorkshopTotals — сводка итогов по цеху за месяц.
 * Извлечено 1:1 из EconomicsTabCalc без изменения логики.
 */
import { fmt, fmtDec, Section, type CalcResult } from "@/components/smartmach/economics.types";

export default function EconomicsWorkshopTotals({ calc }: { calc: CalcResult }) {
  return (
    <Section title="Итоги по цеху за месяц" icon="BarChart3">
      <div className="space-y-2.5 pt-1">
        {[
          { label: "Выручка",                value: calc.totalRevenue,      color: "text-blue-600" },
          { label: "Переменные затраты",     value: calc.productCalcs.reduce((s, p) => s + (p.matCost + p.laborCost) * p.qty, 0), color: "text-orange-500" },
          { label: "Постоянные затраты",     value: calc.fixedTotal,         color: "text-orange-700" },
          { label: "Полная себестоимость",   value: calc.totalCost,          color: "text-red-500" },
          { label: "Прибыль до налогов",     value: calc.totalProfit,        color: calc.totalProfit >= 0 ? "text-green-600" : "text-red-600" },
          { label: "Рентабельность продаж",  value: null, extra: `${fmtDec(calc.workshopMargin, 1)}%`, color: "text-purple-600" },
          { label: "Ставка машино-часа",     value: null, extra: `${fmt(calc.machineHourRate)} ₽/ч`, color: "text-gray-600" },
        ].map((r) => (
          <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className={`font-semibold ${r.color}`}>
              {r.extra ?? `${fmt(r.value!)} ₽`}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
