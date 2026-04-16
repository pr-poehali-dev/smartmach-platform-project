import { useState, useMemo, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { apiGet as apiFetch, apiPost as apiPostFn } from "@/lib/api";
import {
  fmt, fmtDec,
  INIT_MATERIALS, INIT_WORKERS, INIT_OVERHEADS, INIT_PRODUCTS,
  type Employee, type Material, type Worker, type Overhead, type Product,
  type Tab, type CalcResult,
} from "@/components/smartmach/economics.types";
import EconomicsTabInputs    from "@/components/smartmach/EconomicsTabInputs";
import EconomicsTabCalc      from "@/components/smartmach/EconomicsTabCalc";
import EconomicsTabBreakeven from "@/components/smartmach/EconomicsTabBreakeven";
import EconomicsTabSuppliers from "@/components/smartmach/EconomicsTabSuppliers";

async function saveEconomicsKey(key: string, value: unknown) {
  await apiPostFn("economics", { key, value }, { resource: "economics_data" });
}

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

  /* ── расчёт ── */
  const calc = useMemo((): CalcResult => {
    const monthHours  = workDays * hoursDay;

    const salaryTotal = workers.reduce((s, w) => s + w.count * w.salary, 0);
    const salaryWithTax = salaryTotal * 1.30;

    const overheadTotal = overheads.reduce((s, o) => s + o.monthly, 0);

    const fixedTotal = salaryWithTax + overheadTotal;

    const totalMachines = 6;
    const machineHourRate = fixedTotal / (totalMachines * monthHours);

    const productCalcs = products.map((pr) => {
      const matCost = pr.materialIds.reduce((s, mid) => {
        const m = materials.find((m2) => m2.id === mid);
        return s + (m ? m.price * m.consumption : 0);
      }, 0);

      const avgWage = salaryTotal / workers.reduce((s, w) => s + w.count, 0);
      const hourlyWage = (avgWage * 1.30) / (monthHours);
      const laborCost = pr.laborHours * hourlyWage;

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

    const totalRevenue = productCalcs.reduce((s, p) => s + p.revenue, 0);
    const totalCost    = productCalcs.reduce((s, p) => s + p.costTotal, 0);
    const totalProfit  = totalRevenue - totalCost;
    const workshopMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

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

  if (dbLoading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Icon name="Loader2" size={22} className="animate-spin mr-2" />Загрузка данных…
    </div>
  );

  const responsible = employees.find((e) => e.id === responsibleId);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {/* Шапка */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Экономика производства</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Себестоимость · Точка безубыточности · Рентабельность</p>
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
          { label: "Выручка/мес",       value: `${fmt(calc.totalRevenue)} ₽`,          icon: "TrendingUp",       color: "text-blue-600 bg-blue-50" },
          { label: "Себестоимость/мес",  value: `${fmt(calc.totalCost)} ₽`,             icon: "Package",          color: "text-orange-600 bg-orange-50" },
          { label: "Прибыль/мес",        value: `${fmt(calc.totalProfit)} ₽`,           icon: "CircleDollarSign", color: calc.totalProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50" },
          { label: "Рентабельность",     value: `${fmtDec(calc.workshopMargin, 1)}%`,   icon: "Percent",          color: "text-purple-600 bg-purple-50" },
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
          ["inputs",    "Settings2",   "Исходные данные"],
          ["calc",      "Calculator",  "Расчёт себестоимости"],
          ["breakeven", "BarChart2",   "Точка безубыточности"],
          ["suppliers", "Building2",   "Справочник производств"],
        ] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon name={icon} size={15} />{label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      {tab === "inputs" && (
        <EconomicsTabInputs
          materials={materials} workers={workers} overheads={overheads} products={products}
          workDays={workDays} hoursDay={hoursDay} vatPct={vatPct} profitPct={profitPct}
          calc={calc}
          setMaterials={setMaterials} setWorkers={setWorkers}
          setOverheads={setOverheads} setProducts={setProducts}
          setWorkDays={setWorkDays} setHoursDay={setHoursDay}
          setVatPct={setVatPct} setProfitPct={setProfitPct}
        />
      )}
      {tab === "calc" && (
        <EconomicsTabCalc calc={calc} />
      )}
      {tab === "breakeven" && (
        <EconomicsTabBreakeven calc={calc} />
      )}
      {tab === "suppliers" && (
        <EconomicsTabSuppliers
          supplierSearch={supplierSearch}
          setSupplierSearch={setSupplierSearch}
          calc={calc}
        />
      )}
    </div>
  );
}