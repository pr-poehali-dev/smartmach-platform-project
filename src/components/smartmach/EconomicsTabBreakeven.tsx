import { fmt, fmtDec, Section, Th, type CalcResult } from "@/components/smartmach/economics.types";

interface Props {
  calc: CalcResult;
}

export default function EconomicsTabBreakeven({ calc }: Props) {
  return (
    <div className="space-y-5">

      {/* Главный показатель */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white border border-border rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-muted-foreground mb-1">Точка безубыточности</p>
          <p className="text-3xl font-bold text-foreground">{fmt(calc.breakEvenRevenue)} ₽</p>
          <p className="text-xs text-muted-foreground mt-1">выручка в месяц</p>
          <div className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${
            calc.totalRevenue >= calc.breakEvenRevenue
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            {calc.totalRevenue >= calc.breakEvenRevenue
              ? `Выше ТБУ на ${fmt(calc.totalRevenue - calc.breakEvenRevenue)} ₽`
              : `Ниже ТБУ на ${fmt(calc.breakEvenRevenue - calc.totalRevenue)} ₽`}
          </div>
        </div>

        <div className="md:col-span-2 bg-white border border-border rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold">Анализ безубыточности</p>
          {[
            { label: "Постоянные затраты/мес",     value: `${fmt(calc.fixedTotal)} ₽`,                          sub: "ФОТ + накладные" },
            { label: "Маржинальный доход (доля)",   value: `${fmtDec(calc.contributionMarginRatio * 100, 1)}%`,  sub: "выручка − переменные затраты" },
            { label: "Текущая выручка",             value: `${fmt(calc.totalRevenue)} ₽`,                        sub: "по производственной программе" },
            { label: "Запас финансовой прочности",  value: `${fmt(calc.totalRevenue - calc.breakEvenRevenue)} ₽`, sub: calc.totalRevenue >= calc.breakEvenRevenue ? "выручка выше ТБУ" : "дефицит до ТБУ" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.sub}</p>
              </div>
              <p className="font-semibold text-foreground">{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ТБУ по изделиям */}
      <Section title="Точка безубыточности по изделиям" icon="Target">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <Th>Изделие</Th>
              <Th align="right">Себест./шт</Th>
              <Th align="right">Цена, ₽</Th>
              <Th align="right">Маржа на шт</Th>
              <Th align="right">План, шт</Th>
              <Th align="right">Прибыль/мес</Th>
              <Th align="right">Статус</Th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {calc.productCalcs.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/10">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmt(p.costPerUnit)} ₽</td>
                  <td className="px-3 py-2 text-right">{fmt(p.price)} ₽</td>
                  <td className={`px-3 py-2 text-right font-medium ${p.price >= p.costPerUnit ? "text-green-600" : "text-red-500"}`}>
                    {fmt(p.price - p.costPerUnit)} ₽
                  </td>
                  <td className="px-3 py-2 text-right">{p.qty} шт</td>
                  <td className={`px-3 py-2 text-right font-semibold ${p.profit >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(p.profit)} ₽</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.profit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {p.profit >= 0 ? "Прибыльно" : "Убыток"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Визуализация */}
      <Section title="График выручки vs себестоимости" icon="LineChart">
        <div className="pt-2 space-y-3">
          {[
            { label: "Выручка",             value: calc.totalRevenue,    max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-blue-400" },
            { label: "Полная себестоимость", value: calc.totalCost,       max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-red-400" },
            { label: "Точка безубыточности", value: calc.breakEvenRevenue,max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-yellow-400" },
            { label: "Прибыль",             value: Math.max(0, calc.totalProfit), max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-green-400" },
          ].map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium">{fmt(r.value)} ₽</span>
              </div>
              <div className="h-6 bg-secondary rounded-lg overflow-hidden relative">
                <div className={`h-full rounded-lg transition-all ${r.color} opacity-80`}
                  style={{ width: `${Math.min((r.value / r.max) * 100, 100)}%` }} />
                <span className="absolute right-2 top-0.5 text-xs text-muted-foreground">
                  {fmtDec((r.value / r.max) * 100, 0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
