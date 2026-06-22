/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * cad2d.blocks.ts — эталонная библиотека параметрических чертёжных блоков
 * (аналог блоков AutoCAD / стандартных изделий КОМПАС).
 *
 * Принцип «автомата Калашникова»: всё в коде, без БД.
 * Каждый блок — функция build(), возвращающая массив примитивов Fabric
 * в локальных координатах относительно точки (0,0). Хук вставки сам
 * сгруппирует, спозиционирует по центру вида и положит на активный слой.
 *
 * Единицы: 1 px ≈ 1 мм при zoom=1. Размеры — по ГОСТ/реальной геометрии.
 */
import { Line, Circle, Rect, Ellipse, Path, IText, Polygon } from "fabric";

export interface BlockPrimitive {
  obj: any;          // объект Fabric
}

export interface BlockDef {
  id: string;
  name: string;          // отображаемое имя
  category: string;      // раздел библиотеки
  standard?: string;     // ГОСТ/DIN/ISO
  tags?: string[];       // для поиска
  build: () => any[];    // фабрика примитивов Fabric
}

export const BLOCK_CATEGORIES = [
  "Крепёж",
  "Резьба и фаски",
  "Подшипники",
  "Профили проката",
  "Базовая геометрия",
  "Элементы валов",
  "Зубчатые колёса",
  "Обозначения",
  "Сварка и пайка",
  "Электросхемы",
  "Гидравлика и пневматика",
  "Сантехника и трубы",
  "Станок МАТ-1",
] as const;

// ── Утилиты построения ────────────────────────────────────────────
const COL = "#000000";
const THIN = 0.5;
const AXIS = "#dc2626";
const FONT = "Courier Prime, Courier New, monospace";

const ln = (x1: number, y1: number, x2: number, y2: number, w = 1, stroke = COL, dash?: number[]) =>
  new Line([x1, y1, x2, y2], { stroke, strokeWidth: w, fill: stroke, selectable: true, strokeDashArray: dash });

const rc = (x: number, y: number, w: number, h: number, sw = 1, fill = "transparent") =>
  new Rect({ left: x, top: y, width: w, height: h, stroke: COL, strokeWidth: sw, fill });

const ci = (cx: number, cy: number, r: number, sw = 1, fill = "transparent") =>
  new Circle({ left: cx - r, top: cy - r, radius: r, stroke: COL, strokeWidth: sw, fill });

const el = (cx: number, cy: number, rx: number, ry: number, sw = 1) =>
  new Ellipse({ left: cx - rx, top: cy - ry, rx, ry, stroke: COL, strokeWidth: sw, fill: "transparent" });

const pa = (d: string, sw = 1, fill = "transparent") =>
  new Path(d, { stroke: COL, strokeWidth: sw, fill, selectable: true });

const txt = (s: string, x: number, y: number, size = 9, fill = COL) =>
  new IText(s, { left: x, top: y, fontSize: size, fill, fontFamily: FONT, originX: "center", originY: "center" });

const poly = (pts: { x: number; y: number }[], sw = 1, fill = "transparent") =>
  new Polygon(pts, { stroke: COL, strokeWidth: sw, fill, selectable: true });

// осевая линия (штрихпунктир по ГОСТ 2.303 тип 04)
const axis = (x1: number, y1: number, x2: number, y2: number) =>
  new Line([x1, y1, x2, y2], { stroke: AXIS, strokeWidth: THIN, strokeDashArray: [8, 3, 2, 3], selectable: true });

// шестигранник по размеру «под ключ» S (диаметр вписанной окружности)
function hexPoints(cx: number, cy: number, S: number) {
  const R = S / Math.sqrt(3); // радиус описанной
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  }
  return pts;
}

// ── Генераторы семейств (параметрические) ─────────────────────────

/** Болт с шестигранной головкой, вид сверху + сбоку. M = диаметр резьбы. */
function bolt(M: number): () => any[] {
  return () => {
    const S = Math.round(M * 1.6);      // размер под ключ ≈ 1.6d
    const k = Math.round(M * 0.7);      // высота головки
    const len = M * 5;                  // длина стержня
    const r = M / 2;
    const objs: any[] = [];
    // Вид сбоку: головка + стержень
    objs.push(rc(0, -S / 2, k, S, 1));                       // головка
    objs.push(rc(k, -r, len, M, 0.8));                       // стержень
    // фаска торца
    objs.push(ln(k + len, -r, k + len - 2, -r + 2, 0.6));
    objs.push(ln(k + len, r, k + len - 2, r - 2, 0.6));
    // линии резьбы (тонкие)
    objs.push(ln(k, -r + 1, k + len, -r + 1, THIN));
    objs.push(ln(k, r - 1, k + len, r - 1, THIN));
    objs.push(axis(-4, 0, k + len + 4, 0));
    // Вид сверху: шестигранник
    const cyTop = S + 16;
    objs.push(poly(hexPoints(k / 2, cyTop, S), 1));
    objs.push(ci(k / 2, cyTop, r, THIN));
    objs.push(txt(`M${M}`, k / 2, cyTop + S / 2 + 8, 8));
    return objs;
  };
}

/** Гайка шестигранная, вид сверху + сбоку. */
function nut(M: number): () => any[] {
  return () => {
    const S = Math.round(M * 1.6);
    const h = Math.round(M * 0.8);
    const r = M / 2;
    const objs: any[] = [];
    // сбоку
    objs.push(rc(0, -S / 2, h, S, 1));
    objs.push(ln(0, -r, h, -r, THIN));
    objs.push(ln(0, r, h, r, THIN));
    objs.push(axis(-4, 0, h + 4, 0));
    // сверху — шестигранник + резьба
    const cy = S + 16;
    objs.push(poly(hexPoints(h / 2, cy, S), 1));
    objs.push(ci(h / 2, cy, r, 1));
    objs.push(ci(h / 2, cy, r - 1, THIN));
    objs.push(txt(`M${M}`, h / 2, cy + S / 2 + 8, 8));
    return objs;
  };
}

