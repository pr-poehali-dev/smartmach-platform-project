/**
 * Параметрическая модель детали — общий язык ИИ-конструктора, генератора чертежа и ИИ-технолога.
 * ИИ отвечает за инженерное содержание (размеры, допуски, требования),
 * геометрию чертежа строит программа — поэтому чертёж всегда точный и по ГОСТ.
 */

import { type GearParams, nearestModule, gearGeometry } from "@/lib/aipart/gear";

export type PartKind = "shaft" | "disc" | "plate" | "gear";

export interface ShaftSection { d: number; l: number; tol: string | null; ra: number | null; thread: string | null; note?: string | null }
export interface Keyway { section: number; b: number; l: number; t1: number; from: number }
export interface Bore { d: number; tol: string | null; l: number }

export interface ShaftParams {
  sections: ShaftSection[];
  chamfer: number;
  bore: Bore | null;
  keyways: Keyway[];
  center_holes: boolean;
}

export interface DiscParams {
  D: number; D_tol: string | null; H: number;
  hub: { d: number; h: number } | null;
  bore: { d: number; tol: string | null };
  holes: { n: number; d: number; pcd: number } | null;
  keyway: { b: number; t2: number } | null;
  chamfer: number; ra_bore: number; ra_faces: number;
}

export interface PlateHole { x: number; y: number; d: number; thread: string | null }
export interface PlateParams { L: number; W: number; H: number; holes: PlateHole[]; chamfer: number; ra_faces: number }

export interface PartModel {
  kind: PartKind;
  name: string;
  designation: string;
  material: string;
  hardness: string | null;
  ra_general: number;
  requirements: string[];
  shaft: ShaftParams | null;
  disc: DiscParams | null;
  plate: PlateParams | null;
  gear?: GearParams | null;
}

export interface Normalized { model: PartModel; warnings: string[] }

/* ── утилиты ─────────────────────────────────────────────────────── */

