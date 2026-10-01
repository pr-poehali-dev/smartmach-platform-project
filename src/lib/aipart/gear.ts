/**
 * Геометрия цилиндрического зубчатого колеса внешнего зацепления (эвольвентное, исходный контур ГОСТ 13755:
 * α = 20°, h*a = 1, c* = 0,25) по ГОСТ 16532-70. Прямозубые и косозубые колёса.
 * Контрольный комплекс — длина общей нормали W и число зубьев в длине общей нормали zw (ГОСТ 1643).
 */

export interface GearParams {
  m: number;          // модуль нормальный, мм (ГОСТ 9563)
  z: number;          // число зубьев
  beta: number;       // угол наклона зуба, °
  hand: "right" | "left" | null;
  x: number;          // коэффициент смещения
  b: number;          // ширина венца, мм
  accuracy: string;   // степень точности ГОСТ 1643, напр. «8-B»
  mate_z: number | null;      // число зубьев сопряжённого колеса
  aw: number | null;          // межосевое расстояние, мм
  bore: { d: number; tol: string | null };
  keyway: { b: number; t2: number } | null;
  hub: { d: number; h: number } | null;
  web: { t: number; d_rim: number; holes: { n: number; d: number; pcd: number } | null } | null;
  chamfer: number;
  ra_teeth: number; ra_bore: number;
}

export interface GearGeometry {
  mt: number; alphaT: number; d: number; da: number; df: number; db: number;
  ha: number; hf: number; h: number; p: number;
  W: number; zw: number; s: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const inv = (a: number) => Math.tan(a) - a;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Ряд модулей ГОСТ 9563 (1-й и 2-й ряды) */
export const MODULES = [1, 1.125, 1.25, 1.375, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20];
export const nearestModule = (m: number) => MODULES.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));

export function gearGeometry(g: Pick<GearParams, "m" | "z" | "beta" | "x">): GearGeometry {
  const { m, z, x } = g;
  const beta = rad(g.beta);
  const alpha = rad(20);
  const mt = m / Math.cos(beta);
  const alphaT = Math.atan(Math.tan(alpha) / Math.cos(beta));
  const d = mt * z;
  const ha = m * (1 + x);
  const hf = m * (1.25 - x);
  const da = d + 2 * ha;
  const df = d - 2 * hf;
  const db = d * Math.cos(alphaT);

  // Длина общей нормали: эквивалентное число зубьев z' = z·inv αt / inv α
  const zEq = (z * inv(alphaT)) / inv(alpha);
  const zwRaw = (zEq * alpha) / Math.PI + 0.5 + (2 * x * Math.tan(alpha)) / Math.PI;
  const zw = Math.max(2, Math.min(z - 1, Math.round(zwRaw)));
  const W = m * Math.cos(alpha) * (Math.PI * (zw - 0.5) + 2 * x * Math.tan(alpha) + zEq * inv(alpha));
  const s = m * (Math.PI / 2 + 2 * x * Math.tan(alpha));

  return {
    mt: r3(mt), alphaT: r3((alphaT * 180) / Math.PI), d: r3(d), da: r3(da), df: r3(df), db: r3(db),
    ha: r3(ha), hf: r3(hf), h: r3(ha + hf), p: r3(Math.PI * m), W: r3(W), zw, s: r3(s),
  };
}

/** Межосевое расстояние пары без смещения */
export const centerDistance = (m: number, z1: number, z2: number, beta = 0) => r3((m * (z1 + z2)) / (2 * Math.cos(rad(beta))));

/** Угол наклона в формате ГОСТ: 12°50'20" */
export function fmtAngle(deg: number): string {
  const total = Math.round(deg * 3600);
  const d = Math.floor(total / 3600), mm = Math.floor((total % 3600) / 60), s = total % 60;
  return `${d}°${String(mm).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

/** Строки таблицы параметров по ГОСТ 2.403 (зона «Параметры», правый верхний угол) */
export function gearTable(g: GearParams, geo: GearGeometry): [string, string, string][] {
  const f = (v: number) => String(Math.round(v * 1000) / 1000).replace(".", ",");
  const rows: [string, string, string][] = [
    ["Модуль", "m", f(g.m)],
    ["Число зубьев", "z", String(g.z)],
    ["Угол наклона зуба", "β", g.beta ? fmtAngle(g.beta) : "0°"],
  ];
  if (g.beta) rows.push(["Направление линии зуба", "—", g.hand === "left" ? "Левое" : "Правое"]);
  rows.push(
    ["Нормальный исходный контур", "—", "ГОСТ 13755-2015"],
    ["Коэффициент смещения", "x", f(g.x)],
    ["Степень точности по ГОСТ 1643-81", "—", g.accuracy],
    ["Длина общей нормали", "W", f(geo.W)],
    ["Число зубьев в длине общей нормали", "zw", String(geo.zw)],
    ["Делительный диаметр", "d", f(geo.d)],
  );
  if (g.mate_z) {
    const aw = g.aw ?? centerDistance(g.m, g.z, g.mate_z, g.beta);
    rows.push(["Межосевое расстояние", "aw", f(aw)], ["Число зубьев сопряжённого колеса", "z2", String(g.mate_z)]);
  }
  return rows;
}