/** Шайба плоская, разрез + вид. */
function washer(M: number): () => any[] {
  return () => {
    const d = M + 1;
    const D = Math.round(M * 2.2);
    const s = Math.max(1, Math.round(M * 0.15)) + 1;
    const objs: any[] = [];
    // вид сверху
    const cy = 0;
    objs.push(ci(0, cy, D / 2, 1));
    objs.push(ci(0, cy, d / 2, 1));
    objs.push(axis(-D / 2 - 4, cy, D / 2 + 4, cy));
    objs.push(axis(0, -D / 2 - 4, 0, D / 2 + 4));
    // разрез
    const rx = D / 2 + 20;
    objs.push(rc(rx, -D / 2, s, (D - d) / 2, 1, "rgba(0,0,0,0.12)"));
    objs.push(rc(rx, d / 2, s, (D - d) / 2, 1, "rgba(0,0,0,0.12)"));
    objs.push(txt(`${M}`, 0, D / 2 + 10, 8));
    return objs;
  };
}

/** Винт с цилиндрической головкой и шлицем. */
function screwCyl(M: number): () => any[] {
  return () => {
    const dk = Math.round(M * 1.5);
    const k = Math.round(M * 0.6);
    const len = M * 4;
    const r = M / 2;
    const objs: any[] = [];
    objs.push(rc(0, -dk / 2, k, dk, 1));            // головка
    objs.push(ln(k / 2, -dk / 2, k / 2, -dk / 2 + 1.5, 1.2)); // шлиц (намёк)
    objs.push(rc(k, -r, len, M, 0.8));              // стержень
    objs.push(ln(k, -r + 1, k + len, -r + 1, THIN));
    objs.push(ln(k, r - 1, k + len, r - 1, THIN));
    objs.push(axis(-4, 0, k + len + 4, 0));
    objs.push(txt(`M${M}`, (k + len) / 2, dk / 2 + 8, 8));
    return objs;
  };
}

/** Подшипник шариковый радиальный (разрез по ГОСТ 520). d-вн, D-нар, B-ширина. */
function bearing(d: number, D: number, B: number): () => any[] {
  return () => {
    const objs: any[] = [];
    const ri = d / 2, ro = D / 2;
    const ringT = (ro - ri) * 0.28;
    // верхняя половина (разрез) — наружное и внутреннее кольцо
    objs.push(rc(-B / 2, -ro, B, ringT, 1, "rgba(0,0,0,0.1)"));            // наружное верх
    objs.push(rc(-B / 2, ro - ringT, B, ringT, 1, "rgba(0,0,0,0.1)"));    // наружное низ
    objs.push(rc(-B / 2, -ri - ringT, B, ringT, 1, "rgba(0,0,0,0.1)"));   // внутреннее верх
    objs.push(rc(-B / 2, ri, B, ringT, 1, "rgba(0,0,0,0.1)"));            // внутреннее низ
    // шарики
    const br = (ro - ri) / 2 - ringT * 0.4;
    const rm = (ro + ri) / 2;
    objs.push(ci(0, -rm, Math.max(2, br), 1));
    objs.push(ci(0, rm, Math.max(2, br), 1));
    objs.push(axis(-B / 2 - 6, 0, B / 2 + 6, 0));
    objs.push(txt(`⌀${d}×⌀${D}×${B}`, 0, ro + 12, 8));
    return objs;
  };
}

/** Двутавр (ГОСТ 8239) по высоте профиля h. */
function ibeam(h: number): () => any[] {
  return () => {
    const b = Math.round(h * 0.55);
    const t = Math.max(2, Math.round(h * 0.06));   // полка
    const s = Math.max(1.5, Math.round(h * 0.04)); // стенка
    const objs: any[] = [];
    objs.push(rc(-b / 2, -h / 2, b, t, 1, "rgba(0,0,0,0.08)"));        // верх полка
    objs.push(rc(-b / 2, h / 2 - t, b, t, 1, "rgba(0,0,0,0.08)"));     // низ полка
    objs.push(rc(-s / 2, -h / 2 + t, s, h - 2 * t, 1, "rgba(0,0,0,0.08)")); // стенка
    objs.push(txt(`I${Math.round(h / 10)}`, 0, h / 2 + 10, 8));
    return objs;
  };
}

/** Швеллер (ГОСТ 8240) по высоте h. */
function channel(h: number): () => any[] {
  return () => {
    const b = Math.round(h * 0.4);
    const t = Math.max(2, Math.round(h * 0.07));
    const s = Math.max(1.5, Math.round(h * 0.045));
    const objs: any[] = [];
    objs.push(rc(0, -h / 2, b, t, 1, "rgba(0,0,0,0.08)"));
    objs.push(rc(0, h / 2 - t, b, t, 1, "rgba(0,0,0,0.08)"));
    objs.push(rc(0, -h / 2, s, h, 1, "rgba(0,0,0,0.08)"));
    objs.push(txt(`[${Math.round(h / 10)}`, b / 2, h / 2 + 10, 8));
    return objs;
  };
}

/** Уголок равнополочный (ГОСТ 8509) со стороной a. */
function angle(a: number): () => any[] {
  return () => {
    const t = Math.max(2, Math.round(a * 0.1));
    const objs: any[] = [];
    objs.push(poly([
      { x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: t },
      { x: t, y: t }, { x: t, y: a }, { x: 0, y: a },
    ], 1, "rgba(0,0,0,0.08)"));
    objs.push(txt(`L${a}×${t}`, a / 2, a + 10, 8));
    return objs;
  };
}