export const num = (v: unknown, def = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : def;
  if (typeof v === "string") {
    const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : def;
  }
  return def;
};
const str = (v: unknown, def = ""): string => (typeof v === "string" ? v.trim() : v == null ? def : String(v)).trim() || def;
const strOrNull = (v: unknown): string | null => { const s = str(v); return s && s !== "null" ? s : null; };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const RA_SERIES = [0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 6.3, 12.5, 25, 50];
const raNorm = (v: unknown, def: number): number => {
  const n = num(v, def);
  return RA_SERIES.reduce((best, r) => (Math.abs(r - n) < Math.abs(best - n) ? r : best), RA_SERIES[0]);
};
/** Ширина призматической шпонки по ГОСТ 23360 для диаметра вала */
export function stdKeyB(d: number): number {
  const t: [number, number][] = [[8, 2], [10, 3], [12, 4], [17, 5], [22, 6], [30, 8], [38, 10], [44, 12], [50, 14], [58, 16], [65, 18], [75, 20], [85, 22], [95, 25], [110, 28], [130, 32], [150, 36]];
  return (t.find(([lim]) => d <= lim) ?? [0, 40])[1];
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Число в русском формате без лишних нулей: 1.6 → «1,6» */
export const fmt = (v: number, d = 2): string => String(round(v, d)).replace(".", ",");

/* ── нормализация ответа ИИ ──────────────────────────────────────── */

export function normalizeModel(raw: unknown): Normalized {
  const w: string[] = [];
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  let kind = str(r.kind) as PartKind;
  if (!["shaft", "disc", "plate", "gear"].includes(kind)) {
    kind = r.gear ? "gear" : r.shaft ? "shaft" : r.disc ? "disc" : r.plate ? "plate" : "shaft";
    w.push(`Тип детали не распознан — принят «${KIND_LABEL[kind]}»`);
  }

  const model: PartModel = {
    kind,
    name: str(r.name, "Деталь"),
    designation: str(r.designation, "СМ.00.001"),
    material: str(r.material, "Сталь 45 ГОСТ 1050-2013"),
    hardness: strOrNull(r.hardness),
    ra_general: raNorm(r.ra_general, 6.3),
    requirements: Array.isArray(r.requirements) ? r.requirements.map((x) => str(x)).filter(Boolean).slice(0, 10) : [],
    shaft: null, disc: null, plate: null, gear: null,
  };

  if (model.hardness) {
    const hv = model.hardness.replace(/\s/g, "").toLowerCase();
    model.requirements = model.requirements.filter((t) => !t.replace(/\s/g, "").toLowerCase().includes(hv));
  }

  if (kind === "shaft") model.shaft = normShaft(r.shaft, w);
  if (kind === "disc") model.disc = normDisc(r.disc, w);
  if (kind === "plate") model.plate = normPlate(r.plate, w);
  if (kind === "gear") model.gear = normGear(r.gear, w);

  if (!model.requirements.length) {
    model.requirements = [
      "Неуказанные предельные отклонения размеров: H14, h14, ±IT14/2.",
      "Неуказанные радиусы 1 мм.",
      "Острые кромки притупить.",
    ].filter(Boolean);
  }
  return { model, warnings: w };
}

function normShaft(raw: unknown, w: string[]): ShaftParams {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawSecs = Array.isArray(s.sections) ? s.sections : [];
  const sections: ShaftSection[] = rawSecs.slice(0, 20).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      d: clamp(num(o.d, 20), 1, 2000), l: clamp(num(o.l, 20), 0.5, 5000),
      tol: strOrNull(o.tol), ra: o.ra == null ? null : raNorm(o.ra, 6.3),
      thread: strOrNull(o.thread), note: strOrNull(o.note),
    };
  });
  if (!sections.length) {
    sections.push({ d: 40, l: 100, tol: null, ra: null, thread: null });
    w.push("Конструктор не задал ступени вала — добавлена одна ступень ∅40×100");
  }
  const minD = Math.min(...sections.map((x) => x.d));
  let chamfer = clamp(num(s.chamfer, 1), 0, 10);
  const edgeLimit = Math.min(sections[0].d / 4, sections[sections.length - 1].d / 4, sections[0].l / 2, sections[sections.length - 1].l / 2);
  if (chamfer > edgeLimit) { chamfer = round(edgeLimit, 1); w.push(`Фаска уменьшена до ${fmt(chamfer)} мм`); }

  let bore: Bore | null = null;
  if (s.bore && typeof s.bore === "object") {
    const b = s.bore as Record<string, unknown>;
    const d = num(b.d, 0);
    if (d > 0 && d < minD * 0.85) bore = { d, tol: strOrNull(b.tol), l: clamp(num(b.l, 0), 0, 5000) };
    else if (d > 0) w.push(`Отверстие ∅${fmt(d)} не помещается в ∅${fmt(minD)} — убрано`);
  }

  const keyways: Keyway[] = [];
  (Array.isArray(s.keyways) ? s.keyways : []).slice(0, 6).forEach((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    let i = Math.round(num(o.section, -1));
    const bReq = num(o.b, 0), lReq = num(o.l, 0);
    // ИИ иногда ошибается с индексом ступени (особенно по эскизу): если паз не помещается,
    // а на другой ступени он стандартен по ширине и помещается по длине — переносим
    if (bReq > 0 && lReq > 0 && (!sections[i] || sections[i].l < lReq * 0.8 || stdKeyB(sections[i].d) !== bReq)) {
      const better = sections.findIndex((x, j) => j !== i && stdKeyB(x.d) === bReq && x.l >= lReq * 0.8);
      if (better >= 0) {
        w.push(`Паз ${fmt(bReq)} перенесён на ступень ∅${fmt(sections[better].d)} — по ширине и длине он относится к ней`);
        i = better;
      }
    }
    const sec = sections[i];
    if (!sec) { w.push("Шпоночный паз ссылается на несуществующую ступень — убран"); return; }
    const b = clamp(num(o.b, 6), 1, sec.d * 0.6);
    let from = clamp(num(o.from, 3), 0, sec.l);
    let l = num(o.l, sec.l * 0.7);
    if (l + 2 * from > sec.l) {
      from = Math.min(from, Math.max(0.5, (sec.l - b) / 4));
      l = Math.max(b, sec.l - 2 * from);
      w.push(`Паз на ступени ∅${fmt(sec.d)} укорочен до ${fmt(l)} мм, чтобы поместиться на ступени`);
    }
    const t1 = clamp(num(o.t1, b * 0.5), 0.5, sec.d * 0.35);
    keyways.push({ section: i, b, l: round(l, 1), t1, from: round(from, 1) });
  });

  return { sections, chamfer, bore, keyways, center_holes: s.center_holes !== false };
}

