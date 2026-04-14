import { useState, useMemo, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { apiGet as apiFetch, apiPost as apiPostFn } from "@/lib/api";

interface Employee { id: number; full_name: string; position: string; department: string; status: string; }

async function saveEconomicsKey(key: string, value: unknown) {
  await apiPostFn("economics", { key, value }, { resource: "economics_data" });
}

/* ─── типы ──────────────────────────────────────────────────────── */

interface Material {
  id: string; name: string; unit: string; price: number; consumption: number;
}
interface Worker {
  id: string; position: string; count: number; salary: number;
}
interface Overhead {
  id: string; name: string; monthly: number;
}
interface Product {
  id: string; name: string; qty: number; price: number;
  materialIds: string[]; laborHours: number;
}

type Tab = "inputs" | "calc" | "breakeven" | "suppliers";

/* ─── начальные данные ───────────────────────────────────────────── */

const INIT_MATERIALS: Material[] = [
  { id: "m1", name: "Сталь 45 (пруток Ø40)",  unit: "кг",  price: 85,    consumption: 2.4 },
  { id: "m2", name: "Алюминий Д16Т (лист)",   unit: "кг",  price: 320,   consumption: 0.8 },
  { id: "m3", name: "СОЖ ЭМУЛЬСОЛ",           unit: "л",   price: 45,    consumption: 0.3 },
  { id: "m4", name: "Режущий инструмент",      unit: "шт",  price: 1200,  consumption: 0.05 },
];

const INIT_WORKERS: Worker[] = [
  { id: "w1", position: "Токарь 4р.",      count: 3, salary: 62000 },
  { id: "w2", position: "Фрезеровщик 4р.", count: 2, salary: 68000 },
  { id: "w3", position: "ИТР / технолог",  count: 1, salary: 95000 },
  { id: "w4", position: "Наладчик ЧПУ",    count: 1, salary: 85000 },
];

const INIT_OVERHEADS: Overhead[] = [
  { id: "o1", name: "Аренда цеха",             monthly: 180000 },
  { id: "o2", name: "Электроэнергия",          monthly: 95000  },
  { id: "o3", name: "Амортизация оборудования",monthly: 55000  },
  { id: "o4", name: "Прочие накладные",         monthly: 40000  },
];

const INIT_PRODUCTS: Product[] = [
  { id: "p1", name: "Вал шестерёнчатый",  qty: 200, price: 4800,  materialIds: ["m1","m3","m4"], laborHours: 1.5 },
  { id: "p2", name: "Корпус редуктора",   qty: 80,  price: 12500, materialIds: ["m1","m3","m4"], laborHours: 3.2 },
  { id: "p3", name: "Крышка подшипника",  qty: 300, price: 1200,  materialIds: ["m2","m3","m4"], laborHours: 0.6 },
];

const SUPPLIERS = [
  { name: "МеталлСервис",       city: "Москва",       services: ["Токарная обработка","Фрезерование","Шлифование"], priceFrom: 850, unit: "₽/час", cert: "ISO 9001", lead: "3–5 дн.", url: "#" },
  { name: "ПромДеталь",         city: "Санкт-Петербург", services: ["Лазерная резка","Гибка","Сварка"],          priceFrom: 1200, unit: "₽/час", cert: "—",        lead: "2–4 дн.", url: "#" },
  { name: "СтанкоЦентр Урал",  city: "Екатеринбург", services: ["ЧПУ 5-осевое","EDM","Координатная обработка"], priceFrom: 1600, unit: "₽/час", cert: "ГОСТ Р",   lead: "5–7 дн.", url: "#" },
  { name: "АвтоМеталл",         city: "Тольятти",     services: ["Штамповка","Токарная","Термообработка"],       priceFrom: 700,  unit: "₽/час", cert: "ISO 9001", lead: "4–6 дн.", url: "#" },
  { name: "ТитанТех",           city: "Нижний Новгород", services: ["Титан и нержавейка","ЧПУ","Контроль"],     priceFrom: 2200, unit: "₽/час", cert: "AS 9100",  lead: "7–10 дн.", url: "#" },
  { name: "МашДеталь Сибирь",  city: "Новосибирск",  services: ["Литьё","Токарная","Фрезерование"],             priceFrom: 650,  unit: "₽/час", cert: "—",        lead: "3–5 дн.", url: "#" },
  { name: "КопрЗавод",          city: "Челябинск",    services: ["Ковка","Штамповка","Горячая обработка"],       priceFrom: 950,  unit: "₽/кг",  cert: "ГОСТ Р",   lead: "10–14 дн.", url: "#" },
  { name: "ПрецизионТех",       city: "Москва",       services: ["Высокоточная обработка","Контроль КИМ"],       priceFrom: 3500, unit: "₽/час", cert: "ISO 9001", lead: "5–8 дн.", url: "#" },
];

/* ─── вспомогалки ────────────────────────────────────────────────── */

function fmt(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDec(n: number, d = 2) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function uid() { return Math.random().toString(36).slice(2, 8); }

/* ─── Row-компоненты ──────────────────────────────────────────────── */

function NumInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
      <input
        type="number" value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 border border-border rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

/* ─── главный компонент ──────────────────────────────────────────── */

export default function ModuleEconomics() {
  const [tab, setTab] = useState<Tab>("inputs");
  const [materials,  setMaterials]  = useState<Material[]>(INIT_MATERIALS);
  const [workers,    setWorkers]    = useState<Worker[]>(INIT_WORKERS);
  const [overheads,  setOverheads]  = useState<Overhead[]>(INIT_OVERHEADS);
  const [products,   setProducts]   = useState<Product[]>(INIT_PRODUCTS);
  const [workDays,   setWorkDays]   = useState(22);
  const [hoursDay,   setHoursDay]   = useState(8);
  const [vatPct,     setVatPct]     = useState(20);
  const [profitPct,  setProfitPct]  = useState(25);
  const [responsibleId, setResponsibleId] = useState<number | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [employees,  setEmployees]  = useState<Employee[]>([]);
  const [dbLoading,  setDbLoading]  = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");

  // Загрузка данных из БД
  useEffect(() => {
    (async () => {
      setDbLoading(true);
      try {
        const [empRes, dataRes] = await Promise.all([
          apiFetch("economics", "", { resource: "employees" }),
          apiFetch("economics", "", { resource: "economics_data" }),
        ]);
        if (Array.isArray(empRes)) setEmployees(empRes.filter((e: Employee) => e.status !== "fired"));
        if (dataRes && typeof dataRes === "object") {
          if (dataRes.materials)    setMaterials(dataRes.materials);
          if (dataRes.workers)      setWorkers(dataRes.workers);
          if (dataRes.overheads)    setOverheads(dataRes.overheads);
          if (dataRes.products)     setProducts(dataRes.products);
          if (dataRes.settings) {
            const s = dataRes.settings;
            if (s.workDays)      setWorkDays(s.workDays);
            if (s.hoursDay)      setHoursDay(s.hoursDay);
            if (s.vatPct)        setVatPct(s.vatPct);
            if (s.profitPct)     setProfitPct(s.profitPct);
            if (s.responsibleId) setResponsibleId(s.responsibleId);
          }
        }
      } catch { /* ignore, используем дефолты */ }
      finally { setDbLoading(false); }
    })();
  }, []);

  const saveAll = useCallback(async (
    mats: Material[], wrks: Worker[], ovhds: Overhead[], prods: Product[],
    wd: number, hd: number, vat: number, profit: number, resp: number | null
  ) => {
    setSaving(true);
    try {
      await Promise.all([
        saveEconomicsKey("materials", mats),
        saveEconomicsKey("workers",   wrks),
        saveEconomicsKey("overheads", ovhds),
        saveEconomicsKey("products",  prods),
        saveEconomicsKey("settings",  { workDays: wd, hoursDay: hd, vatPct: vat, profitPct: profit, responsibleId: resp }),
      ]);
      setSaveMsg("Сохранено");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch { setSaveMsg("Ошибка"); }
    finally { setSaving(false); }
  }, []);

  const handleSave = () => saveAll(materials, workers, overheads, products, workDays, hoursDay, vatPct, profitPct, responsibleId);

  /* ── расчёт ─── */
  const calc = useMemo(() => {
    const monthHours  = workDays * hoursDay;

    // Зарплата (с учётом страховых взносов ~30%)
    const salaryTotal = workers.reduce((s, w) => s + w.count * w.salary, 0);
    const salaryWithTax = salaryTotal * 1.30;

    // Накладные
    const overheadTotal = overheads.reduce((s, o) => s + o.monthly, 0);

    // Итого постоянные затраты/мес
    const fixedTotal = salaryWithTax + overheadTotal;

    // Ставка машино-часа (для распределения накладных)
    const totalMachines = 6; // кол-во станков по умолчанию
    const machineHourRate = fixedTotal / (totalMachines * monthHours);

    // Себестоимость по каждому изделию
    const productCalcs = products.map((pr) => {
      // Материалы на 1 деталь
      const matCost = pr.materialIds.reduce((s, mid) => {
        const m = materials.find((m2) => m2.id === mid);
        return s + (m ? m.price * m.consumption : 0);
      }, 0);

      // Трудозатраты на 1 деталь
      const avgWage = salaryTotal / workers.reduce((s, w) => s + w.count, 0); // ср. зарплата/чел
      const hourlyWage = (avgWage * 1.30) / (monthHours);
      const laborCost = pr.laborHours * hourlyWage;

      // Доля накладных на 1 деталь
      const overheadShare = (pr.laborHours / monthHours) * (overheadTotal / workers.reduce((s, w) => s + w.count, 0));

      const costPerUnit = matCost + laborCost + overheadShare;
      const costTotal   = costPerUnit * pr.qty;
      const priceWithProfit = costPerUnit * (1 + profitPct / 100);
      const priceWithVat    = priceWithProfit * (1 + vatPct / 100);
      const revenue    = pr.price * pr.qty;
      const profit     = revenue - costTotal;
      const margin     = revenue > 0 ? (profit / revenue) * 100 : 0;

      return { ...pr, matCost, laborCost, overheadShare, costPerUnit, costTotal, priceWithProfit, priceWithVat, revenue, profit, margin };
    });

    // Итоги по цеху
    const totalRevenue = productCalcs.reduce((s, p) => s + p.revenue, 0);
    const totalCost    = productCalcs.reduce((s, p) => s + p.costTotal, 0);
    const totalProfit  = totalRevenue - totalCost;
    const workshopMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Точка безубыточности
    const variableCostRatio = totalRevenue > 0
      ? productCalcs.reduce((s, p) => s + (p.matCost * p.qty + p.laborCost * p.qty), 0) / totalRevenue
      : 0;
    const contributionMarginRatio = 1 - variableCostRatio;
    const breakEvenRevenue = contributionMarginRatio > 0 ? fixedTotal / contributionMarginRatio : 0;
    const breakEvenUnits   = productCalcs.map((p) => ({
      name: p.name,
      units: p.qty > 0 && p.costPerUnit > 0
        ? Math.ceil(fixedTotal / (productCalcs.length * (p.price - p.matCost - p.laborCost)))
        : 0,
    }));

    return {
      monthHours, salaryTotal, salaryWithTax, overheadTotal, fixedTotal,
      machineHourRate, productCalcs, totalRevenue, totalCost, totalProfit,
      workshopMargin, breakEvenRevenue, breakEvenUnits, contributionMarginRatio,
    };
  }, [materials, workers, overheads, products, workDays, hoursDay, vatPct, profitPct]);

  /* ── мутаторы ── */
  const updMat = (id: string, key: keyof Material, val: string | number) =>
    setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, [key]: val } : m));
  const updWork = (id: string, key: keyof Worker, val: string | number) =>
    setWorkers((prev) => prev.map((w) => w.id === id ? { ...w, [key]: val } : w));
  const updOver = (id: string, key: keyof Overhead, val: string | number) =>
    setOverheads((prev) => prev.map((o) => o.id === id ? { ...o, [key]: val } : o));
  const updProd = (id: string, key: keyof Product, val: string | number) =>
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [key]: val } : p));

  const filteredSuppliers = SUPPLIERS.filter((s) => {
    const q = supplierSearch.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) ||
      s.services.some((sv) => sv.toLowerCase().includes(q));
  });

  if (dbLoading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Icon name="Loader2" size={22} className="animate-spin mr-2" />Загрузка данных…
    </div>
  );

  const responsible = employees.find((e) => e.id === responsibleId);

  return (
    <div className="p-6 space-y-5">

      {/* Шапка */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Экономика производства</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Себестоимость · Точка безубыточности · Рентабельность</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Ответственный */}
          <div className="flex items-center gap-2">
            <Icon name="UserCheck" size={14} className="text-muted-foreground shrink-0" />
            <select value={responsibleId ?? ""} onChange={(e) => setResponsibleId(e.target.value ? Number(e.target.value) : null)}
              className="border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[180px]">
              <option value="">Ответственный…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          {responsible && (
            <span className="text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1.5 rounded-lg">
              {responsible.position}
            </span>
          )}
          {/* Сохранить */}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
            <Icon name={saving ? "Loader2" : "Save"} size={13} className={saving ? "animate-spin" : ""} />
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          {saveMsg && (
            <span className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${saveMsg === "Сохранено" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {saveMsg}
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
            <Icon name="Calendar" size={13} />
            {workDays} раб. дн. × {hoursDay} ч = {calc.monthHours} ч/мес
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Выручка/мес",      value: `${fmt(calc.totalRevenue)} ₽`,    icon: "TrendingUp",   color: "text-blue-600 bg-blue-50" },
          { label: "Себестоимость/мес", value: `${fmt(calc.totalCost)} ₽`,      icon: "Package",       color: "text-orange-600 bg-orange-50" },
          { label: "Прибыль/мес",       value: `${fmt(calc.totalProfit)} ₽`,    icon: "CircleDollarSign", color: calc.totalProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50" },
          { label: "Рентабельность",    value: `${fmtDec(calc.workshopMargin, 1)}%`, icon: "Percent", color: "text-purple-600 bg-purple-50" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
              <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 border-b border-border">
        {([
          ["inputs",   "Settings2",   "Исходные данные"],
          ["calc",     "Calculator",  "Расчёт себестоимости"],
          ["breakeven","BarChart2",   "Точка безубыточности"],
          ["suppliers","Building2",   "Справочник производств"],
        ] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon name={icon} size={15} />{label}
          </button>
        ))}
      </div>

      {/* ═══ ВКЛАДКА 1: Исходные данные ═══ */}
      {tab === "inputs" && (
        <div className="space-y-6">

          {/* Параметры расчёта */}
          <Section title="Параметры расчётного периода" icon="SlidersHorizontal">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Рабочих дней/мес", value: workDays, set: setWorkDays, min: 1, max: 31 },
                { label: "Часов в смену",    value: hoursDay, set: setHoursDay, min: 1, max: 24 },
                { label: "НДС, %",           value: vatPct,   set: setVatPct,   min: 0, max: 30 },
                { label: "Целевая прибыль, %",value: profitPct, set: setProfitPct, min: 0, max: 200 },
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
            action={<button onClick={() => setMaterials((p) => [...p, { id: uid(), name: "Новый материал", unit: "кг", price: 0, consumption: 0 }])}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Icon name="Plus" size={13} />Добавить</button>}>
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
            action={<button onClick={() => setWorkers((p) => [...p, { id: uid(), position: "Новая должность", count: 1, salary: 50000 }])}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Icon name="Plus" size={13} />Добавить</button>}>
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
                      <td className="px-3 py-2 text-right"><NumInput value={w.count} onChange={(v) => updWork(w.id, "count", v)} /></td>
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
            action={<button onClick={() => setOverheads((p) => [...p, { id: uid(), name: "Новая статья", monthly: 0 }])}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Icon name="Plus" size={13} />Добавить</button>}>
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
            action={<button onClick={() => setProducts((p) => [...p, { id: uid(), name: "Новое изделие", qty: 100, price: 1000, materialIds: [], laborHours: 1 }])}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Icon name="Plus" size={13} />Добавить</button>}>
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
                      <td className="px-3 py-2 text-right"><NumInput value={p.qty} onChange={(v) => updProd(p.id, "qty", v)} /></td>
                      <td className="px-3 py-2 text-right"><NumInput value={p.price} onChange={(v) => updProd(p.id, "price", v)} /></td>
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
      )}

      {/* ═══ ВКЛАДКА 2: Расчёт себестоимости ═══ */}
      {tab === "calc" && (
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
      )}

      {/* ═══ ВКЛАДКА 3: Точка безубыточности ═══ */}
      {tab === "breakeven" && (
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
                { label: "Постоянные затраты/мес",       value: `${fmt(calc.fixedTotal)} ₽`,                             sub: "ФОТ + накладные" },
                { label: "Маржинальный доход (доля)",     value: `${fmtDec(calc.contributionMarginRatio * 100, 1)}%`,       sub: "выручка − переменные затраты" },
                { label: "Текущая выручка",              value: `${fmt(calc.totalRevenue)} ₽`,                            sub: "по производственной программе" },
                { label: "Запас финансовой прочности",   value: `${fmt(calc.totalRevenue - calc.breakEvenRevenue)} ₽`,    sub: calc.totalRevenue >= calc.breakEvenRevenue ? "выручка выше ТБУ" : "дефицит до ТБУ" },
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
                { label: "Выручка",            value: calc.totalRevenue, max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-blue-400" },
                { label: "Полная себестоимость",value: calc.totalCost,   max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-red-400" },
                { label: "Точка безубыточности",value: calc.breakEvenRevenue, max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-yellow-400" },
                { label: "Прибыль",            value: Math.max(0, calc.totalProfit), max: Math.max(calc.totalRevenue, calc.breakEvenRevenue) * 1.1, color: "bg-green-400" },
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
      )}

      {/* ═══ ВКЛАДКА 4: Справочник производств ═══ */}
      {tab === "suppliers" && (
        <div className="space-y-5">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Поиск по названию, городу, услуге..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <span className="text-xs text-muted-foreground">{filteredSuppliers.length} компаний</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSuppliers.map((s) => (
              <div key={s.name} className="bg-white border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Icon name="MapPin" size={11} />{s.city}
                    </p>
                  </div>
                  {s.cert !== "—" && (
                    <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                      {s.cert}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {s.services.map((sv) => (
                    <span key={sv} className="text-[11px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">{sv}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm pt-1 border-t border-border/60">
                  <div>
                    <p className="font-semibold text-foreground">от {fmt(s.priceFrom)} {s.unit}</p>
                    <p className="text-xs text-muted-foreground">Срок: {s.lead}</p>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5">
                    <Icon name="Phone" size={12} />Запрос
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Сравнение с собственным производством */}
          <Section title="Сравнение: своё производство vs аутсорсинг" icon="GitCompareArrows">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-secondary/30">
                  <Th>Изделие</Th>
                  <Th align="right">Своя себест./шт</Th>
                  <Th align="right">Мин. аутсорсинг</Th>
                  <Th align="right">Разница</Th>
                  <Th align="right">Вывод</Th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {calc.productCalcs.map((p) => {
                    const minExternal = Math.min(...SUPPLIERS.map((s) => s.priceFrom)) * p.laborHours;
                    const diff = p.costPerUnit - minExternal;
                    return (
                      <tr key={p.id} className="hover:bg-secondary/10">
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-right">{fmt(p.costPerUnit)} ₽</td>
                        <td className="px-3 py-2 text-right">{fmt(minExternal)} ₽</td>
                        <td className={`px-3 py-2 text-right font-medium ${diff <= 0 ? "text-green-600" : "text-red-500"}`}>
                          {diff <= 0 ? "−" : "+"}{fmt(Math.abs(diff))} ₽
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diff <= 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                            {diff <= 0 ? "Выгоднее своё" : "Рассмотреть аутсорсинг"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

/* ── мелкие ui-хелперы ─────────────────────────────────────────── */

function Section({ title, icon, children, action }: {
  title: string; icon: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={15} className="text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-3 py-2 text-xs font-semibold text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}