/** Труба круглая в разрезе: наружный Ø и стенка. */
function pipe(D: number, wall: number): () => any[] {
  return () => {
    const objs: any[] = [];
    objs.push(ci(0, 0, D / 2, 1, "rgba(0,0,0,0.06)"));
    objs.push(ci(0, 0, D / 2 - wall, 1, "#fff"));
    objs.push(axis(-D / 2 - 5, 0, D / 2 + 5, 0));
    objs.push(axis(0, -D / 2 - 5, 0, D / 2 + 5));
    objs.push(txt(`⌀${D}×${wall}`, 0, D / 2 + 12, 8));
    return objs;
  };
}

/** Зубчатое колесо (упрощённо): делительная окружность + зубья-насечки. z-зубьев, m-модуль. */
function gear(z: number, m: number): () => any[] {
  return () => {
    const d = z * m;            // делительный
    const da = d + 2 * m;       // вершин
    const df = d - 2.5 * m;     // впадин
    const objs: any[] = [];
    objs.push(ci(0, 0, da / 2, 1));
    objs.push(ci(0, 0, d / 2, THIN, "transparent"));
    (objs[objs.length - 1] as any).strokeDashArray = [6, 3];
    objs.push(ci(0, 0, df / 2, THIN));
    objs.push(ci(0, 0, da / 6, 1));   // ступица отверстие
    objs.push(axis(-da / 2 - 4, 0, da / 2 + 4, 0));
    objs.push(axis(0, -da / 2 - 4, 0, da / 2 + 4));
    objs.push(txt(`z=${z} m=${m}`, 0, da / 2 + 12, 8));
    return objs;
  };
}

// ── СБОРКА КАТАЛОГА ───────────────────────────────────────────────
const blocks: BlockDef[] = [];
const add = (b: BlockDef) => blocks.push(b);

// 1) КРЕПЁЖ — болты, гайки, шайбы, винты
const M_SERIES = [4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 30, 36, 42, 48];
M_SERIES.forEach((M) => {
  add({ id: `bolt-m${M}`, name: `Болт M${M}`, category: "Крепёж", standard: "ГОСТ 7798-70", tags: ["болт", "bolt", `m${M}`], build: bolt(M) });
  add({ id: `nut-m${M}`,  name: `Гайка M${M}`, category: "Крепёж", standard: "ГОСТ 5915-70", tags: ["гайка", "nut", `m${M}`], build: nut(M) });
  add({ id: `washer-m${M}`, name: `Шайба ${M}`, category: "Крепёж", standard: "ГОСТ 11371-78", tags: ["шайба", "washer", `m${M}`], build: washer(M) });
});
[4, 5, 6, 8, 10, 12, 16, 20].forEach((M) =>
  add({ id: `screw-m${M}`, name: `Винт M${M} цил.`, category: "Крепёж", standard: "ГОСТ 1491-80", tags: ["винт", "screw", `m${M}`], build: screwCyl(M) })
);

// 2) РЕЗЬБА И ФАСКИ
add({ id: "thread-ext", name: "Резьба наружная", category: "Резьба и фаски", standard: "ГОСТ 2.311", tags: ["резьба", "thread"], build: () => [
  rc(0, -12, 60, 24, 1), ln(0, -10, 60, -10, THIN), ln(0, 10, 60, 10, THIN), axis(-4, 0, 64, 0), txt("M○", 30, 18, 8),
]});
add({ id: "thread-int", name: "Резьба внутренняя", category: "Резьба и фаски", standard: "ГОСТ 2.311", tags: ["резьба", "thread", "отверстие"], build: () => [
  rc(0, -12, 60, 24, THIN), rc(0, -14, 60, 28, 1), axis(-4, 0, 64, 0),
]});
add({ id: "chamfer-45", name: "Фаска 45°", category: "Резьба и фаски", standard: "ГОСТ 2.307", tags: ["фаска", "chamfer"], build: () => [
  ln(0, 0, 40, 0, 1), ln(40, 0, 40, 40, 1), ln(40, 0, 30, 10, 1), txt("1×45°", 50, 6, 8),
]});
add({ id: "fillet-r", name: "Скругление R", category: "Резьба и фаски", standard: "ГОСТ 2.307", tags: ["скругление", "fillet", "радиус"], build: () => [
  pa("M 0 0 L 30 0 A 12 12 0 0 1 42 12 L 42 40", 1), txt("R12", 26, 18, 8),
]});
add({ id: "knurl", name: "Накатка прямая", category: "Резьба и фаски", standard: "ГОСТ 21474", tags: ["накатка", "рифление"], build: () => {
  const o: any[] = [rc(0, -12, 50, 24, 1)];
  for (let i = 4; i < 50; i += 4) o.push(ln(i, -12, i, 12, THIN));
  return o;
}});
add({ id: "centering", name: "Центровое отв. A", category: "Резьба и фаски", standard: "ГОСТ 14034", tags: ["центровое", "отверстие"], build: () => [
  pa("M 0 -6 L 10 -3 L 10 3 L 0 6", 1), pa("M 0 -3 L 14 -3 L 14 3 L 0 3 Z", 0.8, "transparent"), axis(-4, 0, 18, 0),
]});

// 3) ПОДШИПНИКИ (d×D×B по типоразмерам)
([
  [10, 30, 9, "6200"], [12, 32, 10, "6201"], [15, 35, 11, "6202"], [17, 40, 12, "6203"],
  [20, 47, 14, "6204"], [25, 52, 15, "6205"], [30, 62, 16, "6206"], [35, 72, 17, "6207"],
  [40, 80, 18, "6208"], [45, 85, 19, "6209"], [50, 90, 20, "6210"], [55, 100, 21, "6211"],
  [60, 110, 22, "6212"], [70, 125, 24, "6214"], [80, 140, 26, "6216"], [100, 180, 34, "6220"],
] as [number, number, number, string][]).forEach(([d, D, B, name]) =>
  add({ id: `bearing-${name}`, name: `Подшипник ${name}`, category: "Подшипники", standard: "ГОСТ 8338-75", tags: ["подшипник", "bearing", name], build: bearing(d, D, B) })
);

