/**
 * EconomicsCostStructure — диаграмма структуры себестоимости цеха за месяц.
 * Извлечено 1:1 из EconomicsTabCalc без изменения логики.
 */
import { fmt, fmtDec, Section, type CalcResult } from "@/components/smartmach/economics.types";

export default function EconomicsCostStructure({ calc }: { calc: CalcResult }) {
  return (
    <Section title="Структура себестоимости цеха/мес" icon="PieChart">
      <div className="space-y-3 pt-1">
        {[
          { label: "ФОТ с отчислениями", value: calc.salaryWithTax, color: "bg-blue-400" },
          { label: "Накладные расходы",   value: calc.overheadTotal, color: "bg-orange-400" },
          { label: "Материалы",           value: calc.productCalcs.reduce((s, p) => s + p.matCost * p.qty, 0), color: "bg-green-400" },
        ].map((r) => {
          const pct = calc.totalCost > 0 ? (r.value / calc.totalCost) * 100 : 0;
          return (
            <div key={r.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium">{fmt(r.value)} ₽ <span className="text-muted-foreground text-xs">({fmtDec(pct, 1)}%)</span></span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${r.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