function normDisc(raw: unknown, w: string[]): DiscParams {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const D = clamp(num(s.D, 100), 5, 3000);
  const H = clamp(num(s.H, 20), 0.5, 1000);
  const b = (s.bore ?? {}) as Record<string, unknown>;
  let bd = num(b.d, 0);
  if (bd < 0) bd = 0;
  if (bd >= D * 0.9) { bd = round(D * 0.3, 0); w.push(`Центральное отверстие принято ∅${fmt(bd)}`); }

  let hub: DiscParams["hub"] = null;
  if (s.hub && typeof s.hub === "object") {
    const h = s.hub as Record<string, unknown>;
    const hd = num(h.d, 0), hh = num(h.h, 0);
    if (hd > bd * 1.1 && hd > 0 && hd < D && hh > H) hub = { d: hd, h: hh };
    else if (hd || hh) w.push("Ступица с некорректными размерами — убрана");
  }
  const inner = hub ? hub.d : bd;

  let holes: DiscParams["holes"] = null;
  if (s.holes && typeof s.holes === "object") {
    const h = s.holes as Record<string, unknown>;
    const n = Math.round(clamp(num(h.n, 0), 0, 72));
    const d = num(h.d, 0);
    let pcd = num(h.pcd, 0);
    if (n > 0 && d > 0) {
      const lo = inner + d + 2, hi = D - d - 2;
      if (lo > hi) w.push("Крепёжные отверстия не помещаются между ступицей и наружным диаметром — убраны");
      else {
        if (pcd < lo || pcd > hi) { pcd = round((lo + hi) / 2, 0); w.push(`Диаметр расположения отверстий исправлен на ∅${fmt(pcd)}`); }
        holes = { n, d, pcd };
      }
    }
  }

  let keyway: DiscParams["keyway"] = null;
  if (s.keyway && typeof s.keyway === "object") {
    const k = s.keyway as Record<string, unknown>;
    const kb = num(k.b, 0), t2 = num(k.t2, 0);
    if (bd > 0 && kb > 0 && t2 > 0 && kb < bd * 0.6) keyway = { b: kb, t2: Math.min(t2, (inner - bd) / 2 * 0.6) };
  }

  return {
    D, D_tol: strOrNull(s.D_tol), H, hub, bore: { d: bd, tol: strOrNull(b.tol) ?? "H7" }, holes, keyway,
    chamfer: clamp(num(s.chamfer, 1), 0, 10), ra_bore: raNorm(s.ra_bore, 1.6), ra_faces: raNorm(s.ra_faces, 3.2),
  };
}

function normPlate(raw: unknown, w: string[]): PlateParams {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const L = clamp(num(s.L, 100), 2, 5000), W = clamp(num(s.W, 60), 2, 5000), H = clamp(num(s.H, 10), 0.3, 1000);
  const holes: PlateHole[] = [];
  (Array.isArray(s.holes) ? s.holes : []).slice(0, 60).forEach((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const d = num(o.d, 0), hx = num(o.x, -1), hy = num(o.y, -1);
    if (d <= 0) return;
    if (hx - d / 2 < 0 || hx + d / 2 > L || hy - d / 2 < 0 || hy + d / 2 > W) {
      w.push(`Отверстие ∅${fmt(d)} в точке (${fmt(hx)}; ${fmt(hy)}) выходит за контур — убрано`);
      return;
    }
    holes.push({ x: hx, y: hy, d, thread: strOrNull(o.thread) });
  });
  return { L, W, H, holes, chamfer: clamp(num(s.chamfer, 1), 0, 10), ra_faces: raNorm(s.ra_faces, 3.2) };
}