// 4) ПРОФИЛИ ПРОКАТА
[10, 12, 14, 16, 18, 20, 24, 30, 36, 45].forEach((n) =>
  add({ id: `ibeam-${n}`, name: `Двутавр №${n}`, category: "Профили проката", standard: "ГОСТ 8239-89", tags: ["двутавр", "балка", "i-beam"], build: ibeam(n * 10) })
);
[5, 8, 10, 12, 16, 20, 24, 30, 40].forEach((n) =>
  add({ id: `channel-${n}`, name: `Швеллер №${n}`, category: "Профили проката", standard: "ГОСТ 8240-97", tags: ["швеллер", "channel"], build: channel(n * 10) })
);
[20, 25, 32, 40, 50, 63, 75, 90, 100, 125, 160].forEach((a) =>
  add({ id: `angle-${a}`, name: `Уголок ${a}`, category: "Профили проката", standard: "ГОСТ 8509-93", tags: ["уголок", "angle"], build: angle(a) })
);
[20, 25, 30, 40, 50, 60].forEach((s) =>
  add({ id: `square-${s}`, name: `Квадрат ${s}`, category: "Профили проката", standard: "ГОСТ 2591-2006", tags: ["квадрат", "пруток"], build: () => [rc(-s / 2, -s / 2, s, s, 1, "rgba(0,0,0,0.08)"), txt(`□${s}`, 0, s / 2 + 10, 8)] })
);
[10, 16, 20, 25, 32, 40, 50, 63, 80].forEach((d) =>
  add({ id: `round-${d}`, name: `Круг ⌀${d}`, category: "Профили проката", standard: "ГОСТ 2590-2006", tags: ["круг", "пруток"], build: () => [ci(0, 0, d / 2, 1, "rgba(0,0,0,0.08)"), axis(-d / 2 - 4, 0, d / 2 + 4, 0), txt(`⌀${d}`, 0, d / 2 + 10, 8)] })
);

// 5) БАЗОВАЯ ГЕОМЕТРИЯ
add({ id: "geo-rect", name: "Прямоугольник 100×60", category: "Базовая геометрия", tags: ["прямоугольник"], build: () => [rc(0, 0, 100, 60, 1)] });
add({ id: "geo-square", name: "Квадрат 60", category: "Базовая геометрия", tags: ["квадрат"], build: () => [rc(0, 0, 60, 60, 1)] });
add({ id: "geo-circle", name: "Окружность ⌀60", category: "Базовая геометрия", tags: ["окружность", "круг"], build: () => [ci(0, 0, 30, 1), axis(-36, 0, 36, 0), axis(0, -36, 0, 36)] });
add({ id: "geo-ellipse", name: "Эллипс 80×50", category: "Базовая геометрия", tags: ["эллипс"], build: () => [el(0, 0, 40, 25, 1)] });
add({ id: "geo-tri", name: "Треугольник", category: "Базовая геометрия", tags: ["треугольник"], build: () => [poly([{ x: 0, y: 50 }, { x: 60, y: 50 }, { x: 30, y: 0 }], 1)] });
add({ id: "geo-pent", name: "Пятиугольник", category: "Базовая геометрия", tags: ["пятиугольник"], build: () => { const p: { x: number; y: number }[] = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; p.push({ x: 35 * Math.cos(a), y: 35 * Math.sin(a) }); } return [poly(p, 1)]; } });
add({ id: "geo-hex", name: "Шестиугольник", category: "Базовая геометрия", tags: ["шестиугольник", "шестигранник"], build: () => [poly(hexPoints(0, 0, 60), 1)] });
add({ id: "geo-slot", name: "Паз (овал) 80×30", category: "Базовая геометрия", tags: ["паз", "овал"], build: () => [pa("M 15 0 L 65 0 A 15 15 0 0 1 65 30 L 15 30 A 15 15 0 0 1 15 0 Z", 1)] });
add({ id: "geo-rrect", name: "Скруглён. прям-к", category: "Базовая геометрия", tags: ["скруглённый"], build: () => [pa("M 10 0 L 90 0 A 10 10 0 0 1 100 10 L 100 50 A 10 10 0 0 1 90 60 L 10 60 A 10 10 0 0 1 0 50 L 0 10 A 10 10 0 0 1 10 0 Z", 1)] });
add({ id: "geo-arc", name: "Дуга 90°", category: "Базовая геометрия", tags: ["дуга"], build: () => [pa("M 0 40 A 40 40 0 0 1 40 0", 1)] });
add({ id: "geo-cross", name: "Крестовина", category: "Базовая геометрия", tags: ["крест"], build: () => [poly([{ x: 20, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }, { x: 60, y: 20 }, { x: 60, y: 40 }, { x: 40, y: 40 }, { x: 40, y: 60 }, { x: 20, y: 60 }, { x: 20, y: 40 }, { x: 0, y: 40 }, { x: 0, y: 20 }, { x: 20, y: 20 }], 1)] });
add({ id: "geo-star", name: "Звезда", category: "Базовая геометрия", tags: ["звезда"], build: () => { const p: { x: number; y: number }[] = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 36; const a = -Math.PI / 2 + (i * Math.PI) / 5; p.push({ x: r * Math.cos(a), y: r * Math.sin(a) }); } return [poly(p, 1)]; } });

