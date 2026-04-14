import { fmt, fmtDec, Section, Th, type CalcResult } from "@/components/smartmach/economics.types";

interface Props {
  calc: CalcResult;
}

export default function EconomicsTabCalc({ calc }: Props) {
  return (
    <div className="space-y-6">

      {/* Таблица по изделиям */}
      <Section title="Себестоимость по изделиям" icon="Calculator">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <Th>Изделие</Th>
              <Th align="right">Материалы/шт</Th>
              <Th align="right">Труд/шт</Th>
              <Th align="right">Накладные/шт</Th>
              <Th align="right">Себест./шт</Th>
              <Th align="right">Кол-во</Th>
              <Th align="right">Себест./мес</Th>
              <Th align="right">Цена без НДС</Th>
              <Th align="right">Цена с НДС</Th>
              <Th align="right">Прибыль/мес</Th>
              <Th align="right">Маржа</Th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {calc.productCalcs.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/10">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmt(p.matCost)} ₽</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmt(p.laborCost)} ₽</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmt(p.overheadShare)} ₽</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(p.costPerUnit)} ₽</td>
                  <td className="px-3 py-2 text-right">{p.qty}</td>
                  <td className="px-3 py-2 text-right text-orange-600 font-medium">{fmt(p.costTotal)} ₽</td>
                  <td className="px-3 py-2 text-right text-blue-600">{fmt(p.priceWithProfit)} ₽</td>
                  <td className="px-3 py-2 text-right text-blue-700 font-medium">{fmt(p.priceWithVat)} ₽</td>
                  <td className={`px-3 py-2 text-right font-semibold ${p.profit >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(p.profit)} ₽</td>
                  <td className={`px-3 py-2 text-right font-semibold ${p.margin >= 0 ? "text-green-600" : "text-red-500"}`}>{fmtDec(p.margin, 1)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-border bg-secondary/20 font-semibold">
              <td className="px-3 py-2">ИТОГО ЦЕХ</td>
              <td colSpan={5} />
              <td className="px-3 py-2 text-right text-orange-600">{fmt(calc.totalCost)} ₽</td>
              <td colSpan={2} />
              <td className={`px-3 py-2 text-right ${calc.totalProfit >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(calc.totalProfit)} ₽</td>
              <td className={`px-3 py-2 text-right ${calc.workshopMargin >= 0 ? "text-green-600" : "text-red-500"}`}>{fmtDec(calc.workshopMargin, 1)}%</td>
            </tr></tfoot>
          </table>
        </div>
      </Section>

      {/* Структура затрат */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
      </div>
    </div>
  );
}
