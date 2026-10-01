/**
 * Параметрическая модель детали — общий язык ИИ-конструктора, генератора чертежа и ИИ-технолога.
 * ИИ отвечает за инженерное содержание (размеры, допуски, требования),
 * геометрию чертежа строит программа — поэтому чертёж всегда точный и по ГОСТ.
 */

export type PartKind = "shaft" | "disc" | "plate";

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
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Число в русском формате без лишних нулей: 1.6 → «1,6» */
export const fmt = (v: number, d = 2): string => String(round(v, d)).replace(".", ",");

/* ── нормализация ответа ИИ ──────────────────────────────────────── */

export function normalizeModel(raw: unknown): Normalized {
  const w: string[] = [];
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  let kind = str(r.kind) as PartKind;
  if (!["shaft", "disc", "plate"].includes(kind)) {
    kind = r.shaft ? "shaft" : r.disc ? "disc" : r.plate ? "plate" : "shaft";
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
    shaft: null, disc: null, plate: null,
  };

  if (model.hardness) {
    const hv = model.hardness.replace(/\s/g, "").toLowerCase();
    model.requirements = model.requirements.filter((t) => !t.replace(/\s/g, "").toLowerCase().includes(hv));
  }

  if (kind === "shaft") model.shaft = normShaft(r.shaft, w);
  if (kind === "disc") model.disc = normDisc(r.disc, w);
  if (kind === "plate") model.plate = normPlate(r.plate, w);

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
    const i = Math.round(num(o.section, -1));
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
  if (m.kind === "plate" && m.plate) return `${fmt(m.plate.L)}×${fmt(m.plate.W)}×${fmt(m.plate.H)}`;
  return "";
}

export const KIND_LABEL: Record<PartKind, string> = { shaft: "Тело вращения (вал, ось, втулка)", disc: "Диск, фланец, крышка", plate: "Плита, планка, пластина" };
export const CATEGORY: Record<PartKind, string> = { shaft: "Валы", disc: "Фланцы и диски", plate: "Плиты" };