// 6) ЭЛЕМЕНТЫ ВАЛОВ
add({ id: "shaft-step", name: "Вал ступенчатый", category: "Элементы валов", standard: "ГОСТ 2.305", tags: ["вал", "ступень"], build: () => [
  rc(0, -15, 40, 30, 1), rc(40, -20, 60, 40, 1), rc(100, -12, 40, 24, 1), axis(-4, 0, 144, 0),
]});
add({ id: "shaft-keyway", name: "Шпоночный паз", category: "Элементы валов", standard: "ГОСТ 23360", tags: ["шпонка", "паз"], build: () => [
  rc(0, -16, 90, 32, 1), pa("M 20 -8 L 70 -8 A 6 6 0 0 1 70 4 L 20 4 A 6 6 0 0 1 20 -8 Z", 0.8), axis(-4, 0, 94, 0),
]});
add({ id: "shaft-spline", name: "Шлицевой вал", category: "Элементы валов", standard: "ГОСТ 1139", tags: ["шлиц", "вал"], build: () => { const o: any[] = [ci(0, 0, 30, 1), ci(0, 0, 24, THIN)]; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; o.push(rc(-2, -30, 4, 6)); (o[o.length - 1] as any).set({ angle: (a * 180) / Math.PI }); } o.push(axis(-36, 0, 36, 0), axis(0, -36, 0, 36)); return o; } });
add({ id: "shaft-groove", name: "Канавка для выхода", category: "Элементы валов", standard: "ГОСТ 8820", tags: ["канавка", "проточка"], build: () => [
  rc(0, -15, 30, 30, 1), rc(30, -15, 6, 4, 0.8), rc(36, -15, 40, 30, 1), axis(-4, 0, 80, 0),
]});
add({ id: "shaft-cone", name: "Конус Морзе", category: "Элементы валов", standard: "ГОСТ 2848", tags: ["конус", "морзе"], build: () => [
  poly([{ x: 0, y: -18 }, { x: 80, y: -10 }, { x: 80, y: 10 }, { x: 0, y: 18 }], 1), axis(-4, 0, 84, 0),
]});
add({ id: "retaining-ring", name: "Стопорное кольцо", category: "Элементы валов", standard: "ГОСТ 13942", tags: ["кольцо", "стопорное"], build: () => [
  pa("M 28 -10 A 30 30 0 1 0 28 10", 1.4), ci(34, -10, 2, 1), ci(34, 10, 2, 1), axis(-36, 0, 36, 0),
]});

// 7) ЗУБЧАТЫЕ КОЛЁСА
([
  [18, 2], [20, 2], [24, 2.5], [30, 3], [40, 3], [50, 4], [60, 5], [72, 4],
] as [number, number][]).forEach(([z, m]) =>
  add({ id: `gear-z${z}-m${m}`, name: `Колесо z${z} m${m}`, category: "Зубчатые колёса", standard: "ГОСТ 13755", tags: ["шестерня", "колесо", "gear"], build: gear(z, m) })
);
add({ id: "rack", name: "Зубчатая рейка", category: "Зубчатые колёса", standard: "ГОСТ 13755", tags: ["рейка"], build: () => { const o: any[] = [ln(0, 20, 120, 20, 1)]; for (let i = 0; i < 110; i += 14) o.push(pa(`M ${i} 20 L ${i + 4} 8 L ${i + 10} 8 L ${i + 14} 20`, 1)); return o; } });
add({ id: "sprocket", name: "Звёздочка цепная", category: "Зубчатые колёса", standard: "ГОСТ 591", tags: ["звёздочка", "цепь"], build: () => { const o: any[] = [ci(0, 0, 40, THIN), ci(0, 0, 12, 1)]; for (let i = 0; i < 16; i++) { const a = (i * 2 * Math.PI) / 16; o.push(ci(40 * Math.cos(a), 40 * Math.sin(a), 3, 1)); } o.push(axis(-46, 0, 46, 0), axis(0, -46, 0, 46)); return o; } });

// 8) ОБОЗНАЧЕНИЯ
add({ id: "sign-rough", name: "Шероховатость Ra", category: "Обозначения", standard: "ГОСТ 2.309", tags: ["шероховатость", "ra"], build: () => [pa("M 0 0 L 8 12 L 16 -8", 1), ln(16, -8, 30, -8, 1), txt("Ra 3.2", 24, -14, 8)] });
add({ id: "sign-weld", name: "Знак сварки", category: "Обозначения", standard: "ГОСТ 2.312", tags: ["сварка"], build: () => [ln(0, 0, 30, 0, 1), pa("M 30 0 L 38 -6 L 38 6 Z", 1, COL), ln(38, 0, 60, 0, 1)] });
add({ id: "sign-base", name: "База (треугольник)", category: "Обозначения", standard: "ГОСТ 2.308", tags: ["база", "допуск"], build: () => [poly([{ x: 0, y: 0 }, { x: 8, y: 12 }, { x: -8, y: 12 }], 1, COL), ln(0, 12, 0, 22, 1), rc(-6, 22, 12, 12, 1), txt("А", 0, 28, 9)] });
add({ id: "sign-tol", name: "Рамка допуска формы", category: "Обозначения", standard: "ГОСТ 2.308", tags: ["допуск", "форма"], build: () => [rc(0, 0, 18, 14, 1), rc(18, 0, 30, 14, 1), txt("⌖", 9, 7, 9), txt("0.05", 33, 7, 8)] });
add({ id: "sign-section", name: "Линия сечения А-А", category: "Обозначения", standard: "ГОСТ 2.305", tags: ["сечение", "разрез"], build: () => [ln(0, 0, 14, 0, 2), ln(14, 0, 14, 12, 1.4), pa("M 14 12 L 8 8 L 8 16 Z", 1, COL), txt("А", 4, -8, 9)] });
add({ id: "sign-arrow", name: "Стрелка вида", category: "Обозначения", standard: "ГОСТ 2.305", tags: ["стрелка", "вид"], build: () => [ln(0, 0, 36, 0, 1), pa("M 0 0 L 10 -5 L 10 5 Z", 1, COL), txt("Б", 36, -8, 9)] });
add({ id: "sign-balloon", name: "Позиция (выноска)", category: "Обозначения", standard: "ГОСТ 2.109", tags: ["позиция", "номер"], build: () => [ln(0, 0, 24, -24, 1), pa("M 0 0 L 6 -2 L 4 -6 Z", 1, COL), ci(30, -30, 8, 1), txt("1", 30, -30, 9)] });
add({ id: "sign-centermark", name: "Центровое перекрестие", category: "Обозначения", standard: "ГОСТ 2.303", tags: ["центр", "ось"], build: () => [axis(-20, 0, 20, 0), axis(0, -20, 0, 20)] });

