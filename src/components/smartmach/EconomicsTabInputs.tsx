import Icon from "@/components/ui/icon";
import {
  fmt, uid, NumInput, Section, Th,
  type Material, type Worker, type Overhead, type Product, type CalcResult,
} from "@/components/smartmach/economics.types";

interface Props {
  materials: Material[];
  workers: Worker[];
  overheads: Overhead[];
  products: Product[];
  workDays: number;
  hoursDay: number;
  vatPct: number;
  profitPct: number;
  calc: CalcResult;
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  setOverheads: React.Dispatch<React.SetStateAction<Overhead[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setWorkDays: React.Dispatch<React.SetStateAction<number>>;
  setHoursDay: React.Dispatch<React.SetStateAction<number>>;
  setVatPct: React.Dispatch<React.SetStateAction<number>>;
  setProfitPct: React.Dispatch<React.SetStateAction<number>>;
}

export default function EconomicsTabInputs({
  materials, workers, overheads, products,
  workDays, hoursDay, vatPct, profitPct, calc,
  setMaterials, setWorkers, setOverheads, setProducts,
  setWorkDays, setHoursDay, setVatPct, setProfitPct,
}: Props) {
  const updMat  = (id: string, key: keyof Material,  val: string | number) =>
    setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, [key]: val } : m));
  const updWork = (id: string, key: keyof Worker,    val: string | number) =>
    setWorkers((prev) => prev.map((w) => w.id === id ? { ...w, [key]: val } : w));
  const updOver = (id: string, key: keyof Overhead,  val: string | number) =>
    setOverheads((prev) => prev.map((o) => o.id === id ? { ...o, [key]: val } : o));
  const updProd = (id: string, key: keyof Product,   val: string | number) =>
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [key]: val } : p));

  return (
    <div className="space-y-6">

      {/* Параметры расчёта */}
      <Section title="Параметры расчётного периода" icon="SlidersHorizontal">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Рабочих дней/мес",  value: workDays,  set: setWorkDays,  min: 1,  max: 31  },
            { label: "Часов в смену",      value: hoursDay,  set: setHoursDay,  min: 1,  max: 24  },
            { label: "НДС, %",             value: vatPct,    set: setVatPct,    min: 0,  max: 30  },
            { label: "Целевая прибыль, %", value: profitPct, set: setProfitPct, min: 0,  max: 200 },
          ].map((f) => (
            <div key={f.label} className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">{f.label}</p>
              <input type="number" value={f.value} min={f.min} max={f.max}
                onChange={(e) => f.set(Number(e.target.value))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
      </Section>

      {/* Материалы */}
      <Section title="Материалы и комплектующие" icon="Package"
        action={
          <button onClick={() => setMaterials((p) => [...p, { id: uid(), name: "Новый материал", unit: "кг", price: 0, consumption: 0 }])}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Icon name="Plus" size={13} />Добавить
          </button>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <Th>Наименование</Th><Th>Ед. изм.</Th><Th align="right">Цена, ₽</Th><Th align="right">Расход/деталь</Th><Th align="right">Стоимость/деталь</Th><Th />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {materials.map((m) => (
                <tr key={m.id} className="hover:bg-secondary/10">
                  <td className="px-3 py-2">
                    <input value={m.name} onChange={(e) => updMat(m.id, "name", e.target.value)}
                      className="w-full border-0 bg-transparent focus:outline-none text-sm" />
                  </td>
                  <td className="px-3 py-2 w-20">
                    <input value={m.unit} onChange={(e) => updMat(m.id, "unit", e.target.value)}
                      className="w-16 border border-border rounded px-2 py-0.5 text-xs text-center focus:outline-none" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={m.price} onChange={(v) => updMat(m.id, "price", v)} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <NumInput value={m.consumption} onChange={(v) => updMat(m.id, "consumption", v)} />
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">
                    {fmt(m.price * m.consumption)} ₽
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => setMaterials((p) => p.filter((x) => x.id !== m.id))} className="text-muted-foreground hover:text-red-500">
                      <Icon name="X" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Персонал */}
      <Section title="Персонал цеха" icon="Users"
        action={
          <button onClick={() => setWorkers((p) => [...p, { id: uid(), position: "Новая должность", count: 1, salary: 50000 }])}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Icon name="Plus" size={13} />Добавить
          </button>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <Th>Должность</Th><Th align="right">Кол-во чел.</Th><Th align="right">Оклад, ₽</Th><Th align="right">ФОТ + взносы</Th><Th />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-secondary/10">
                  <td className="px-3 py-2">
                    <input value={w.position} onChange={(e) => updWork(w.id, "position", e.target.value)}
                      className="w-full border-0 bg-transparent focus:outline-none text-sm" />
                  </td>
                  <td className="px-3 py-2 text-right"><NumInput value={w.count}  onChange={(v) => updWork(w.id, "count",  v)} /></td>
                  <td className="px-3 py-2 text-right"><NumInput value={w.salary} onChange={(v) => updWork(w.id, "salary", v)} /></td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(w.count * w.salary * 1.30)} ₽</td>
                  <td className="px-2 py-2">
                    <button onClick={() => setWorkers((p) => p.filter((x) => x.id !== w.id))} className="text-muted-foreground hover:text-red-500">
                      <Icon name="X" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-border bg-secondary/20">
              <td className="px-3 py-2 font-semibold" colSpan={2}>Итого</td>
              <td className="px-3 py-2 text-right font-semibold">{fmt(calc.salaryTotal)} ₽</td>
              <td className="px-3 py-2 text-right font-semibold text-orange-600">{fmt(calc.salaryWithTax)} ₽</td>
              <td />
            </tr></tfoot>
          </table>
        </div>
      </Section>

      {/* Накладные */}
      <Section title="Накладные расходы (в месяц)" icon="Receipt"
        action={
          <button onClick={() => setOverheads((p) => [...p, { id: uid(), name: "Новая статья", monthly: 0 }])}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Icon name="Plus" size={13} />Добавить
          </button>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <Th>Статья расходов</Th><Th align="right">Сумма/мес, ₽</Th><Th align="right">Доля</Th><Th />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {overheads.map((o) => (
                <tr key={o.id} className="hover:bg-secondary/10">
                  <td className="px-3 py-2">
                    <input value={o.name} onChange={(e) => updOver(o.id, "name", e.target.value)}
                      className="w-full border-0 bg-transparent focus:outline-none text-sm" />
                  </td>
                  <td className="px-3 py-2 text-right"><NumInput value={o.monthly} onChange={(v) => updOver(o.id, "monthly", v)} /></td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {calc.overheadTotal > 0 ? fmtDec((o.monthly / calc.overheadTotal) * 100, 1) : "0.00"}%
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => setOverheads((p) => p.filter((x) => x.id !== o.id))} className="text-muted-foreground hover:text-red-500">
                      <Icon name="X" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-border bg-secondary/20">
              <td className="px-3 py-2 font-semibold">Итого накладных</td>
              <td className="px-3 py-2 text-right font-semibold text-orange-600">{fmt(calc.overheadTotal)} ₽</td>
              <td colSpan={2} />
            </tr></tfoot>
          </table>
        </div>
      </Section>

      {/* Продукция */}
      <Section title="Производственная программа" icon="ListChecks"
        action={
          <button onClick={() => setProducts((p) => [...p, { id: uid(), name: "Новое изделие", qty: 100, price: 1000, materialIds: [], laborHours: 1 }])}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Icon name="Plus" size={13} />Добавить
          </button>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <Th>Изделие</Th><Th align="right">Кол-во/мес</Th><Th align="right">Цена продажи, ₽</Th><Th align="right">Трудоёмкость, ч</Th><Th align="right">Выручка/мес</Th><Th />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/10">
                  <td className="px-3 py-2">
                    <input value={p.name} onChange={(e) => updProd(p.id, "name", e.target.value)}
                      className="w-full border-0 bg-transparent focus:outline-none text-sm" />
                  </td>
                  <td className="px-3 py-2 text-right"><NumInput value={p.qty}        onChange={(v) => updProd(p.id, "qty",        v)} /></td>
                  <td className="px-3 py-2 text-right"><NumInput value={p.price}      onChange={(v) => updProd(p.id, "price",      v)} /></td>
                  <td className="px-3 py-2 text-right"><NumInput value={p.laborHours} onChange={(v) => updProd(p.id, "laborHours", v)} /></td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(p.price * p.qty)} ₽</td>
                  <td className="px-2 py-2">
                    <button onClick={() => setProducts((p2) => p2.filter((x) => x.id !== p.id))} className="text-muted-foreground hover:text-red-500">
                      <Icon name="X" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function fmtDec(n: number, d = 2) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
}
