import Icon from "@/components/ui/icon";

const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"];
const PRODUCTION = [62, 75, 58, 88, 70, 84];
const DEFECTS    = [4,  3,  6,  2,  5,  3];

const KPI = [
  { label: "OEE оборудования",  value: "78%",  delta: "+4%",  positive: true,  icon: "Cpu" },
  { label: "Выпуск изделий",    value: "184",  delta: "+12",  positive: true,  icon: "Package" },
  { label: "Процент брака",     value: "3.8%", delta: "-0.6%",positive: true,  icon: "ShieldCheck" },
  { label: "Простои (ч)",       value: "14",   delta: "+2",   positive: false, icon: "Clock" },
];

const maxProd = Math.max(...PRODUCTION);

export default function ModuleAnalytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Аналитика</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ключевые показатели производства за последние 6 месяцев</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center">
                <Icon name={k.icon as Parameters<typeof Icon>[0]["name"]} size={18} className="text-muted-foreground" />
              </div>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${k.positive ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
                {k.delta}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">{k.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <div className="text-sm font-semibold text-foreground mb-4">Выпуск изделий по месяцам</div>
          <div className="flex items-end gap-2 h-36">
            {MONTHS.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                  style={{ height: `${(PRODUCTION[i] / maxProd) * 100}%` }}
                  title={`${PRODUCTION[i]} шт.`}
                />
                <span className="text-xs text-muted-foreground">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Defects */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-4">
          <div className="text-sm font-semibold text-foreground mb-4">Брак по месяцам (шт.)</div>
          <div className="space-y-2.5">
            {MONTHS.map((m, i) => (
              <div key={m} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-7 flex-shrink-0">{m}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${DEFECTS[i] >= 5 ? "bg-red-400" : "bg-yellow-400"}`}
                    style={{ width: `${(DEFECTS[i] / 8) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground w-6 text-right">{DEFECTS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold text-foreground">Сводная таблица</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/20">
              {["Месяц", "Выпуск", "Брак", "OEE", "Простои (ч)"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MONTHS.map((m, i) => (
              <tr key={m} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-2 font-medium text-foreground">{m}</td>
                <td className="px-4 py-2 text-foreground">{PRODUCTION[i]}</td>
                <td className="px-4 py-2">
                  <span className={`font-medium ${DEFECTS[i] >= 5 ? "text-red-600" : "text-foreground"}`}>{DEFECTS[i]}</span>
                </td>
                <td className="px-4 py-2 text-foreground">{[72, 74, 69, 83, 76, 78][i]}%</td>
                <td className="px-4 py-2 text-foreground">{[16, 14, 18, 10, 15, 14][i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