// 9) СВАРКА И ПАЙКА
add({ id: "weld-fillet", name: "Шов угловой", category: "Сварка и пайка", standard: "ГОСТ 5264", tags: ["сварка", "шов"], build: () => [ln(0, 0, 60, 0, 1.5), poly([{ x: 10, y: 0 }, { x: 14, y: -8 }, { x: 18, y: 0 }], 1, "rgba(0,0,0,0.15)"), poly([{ x: 22, y: 0 }, { x: 26, y: -8 }, { x: 30, y: 0 }], 1, "rgba(0,0,0,0.15)")] });
add({ id: "weld-butt", name: "Шов стыковой", category: "Сварка и пайка", standard: "ГОСТ 5264", tags: ["сварка", "стык"], build: () => [rc(0, -10, 30, 20, 1), rc(34, -10, 30, 20, 1), rc(30, -10, 4, 20, 1, "rgba(0,0,0,0.2)")] });
add({ id: "weld-spot", name: "Точечная сварка", category: "Сварка и пайка", standard: "ГОСТ 15878", tags: ["сварка", "точка"], build: () => { const o: any[] = [rc(0, -8, 80, 16, 1)]; for (let i = 12; i < 75; i += 18) o.push(ci(i, 0, 3, 1, "rgba(0,0,0,0.2)")); return o; } });
add({ id: "solder", name: "Пайка", category: "Сварка и пайка", standard: "ГОСТ 19249", tags: ["пайка"], build: () => [rc(0, -8, 60, 16, 1), pa("M 0 -8 Q 30 -16 60 -8", 1, "rgba(0,0,0,0.1)")] });

// 10) ЭЛЕКТРОСХЕМЫ (ГОСТ 2.721+)
add({ id: "el-res", name: "Резистор", category: "Электросхемы", standard: "ГОСТ 2.728", tags: ["резистор", "r"], build: () => [ln(0, 0, 10, 0, 1), rc(10, -5, 30, 10, 1), ln(40, 0, 50, 0, 1)] });
add({ id: "el-cap", name: "Конденсатор", category: "Электросхемы", standard: "ГОСТ 2.728", tags: ["конденсатор", "c"], build: () => [ln(0, 0, 22, 0, 1), ln(22, -10, 22, 10, 1.5), ln(28, -10, 28, 10, 1.5), ln(28, 0, 50, 0, 1)] });
add({ id: "el-ind", name: "Катушка индукт.", category: "Электросхемы", standard: "ГОСТ 2.723", tags: ["катушка", "l"], build: () => [ln(0, 0, 8, 0, 1), pa("M 8 0 A 6 6 0 1 1 20 0 A 6 6 0 1 1 32 0 A 6 6 0 1 1 44 0", 1), ln(44, 0, 52, 0, 1)] });
add({ id: "el-diode", name: "Диод", category: "Электросхемы", standard: "ГОСТ 2.730", tags: ["диод"], build: () => [ln(0, 0, 14, 0, 1), poly([{ x: 14, y: -8 }, { x: 14, y: 8 }, { x: 28, y: 0 }], 1, COL), ln(28, -8, 28, 8, 1.5), ln(28, 0, 42, 0, 1)] });
add({ id: "el-gnd", name: "Земля", category: "Электросхемы", standard: "ГОСТ 2.721", tags: ["земля", "gnd"], build: () => [ln(0, 0, 0, 14, 1), ln(-12, 14, 12, 14, 1.5), ln(-8, 19, 8, 19, 1.5), ln(-4, 24, 4, 24, 1.5)] });
add({ id: "el-switch", name: "Выключатель", category: "Электросхемы", standard: "ГОСТ 2.755", tags: ["выключатель", "ключ"], build: () => [ln(0, 0, 14, 0, 1), ln(14, 0, 34, -12, 1), ci(14, 0, 2, 1, COL), ci(38, 0, 2, 1, COL), ln(40, 0, 52, 0, 1)] });
add({ id: "el-source", name: "Источник питания", category: "Электросхемы", standard: "ГОСТ 2.742", tags: ["источник", "батарея"], build: () => [ln(0, 0, 18, 0, 1), ln(18, -12, 18, 12, 1.5), ln(24, -6, 24, 6, 1), ln(24, 0, 42, 0, 1)] });
add({ id: "el-lamp", name: "Лампа", category: "Электросхемы", standard: "ГОСТ 2.732", tags: ["лампа"], build: () => [ln(0, 0, 12, 0, 1), ci(24, 0, 12, 1), ln(15, -9, 33, 9, 1), ln(15, 9, 33, -9, 1), ln(36, 0, 48, 0, 1)] });