function normGear(raw: unknown, w: string[]): GearParams {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const m0 = clamp(num(s.m, 2), 0.5, 30);
  const m = nearestModule(m0);
  if (Math.abs(m - m0) > 1e-6) w.push(`Модуль ${fmt(m0)} заменён на ближайший стандартный ${fmt(m)} (ГОСТ 9563)`);
  const z = Math.round(clamp(num(s.z, 40), 8, 400));
  const beta = clamp(num(s.beta, 0), 0, 45);
  let x = clamp(num(s.x, 0), -0.6, 1.2);
  if (z < 17 && x < (17 - z) / 17) {
    x = round((17 - z) / 17, 2);
    w.push(`При z=${z} без смещения возникает подрезание ножки — принят x=${fmt(x)}`);
  }
  const geo = gearGeometry({ m, z, beta, x });
  const b = clamp(num(s.b, geo.d * 0.3), 2, 1000);
  const minRim = 2.5 * m;
  const rimMax = geo.df - 2 * minRim;

  const bo = (s.bore ?? {}) as Record<string, unknown>;
  let bd = num(bo.d, 0);
  if (bd <= 0 || bd > rimMax) {
    const nb = round(Math.max(Math.min(geo.df * 0.35, rimMax * 0.8), 5), 0);
    if (bd > 0) w.push(`Отверстие ∅${fmt(bd)} не оставляет обода под зубьями (нужно ≥ 2,5m) — принято ∅${fmt(nb)}`);
    bd = nb;
  }

  let hub: GearParams["hub"] = null;
  if (s.hub && typeof s.hub === "object") {
    const h = s.hub as Record<string, unknown>;
    const hd = num(h.d, 0), hh = num(h.h, 0);
    if (hd > bd * 1.15 && hd < rimMax && hh >= b * 0.5) hub = { d: hd, h: hh };
    else if (hd || hh) w.push("Ступица с некорректными размерами — убрана");
  }

  let web: GearParams["web"] = null;
  if (s.web && typeof s.web === "object") {
    const wb = s.web as Record<string, unknown>;
    const t = num(wb.t, 0);
    let dRim = num(wb.d_rim, 0);
    if (dRim > rimMax && dRim <= geo.df) dRim = Math.floor(rimMax);
    const inner = hub ? hub.d : bd * 1.6;
    if (t > 0 && t < b && dRim > inner + 4 && dRim <= rimMax) {
      let holes: { n: number; d: number; pcd: number } | null = null;
      if (wb.holes && typeof wb.holes === "object") {
        const ho = wb.holes as Record<string, unknown>;
        const n = Math.round(num(ho.n, 0)), d = num(ho.d, 0);
        let pcd = num(ho.pcd, (inner + dRim) / 2);
        const lo = inner + d + 2, hi = dRim - d - 2;
        if (n >= 3 && d > 0 && lo <= hi) {
          if (pcd < lo || pcd > hi) pcd = round((lo + hi) / 2, 0);
          holes = { n: Math.min(n, 12), d, pcd };
        } else if (n > 0) w.push("Облегчающие отверстия не помещаются в диске — убраны");
      }
      web = { t, d_rim: dRim, holes };
    } else if (t || dRim) w.push("Диск колеса с некорректными размерами — колесо выполнено сплошным");
  }

  let keyway: GearParams["keyway"] = null;
  if (s.keyway && typeof s.keyway === "object") {
    const k = s.keyway as Record<string, unknown>;
    const kb = num(k.b, 0), t2 = num(k.t2, 0);
    if (kb > 0 && t2 > 0 && kb < bd * 0.6) keyway = { b: kb, t2 };
  }

  const hand = beta > 0 ? (str(s.hand) === "left" ? "left" : "right") : null;
  const mz = num(s.mate_z, 0);
  return {
    m, z, beta, hand, x, b, accuracy: str(s.accuracy, "8-B"),
    mate_z: mz >= 8 ? Math.round(mz) : null, aw: num(s.aw, 0) > 0 ? num(s.aw, 0) : null,
    bore: { d: bd, tol: strOrNull(bo.tol) ?? "H7" }, keyway, hub, web,
    chamfer: clamp(num(s.chamfer, round(0.5 * m, 1)), 0, 10),
    ra_teeth: raNorm(s.ra_teeth, 1.6), ra_bore: raNorm(s.ra_bore, 1.6),
  };
}

/* ── масса и габариты ────────────────────────────────────────────── */

