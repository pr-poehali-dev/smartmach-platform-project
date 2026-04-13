import Icon from "@/components/ui/icon";

/* ─── типы ──────────────────────────────────────────────────────── */

export interface Material {
  id: string; name: string; unit: string; price: number; consumption: number;
}
export interface Worker {
  id: string; position: string; count: number; salary: number;
}
export interface Overhead {
  id: string; name: string; monthly: number;
}
export interface Product {
  id: string; name: string; qty: number; price: number;
  materialIds: string[]; laborHours: number;
}
export interface ProductCalc extends Product {
  matCost: number; laborCost: number; overheadShare: number;
  costPerUnit: number; costTotal: number;
  priceWithProfit: number; priceWithVat: number;
  revenue: number; profit: number; margin: number;
}
export interface CalcResult {
  monthHours: number;
  salaryTotal: number; salaryWithTax: number;
  overheadTotal: number; fixedTotal: number;
  machineHourRate: number;
  productCalcs: ProductCalc[];
  totalRevenue: number; totalCost: number; totalProfit: number;
  workshopMargin: number;
  breakEvenRevenue: number;
  breakEvenUnits: { name: string; units: number }[];
  contributionMarginRatio: number;
}

export type Tab = "inputs" | "calc" | "breakeven" | "suppliers";

/* ─── начальные данные ───────────────────────────────────────────── */

export const INIT_MATERIALS: Material[] = [
  { id: "m1", name: "Сталь 45 (пруток Ø40)",  unit: "кг",  price: 85,    consumption: 2.4 },
  { id: "m2", name: "Алюминий Д16Т (лист)",   unit: "кг",  price: 320,   consumption: 0.8 },
  { id: "m3", name: "СОЖ ЭМУЛЬСОЛ",           unit: "л",   price: 45,    consumption: 0.3 },
  { id: "m4", name: "Режущий инструмент",      unit: "шт",  price: 1200,  consumption: 0.05 },
];

export const INIT_WORKERS: Worker[] = [
  { id: "w1", position: "Токарь 4р.",      count: 3, salary: 62000 },
  { id: "w2", position: "Фрезеровщик 4р.", count: 2, salary: 68000 },
  { id: "w3", position: "ИТР / технолог",  count: 1, salary: 95000 },
  { id: "w4", position: "Наладчик ЧПУ",    count: 1, salary: 85000 },
];

export const INIT_OVERHEADS: Overhead[] = [
  { id: "o1", name: "Аренда цеха",              monthly: 180000 },
  { id: "o2", name: "Электроэнергия",           monthly: 95000  },
  { id: "o3", name: "Амортизация оборудования", monthly: 55000  },
  { id: "o4", name: "Прочие накладные",          monthly: 40000  },
];

export const INIT_PRODUCTS: Product[] = [
  { id: "p1", name: "Вал шестерёнчатый", qty: 200, price: 4800,  materialIds: ["m1","m3","m4"], laborHours: 1.5 },
  { id: "p2", name: "Корпус редуктора",  qty: 80,  price: 12500, materialIds: ["m1","m3","m4"], laborHours: 3.2 },
  { id: "p3", name: "Крышка подшипника", qty: 300, price: 1200,  materialIds: ["m2","m3","m4"], laborHours: 0.6 },
];

export const SUPPLIERS = [
  { name: "МеталлСервис",      city: "Москва",           services: ["Токарная обработка","Фрезерование","Шлифование"],    priceFrom: 850,  unit: "₽/час", cert: "ISO 9001", lead: "3–5 дн.",   url: "#" },
  { name: "ПромДеталь",        city: "Санкт-Петербург",  services: ["Лазерная резка","Гибка","Сварка"],                   priceFrom: 1200, unit: "₽/час", cert: "—",        lead: "2–4 дн.",   url: "#" },
  { name: "СтанкоЦентр Урал", city: "Екатеринбург",     services: ["ЧПУ 5-осевое","EDM","Координатная обработка"],        priceFrom: 1600, unit: "₽/час", cert: "ГОСТ Р",   lead: "5–7 дн.",   url: "#" },
  { name: "АвтоМеталл",        city: "Тольятти",         services: ["Штамповка","Токарная","Термообработка"],              priceFrom: 700,  unit: "₽/час", cert: "ISO 9001", lead: "4–6 дн.",   url: "#" },
  { name: "ТитанТех",          city: "Нижний Новгород",  services: ["Титан и нержавейка","ЧПУ","Контроль"],               priceFrom: 2200, unit: "₽/час", cert: "AS 9100",  lead: "7–10 дн.",  url: "#" },
  { name: "МашДеталь Сибирь", city: "Новосибирск",      services: ["Литьё","Токарная","Фрезерование"],                   priceFrom: 650,  unit: "₽/час", cert: "—",        lead: "3–5 дн.",   url: "#" },
  { name: "КопрЗавод",         city: "Челябинск",        services: ["Ковка","Штамповка","Горячая обработка"],              priceFrom: 950,  unit: "₽/кг",  cert: "ГОСТ Р",   lead: "10–14 дн.", url: "#" },
  { name: "ПрецизионТех",      city: "Москва",           services: ["Высокоточная обработка","Контроль КИМ"],              priceFrom: 3500, unit: "₽/час", cert: "ISO 9001", lead: "5–8 дн.",   url: "#" },
];

/* ─── вспомогалки ────────────────────────────────────────────────── */

export function fmt(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
export function fmtDec(n: number, d = 2) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function uid() { return Math.random().toString(36).slice(2, 8); }

/* ─── ui-хелперы ─────────────────────────────────────────────────── */

export function NumInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
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

export function Section({ title, icon, children, action }: {
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

export function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-3 py-2 text-xs font-semibold text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