// 11) ГИДРАВЛИКА И ПНЕВМАТИКА (ГОСТ 2.781)
add({ id: "hy-pump", name: "Насос", category: "Гидравлика и пневматика", standard: "ГОСТ 2.782", tags: ["насос"], build: () => [ci(0, 0, 18, 1), poly([{ x: 0, y: -18 }, { x: -5, y: -10 }, { x: 5, y: -10 }], 1, COL)] });
add({ id: "hy-valve", name: "Клапан", category: "Гидравлика и пневматика", standard: "ГОСТ 2.781", tags: ["клапан"], build: () => [poly([{ x: 0, y: -10 }, { x: 0, y: 10 }, { x: 20, y: 0 }], 1), poly([{ x: 40, y: -10 }, { x: 40, y: 10 }, { x: 20, y: 0 }], 1)] });
add({ id: "hy-cyl", name: "Гидроцилиндр", category: "Гидравлика и пневматика", standard: "ГОСТ 2.781", tags: ["цилиндр"], build: () => [rc(0, -16, 70, 32, 1), ln(35, 0, 90, 0, 2), rc(28, -14, 6, 28, 1)] });
add({ id: "hy-filter", name: "Фильтр", category: "Гидравлика и пневматика", standard: "ГОСТ 2.781", tags: ["фильтр"], build: () => [poly([{ x: 0, y: -14 }, { x: 28, y: -14 }, { x: 28, y: 14 }, { x: 0, y: 14 }], 1), ln(14, -14, 14, 14, 0.5, COL, [3, 3])] });
add({ id: "hy-tank", name: "Бак", category: "Гидравлика и пневматика", standard: "ГОСТ 2.780", tags: ["бак", "резервуар"], build: () => [ln(0, 0, 0, 30, 1), ln(20, 0, 20, 30, 1), ln(-6, 30, 26, 30, 1)] });
add({ id: "hy-manometer", name: "Манометр", category: "Гидравлика и пневматика", standard: "ГОСТ 2.729", tags: ["манометр", "давление"], build: () => [ci(0, 0, 16, 1), ln(0, 16, 0, 28, 1), ln(0, 0, 8, -10, 1)] });

// 12) САНТЕХНИКА И ТРУБЫ
([
  [57, 3.5], [76, 4], [89, 4], [108, 4], [133, 4.5], [159, 4.5], [219, 6], [273, 7],
] as [number, number][]).forEach(([D, w]) =>
  add({ id: `pipe-${D}`, name: `Труба ⌀${D}×${w}`, category: "Сантехника и трубы", standard: "ГОСТ 8732-78", tags: ["труба", "pipe", `${D}`], build: pipe(D, w) })
);
add({ id: "fit-elbow", name: "Отвод 90°", category: "Сантехника и трубы", standard: "ГОСТ 17375", tags: ["отвод", "колено"], build: () => [pa("M 0 0 L 0 30 A 30 30 0 0 0 30 60 L 60 60", 1.5), pa("M 16 0 L 16 28 A 14 14 0 0 0 30 42 L 60 42", 0.8)] });
add({ id: "fit-tee", name: "Тройник", category: "Сантехника и трубы", standard: "ГОСТ 17376", tags: ["тройник"], build: () => [ln(0, 0, 80, 0, 1.5), ln(0, 16, 80, 16, 1.5), ln(32, 16, 32, 50, 1.5), ln(48, 16, 48, 50, 1.5)] });
add({ id: "fit-flange", name: "Фланец", category: "Сантехника и трубы", standard: "ГОСТ 12820", tags: ["фланец"], build: () => { const o: any[] = [ci(0, 0, 40, 1), ci(0, 0, 16, 1)]; for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2; o.push(ci(30 * Math.cos(a), 30 * Math.sin(a), 3, 1)); } o.push(axis(-46, 0, 46, 0), axis(0, -46, 0, 46)); return o; } });
add({ id: "fit-valve-gate", name: "Задвижка", category: "Сантехника и трубы", standard: "ГОСТ 2.780", tags: ["задвижка", "вентиль"], build: () => [poly([{ x: 0, y: -12 }, { x: 0, y: 12 }, { x: 20, y: 0 }], 1), poly([{ x: 40, y: -12 }, { x: 40, y: 12 }, { x: 20, y: 0 }], 1), ln(20, 0, 20, -20, 1), ln(10, -20, 30, -20, 1.5)] });
add({ id: "fit-reducer", name: "Переход (конус)", category: "Сантехника и трубы", standard: "ГОСТ 17378", tags: ["переход", "редуктор"], build: () => [poly([{ x: 0, y: -20 }, { x: 0, y: 20 }, { x: 50, y: 12 }, { x: 50, y: -12 }], 1), axis(-4, 0, 54, 0)] });

// 13) СТАНОК МАТ-1 — габаритный чертёж (масштаб 1:10, 1px = 10мм)
// Габариты станка: 1100×750×950 мм. Рабочая зона X500×Y300×Z250.
// Простой линейный размер для габаритных видов (горизонтальный/вертикальный).
const DIMC = "#1e40af";
function dimH(x1: number, x2: number, y: number, label: string): any[] {
  return [
    ln(x1, y - 3, x1, y + 3, THIN, DIMC), ln(x2, y - 3, x2, y + 3, THIN, DIMC),
    ln(x1, y, x2, y, THIN, DIMC),
    pa(`M ${x1} ${y} L ${x1 + 4} ${y - 2} L ${x1 + 4} ${y + 2} Z`, THIN, DIMC),
    pa(`M ${x2} ${y} L ${x2 - 4} ${y - 2} L ${x2 - 4} ${y + 2} Z`, THIN, DIMC),
    txt(label, (x1 + x2) / 2, y - 6, 7, DIMC),
  ];
}
function dimV(y1: number, y2: number, x: number, label: string): any[] {
  return [
    ln(x - 3, y1, x + 3, y1, THIN, DIMC), ln(x - 3, y2, x + 3, y2, THIN, DIMC),
    ln(x, y1, x, y2, THIN, DIMC),
    pa(`M ${x} ${y1} L ${x - 2} ${y1 + 4} L ${x + 2} ${y1 + 4} Z`, THIN, DIMC),
    pa(`M ${x} ${y2} L ${x - 2} ${y2 - 4} L ${x + 2} ${y2 - 4} Z`, THIN, DIMC),
    txt(label, x - 9, (y1 + y2) / 2, 7, DIMC),
  ];
}