/** Плотность материала, г/см³ */
export function density(material: string): number {
  // \b в JS не работает с кириллицей — границу слова задаём явно
  const m = ` ${material.toLowerCase()} `;
  const has = (re: string) => new RegExp(`(?<![а-яёa-z])(${re})`).test(m);
  if (has("д16|ад\\d|ад31|амг|алюм|ак\\d|в95")) return 2.75;
  if (has("латун|л\\d|лс\\d")) return 8.5;
  if (has("бронз|бр")) return 8.8;
  if (has("медь|м[1-3](?![0-9])")) return 8.94;
  if (has("титан|вт\\d")) return 4.5;
  if (has("сч\\d|чугун|вч\\d")) return 7.2;
  if (has("капрол|полиамид|пэ|фторопл|пластм")) return 1.2;
  if (has("12х18|08х18|нерж|aisi\\s*3")) return 7.9;
  return 7.85;
}

const circ = (d: number) => (Math.PI * d * d) / 4;

/** Объём, мм³ */
export function volume(m: PartModel): number {
  if (m.kind === "shaft" && m.shaft) {
    const s = m.shaft;
    let v = s.sections.reduce((a, x) => a + circ(x.d) * x.l, 0);
    const L = totalLength(s);
    if (s.bore) v -= circ(s.bore.d) * (s.bore.l > 0 ? Math.min(s.bore.l, L) : L);
    v -= s.keyways.reduce((a, k) => a + k.b * k.l * k.t1, 0);
    return Math.max(v, 0);
  }
  if (m.kind === "disc" && m.disc) {
    const d = m.disc;
    let v = circ(d.D) * d.H;
    if (d.hub) v += circ(d.hub.d) * (d.hub.h - d.H);
    v -= circ(d.bore.d) * Math.max(d.H, d.hub?.h ?? 0);
    if (d.holes) v -= d.holes.n * circ(d.holes.d) * d.H;
    return Math.max(v, 0);
  }
  if (m.kind === "gear" && m.gear) {
    const g = m.gear, geo = gearGeometry(g);
    // тело до окружности впадин + зубья ≈ половина кольца между впадинами и вершинами
    let v = circ(geo.df) * g.b + 0.5 * (circ(geo.da) - circ(geo.df)) * g.b;
    if (g.web) {
      const inner = g.hub ? g.hub.d : g.bore.d;
      v -= (circ(g.web.d_rim) - circ(inner)) * (g.b - g.web.t);
      if (g.web.holes) v -= g.web.holes.n * circ(g.web.holes.d) * g.web.t;
    }
    if (g.hub) v += circ(g.hub.d) * Math.max(g.hub.h - g.b, 0);
    v -= circ(g.bore.d) * Math.max(g.b, g.hub?.h ?? 0);
    return Math.max(v, 0);
  }
  if (m.kind === "plate" && m.plate) {
    const p = m.plate;
    return Math.max(p.L * p.W * p.H - p.holes.reduce((a, h) => a + circ(h.d) * p.H, 0), 0);
  }
  return 0;
}

/** Масса, кг */
export const massKg = (m: PartModel) => round((volume(m) * density(m.material)) / 1e6, 3);

export const totalLength = (s: ShaftParams) => s.sections.reduce((a, x) => a + x.l, 0);

/** Габариты строкой — для карточки детали */
export function dimensions(m: PartModel): string {
  if (m.kind === "shaft" && m.shaft) return `∅${fmt(Math.max(...m.shaft.sections.map((x) => x.d)))}×${fmt(totalLength(m.shaft))}`;
  if (m.kind === "disc" && m.disc) return `∅${fmt(m.disc.D)}×${fmt(Math.max(m.disc.H, m.disc.hub?.h ?? 0))}`;
  if (m.kind === "gear" && m.gear) return `∅${fmt(gearGeometry(m.gear).da)}×${fmt(Math.max(m.gear.b, m.gear.hub?.h ?? 0))}`;
  if (m.kind === "plate" && m.plate) return `${fmt(m.plate.L)}×${fmt(m.plate.W)}×${fmt(m.plate.H)}`;
  return "";
}

export const KIND_LABEL: Record<PartKind, string> = { shaft: "Тело вращения (вал, ось, втулка)", disc: "Диск, фланец, крышка", plate: "Плита, планка, пластина", gear: "Колесо зубчатое цилиндрическое" };
export const CATEGORY: Record<PartKind, string> = { shaft: "Валы", disc: "Фланцы и диски", plate: "Плиты", gear: "Зубчатые колёса" };
