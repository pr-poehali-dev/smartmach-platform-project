/**
 * EconomicsCostTable — таблица себестоимости по изделиям с итоговой строкой по цеху.
 * Извлечено 1:1 из EconomicsTabCalc без изменения логики.
 */
import { fmt, fmtDec, Section, Th, type CalcResult } from "@/components/smartmach/economics.types";

export default function EconomicsCostTable({ calc }: { calc: CalcResult }) {
  return (
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
  );
}