// Вид спереди: станина + станок 1100(Д)×950(В)
function mat1Front(): any[] {
  const W = 110, H = 95;                    // 1100×950 мм / 10
  const o: any[] = [];
  o.push(rc(0, 24, W, H - 24, 1.2));        // корпус-станина
  o.push(rc(6, 30, W - 12, 38, 0.8));       // рабочая зона (защитный экран)
  o.push(ln(6, 30, W - 6, 30, THIN, AXIS, [6, 3])); // граница рабочей зоны
  // Z-колонна с фрезерной/лазерной головкой
  o.push(rc(70, 0, 14, 30, 1));             // колонна Z
  o.push(rc(68, 28, 18, 10, 1, "rgba(99,102,241,0.25)")); // фрезерная головка (индиго)
  o.push(rc(76, 38, 2, 8, 1));              // инструмент
  // Токарный шпиндель слева (синий)
  o.push(rc(8, 40, 16, 14, 1, "rgba(37,99,235,0.25)"));
  o.push(ci(28, 47, 4, 1));                 // патрон
  // ЧПУ-шкаф справа (зелёный) + экран
  o.push(rc(W - 4, 30, 18, 40, 1, "rgba(22,163,74,0.2)"));
  o.push(rc(W, 34, 10, 7, 0.8));            // сенсорный экран
  // опоры
  o.push(rc(4, H, 8, 4, 1)); o.push(rc(W - 12, H, 8, 4, 1));
  // размеры
  o.push(...dimH(0, W, H + 12, "1100"));
  o.push(...dimV(24, H, -10, "950"));
  o.push(txt("МАТ-1 · вид спереди", W / 2, -10, 8));
  return o;
}

// Вид сверху: 1100(Д)×750(Ш) + рабочий стол и ходы осей
function mat1Top(): any[] {
  const W = 110, D = 75;                    // 1100×750 / 10
  const o: any[] = [];
  o.push(rc(0, 0, W, D, 1.2));              // габарит стола
  o.push(rc(20, 15, 50, 30, 0.8));          // рабочая зона X500×Y300 / 10
  o.push(axis(0, D / 2, W, D / 2));         // ось X
  o.push(axis(45, 0, 45, D));               // ось Y
  o.push(ci(15, D / 2, 5, 1));              // токарный патрон
  o.push(rc(72, 20, 16, 35, 0.8, "rgba(22,163,74,0.15)")); // ЧПУ
  o.push(...dimH(20, 70, -8, "500"));       // ход X
  o.push(...dimV(15, 45, W + 10, "300"));   // ход Y
  o.push(...dimH(0, W, D + 12, "1100"));
  o.push(...dimV(0, D, -10, "750"));
  o.push(txt("вид сверху · раб. зона X500×Y300", W / 2, -16, 7));
  return o;
}

// Вид сбоку: 750(Ш)×950(В) + ход Z
function mat1Side(): any[] {
  const D = 75, H = 95;
  const o: any[] = [];
  o.push(rc(0, 24, D, H - 24, 1.2));
  o.push(rc(30, 0, 14, 30, 1));             // колонна Z
  o.push(rc(28, 28, 18, 10, 1, "rgba(249,115,22,0.25)")); // лазерная головка (оранж)
  o.push(...dimV(0, 30, -10, "250"));       // ход Z
  o.push(...dimH(0, D, H + 12, "750"));
  o.push(...dimV(24, H, D + 10, "950"));
  o.push(txt("вид сбоку · ход Z250", D / 2, -10, 7));
  return o;
}

add({ id: "mat1-front", name: "МАТ-1 вид спереди", category: "Станок МАТ-1", standard: "Габарит 1100×950", tags: ["мат-1", "mat1", "станок", "вид", "спереди"], build: mat1Front });
add({ id: "mat1-top",   name: "МАТ-1 вид сверху",  category: "Станок МАТ-1", standard: "Габарит 1100×750", tags: ["мат-1", "mat1", "станок", "вид", "сверху"], build: mat1Top });
add({ id: "mat1-side",  name: "МАТ-1 вид сбоку",   category: "Станок МАТ-1", standard: "Габарит 750×950",  tags: ["мат-1", "mat1", "станок", "вид", "сбоку"], build: mat1Side });
add({ id: "mat1-all", name: "МАТ-1 габаритный (3 вида)", category: "Станок МАТ-1", standard: "1100×750×950", tags: ["мат-1", "mat1", "станок", "габарит", "чертёж", "гибридный"], build: () => {
  const o: any[] = [];
  mat1Front().forEach((e) => o.push(e));
  mat1Top().forEach((e) => { e.set?.({ left: (e.left ?? 0), top: (e.top ?? 0) + 150 }); o.push(e); });
  mat1Side().forEach((e) => { e.set?.({ left: (e.left ?? 0) + 170, top: (e.top ?? 0) }); o.push(e); });
  return o;
}});

export const BLOCKS: BlockDef[] = blocks;

export function blocksByCategory(): Record<string, BlockDef[]> {
  const map: Record<string, BlockDef[]> = {};
  for (const b of blocks) (map[b.category] ??= []).push(b);
  return map;
}

export function searchBlocks(q: string): BlockDef[] {
  const s = q.trim().toLowerCase();
  if (!s) return blocks;
  return blocks.filter((b) =>
    b.name.toLowerCase().includes(s) ||
    b.standard?.toLowerCase().includes(s) ||
    b.tags?.some((t) => t.toLowerCase().includes(s))
  );
}