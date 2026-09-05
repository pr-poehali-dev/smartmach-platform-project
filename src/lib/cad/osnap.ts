/**
 * Объектные привязки (OSNAP) — ядро точного черчения.
 *
 * Без привязок к геометрии чертёж строится «на глаз»: линия не приходит
 * ровно в конец другой линии, окружность не центрируется по узлу. Такой
 * контур нельзя отдать в раскрой — в нём остаются микрозазоры, на которых
 * рвётся траектория реза.
 *
 * Модуль намеренно не зависит от Fabric.js и работает с обычными числами:
 * это позволяет покрыть геометрию тестами и переиспользовать её
 * в постпроцессоре и в контроле замкнутости контуров.
 */

export type SnapKind =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'quadrant'
  | 'intersection'
  | 'perpendicular'
  | 'tangent'
  | 'nearest'
  | 'grid';

export interface Pt {
  x: number;
  y: number;
}

/** Отрезок в мировых координатах. */
export interface SegEntity {
  kind: 'segment';
  id?: string;
  a: Pt;
  b: Pt;
}

/** Окружность или дуга. Углы в радианах, отсчёт против часовой стрелки. */
export interface CircleEntity {
  kind: 'circle';
  id?: string;
  c: Pt;
  r: number;
  /** Для дуги — начальный и конечный угол; отсутствуют у полной окружности */
  a0?: number;
  a1?: number;
}

export type Entity = SegEntity | CircleEntity;

export interface SnapResult {
  point: Pt;
  kind: SnapKind;
  /** Расстояние от курсора до точки привязки, в пикселях холста */
  dist: number;
  /** Подпись для строки состояния */
  label: string;
}

export const SNAP_LABELS: Record<SnapKind, string> = {
  endpoint: 'Конточка',
  midpoint: 'Середина',
  center: 'Центр',
  quadrant: 'Квадрант',
  intersection: 'Пересечение',
  perpendicular: 'Нормаль',
  tangent: 'Касательная',
  nearest: 'Ближайшая',
  grid: 'Сетка',
};

/**
 * Приоритет привязок при совпадении расстояний.
 * Конечная точка важнее середины, середина важнее «ближайшей» —
 * иначе курсор у края отрезка цеплялся бы за произвольную точку контура.
 */
const PRIORITY: Record<SnapKind, number> = {
  endpoint: 10,
  intersection: 9,
  center: 8,
  midpoint: 7,
  quadrant: 6,
  perpendicular: 5,
  tangent: 4,
  nearest: 2,
  grid: 1,
};

export type SnapModes = Record<SnapKind, boolean>;

export const DEFAULT_SNAP_MODES: SnapModes = {
  endpoint: true,
  midpoint: true,
  center: true,
  quadrant: true,
  intersection: true,
  perpendicular: false,
  tangent: false,
  nearest: false,
  grid: true,
};

/* ─────────────────── Векторные примитивы ─────────────────── */

export const dist = (p: Pt, q: Pt): number => Math.hypot(p.x - q.x, p.y - q.y);

const TAU = Math.PI * 2;

/** Приводит угол к диапазону [0, 2π). */
export function normAngle(a: number): number {
  const r = a % TAU;
  return r < 0 ? r + TAU : r;
}

/**
 * Лежит ли угол на дуге. Для полной окружности (углы не заданы) — всегда да.
 * Дуга считается идущей против часовой стрелки от a0 к a1.
 */
export function angleOnArc(e: CircleEntity, angle: number): boolean {
  if (e.a0 === undefined || e.a1 === undefined) return true;
  const a = normAngle(angle);
  const s = normAngle(e.a0);
  const t = normAngle(e.a1);
  return s <= t ? a >= s - 1e-9 && a <= t + 1e-9 : a >= s - 1e-9 || a <= t + 1e-9;
}

/** Проекция точки на прямую отрезка; t — параметр вдоль отрезка. */
export function projectOnSegment(p: Pt, s: SegEntity): { point: Pt; t: number } {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return { point: { ...s.a }, t: 0 };
  const t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2;
  return { point: { x: s.a.x + dx * t, y: s.a.y + dy * t }, t };
}

/* ─────────────────── Пересечения ─────────────────── */

/** Пересечение двух отрезков (только в пределах обоих). */
export function intersectSegments(s1: SegEntity, s2: SegEntity): Pt[] {
  const d1x = s1.b.x - s1.a.x;
  const d1y = s1.b.y - s1.a.y;
  const d2x = s2.b.x - s2.a.x;
  const d2y = s2.b.y - s2.a.y;

  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return []; // параллельны

  const t = ((s2.a.x - s1.a.x) * d2y - (s2.a.y - s1.a.y) * d2x) / den;
  const u = ((s2.a.x - s1.a.x) * d1y - (s2.a.y - s1.a.y) * d1x) / den;

  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return [];
  return [{ x: s1.a.x + d1x * t, y: s1.a.y + d1y * t }];
}

/** Пересечение отрезка с окружностью или дугой. */
export function intersectSegmentCircle(s: SegEntity, c: CircleEntity): Pt[] {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const fx = s.a.x - c.c.x;
  const fy = s.a.y - c.c.y;

  const A = dx * dx + dy * dy;
  if (A < 1e-12) return [];
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - c.r * c.r;

  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];

  const sq = Math.sqrt(disc);
  // При касании (disc ≈ 0) оба корня совпадают: без этой проверки
  // возвращалась бы одна и та же точка дважды, что давало бы
  // задвоенный маркер привязки и ложный признак пересечения.
  const roots = disc < 1e-9
    ? [-B / (2 * A)]
    : [(-B - sq) / (2 * A), (-B + sq) / (2 * A)];

  const out: Pt[] = [];
  for (const t of roots) {
    if (t < -1e-9 || t > 1 + 1e-9) continue;
    const p = { x: s.a.x + dx * t, y: s.a.y + dy * t };
    if (angleOnArc(c, Math.atan2(p.y - c.c.y, p.x - c.c.x))) out.push(p);
  }
  return out;
}

/** Пересечение двух окружностей или дуг. */
export function intersectCircles(c1: CircleEntity, c2: CircleEntity): Pt[] {
  const d = dist(c1.c, c2.c);
  // Совпадающие центры или отсутствие касания
  if (d < 1e-9 || d > c1.r + c2.r + 1e-9 || d < Math.abs(c1.r - c2.r) - 1e-9) return [];

  const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const h2 = c1.r * c1.r - a * a;
  const h = h2 > 0 ? Math.sqrt(h2) : 0;

  const mx = c1.c.x + (a * (c2.c.x - c1.c.x)) / d;
  const my = c1.c.y + (a * (c2.c.y - c1.c.y)) / d;
  const rx = (-(c2.c.y - c1.c.y) * h) / d;
  const ry = ((c2.c.x - c1.c.x) * h) / d;

  const cand = h < 1e-9
    ? [{ x: mx, y: my }]
    : [{ x: mx + rx, y: my + ry }, { x: mx - rx, y: my - ry }];

  return cand.filter(
    (p) =>
      angleOnArc(c1, Math.atan2(p.y - c1.c.y, p.x - c1.c.x))
      && angleOnArc(c2, Math.atan2(p.y - c2.c.y, p.x - c2.c.x)),
  );
}

export function intersectEntities(e1: Entity, e2: Entity): Pt[] {
  if (e1.kind === 'segment' && e2.kind === 'segment') return intersectSegments(e1, e2);
  if (e1.kind === 'segment' && e2.kind === 'circle') return intersectSegmentCircle(e1, e2);
  if (e1.kind === 'circle' && e2.kind === 'segment') return intersectSegmentCircle(e2, e1);
  if (e1.kind === 'circle' && e2.kind === 'circle') return intersectCircles(e1, e2);
  return [];
}

/* ─────────────────── Характерные точки объекта ─────────────────── */

/** Конечные точки объекта: у дуги это её края, у полной окружности их нет. */
export function endpointsOf(e: Entity): Pt[] {
  if (e.kind === 'segment') return [e.a, e.b];
  if (e.a0 === undefined || e.a1 === undefined) return [];
  return [e.a0, e.a1].map((ang) => ({
    x: e.c.x + e.r * Math.cos(ang),
    y: e.c.y + e.r * Math.sin(ang),
  }));
}

/** Середина: у дуги — точка на середине дуги, а не хорды. */
export function midpointOf(e: Entity): Pt | null {
  if (e.kind === 'segment') {
    return { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 };
  }
  if (e.a0 === undefined || e.a1 === undefined) return null;
  const s = normAngle(e.a0);
  const t = normAngle(e.a1);
  const sweep = t >= s ? t - s : t + TAU - s;
  const mid = s + sweep / 2;
  return { x: e.c.x + e.r * Math.cos(mid), y: e.c.y + e.r * Math.sin(mid) };
}

/** Квадранты окружности — точки на 0°, 90°, 180°, 270°. */
export function quadrantsOf(e: CircleEntity): Pt[] {
  return [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    .filter((ang) => angleOnArc(e, ang))
    .map((ang) => ({
      x: e.c.x + e.r * Math.cos(ang),
      y: e.c.y + e.r * Math.sin(ang),
    }));
}

/** Ближайшая точка на объекте — привязка «Ближайшая». */
export function nearestOn(e: Entity, p: Pt): Pt | null {
  if (e.kind === 'segment') {
    const { point, t } = projectOnSegment(p, e);
    if (t <= 0) return { ...e.a };
    if (t >= 1) return { ...e.b };
    return point;
  }
  const d = dist(p, e.c);
  if (d < 1e-9) return null;
  const ang = Math.atan2(p.y - e.c.y, p.x - e.c.x);
  if (!angleOnArc(e, ang)) return null;
  return { x: e.c.x + (e.r * (p.x - e.c.x)) / d, y: e.c.y + (e.r * (p.y - e.c.y)) / d };
}

/**
 * Точка на объекте, дающая перпендикуляр из опорной точки.
 * Нужна при построении линии строго под 90° к существующей грани.
 */
export function perpendicularFrom(e: Entity, from: Pt): Pt | null {
  if (e.kind === 'segment') {
    const { point, t } = projectOnSegment(from, e);
    return t < -1e-9 || t > 1 + 1e-9 ? null : point;
  }
  // Для окружности нормаль всегда проходит через центр
  return nearestOn(e, from);
}

/**
 * Точки касания окружности из внешней точки.
 * Классическое построение: касательные видны под прямым углом к радиусу,
 * поэтому точки касания лежат на окружности Фалеса с диаметром from–center.
 */
export function tangentsFrom(e: CircleEntity, from: Pt): Pt[] {
  const d = dist(from, e.c);
  if (d < e.r - 1e-9) return []; // точка внутри — касательных нет
  if (Math.abs(d - e.r) < 1e-9) return [{ ...from }]; // точка на окружности

  const mid = { x: (from.x + e.c.x) / 2, y: (from.y + e.c.y) / 2 };
  return intersectCircles(
    { kind: 'circle', c: mid, r: d / 2 },
    { kind: 'circle', c: e.c, r: e.r },
  ).filter((p) => angleOnArc(e, Math.atan2(p.y - e.c.y, p.x - e.c.x)));
}

/* ─────────────────── Поиск привязки ─────────────────── */

export interface SnapOptions {
  modes: SnapModes;
  /** Радиус захвата в пикселях холста */
  tolerance?: number;
  /** Шаг сетки; привязка к сетке работает как запасной вариант */
  gridSize?: number;
  /**
   * Опорная точка текущего построения. Нужна перпендикуляру и касательной:
   * без неё эти привязки не определены.
   */
  from?: Pt | null;
}

/**
 * Подбирает лучшую привязку рядом с курсором.
 *
 * Кандидаты собираются со всех объектов, затем выбирается ближайший;
 * при сопоставимом расстоянии приоритет отдаётся более «сильной» привязке
 * (конечная точка важнее середины, середина важнее ближайшей).
 */
export function findSnap(
  cursor: Pt,
  entities: Entity[],
  opts: SnapOptions,
): SnapResult | null {
  const tol = opts.tolerance ?? 12;
  const { modes } = opts;
  const cand: SnapResult[] = [];

  const push = (point: Pt | null | undefined, kind: SnapKind) => {
    if (!point) return;
    const d = dist(cursor, point);
    if (d <= tol) cand.push({ point, kind, dist: d, label: SNAP_LABELS[kind] });
  };

  for (let i = 0; i < entities.length; i += 1) {
    const e = entities[i];

    if (modes.endpoint) endpointsOf(e).forEach((p) => push(p, 'endpoint'));
    if (modes.midpoint) push(midpointOf(e), 'midpoint');

    if (e.kind === 'circle') {
      if (modes.center) push(e.c, 'center');
      if (modes.quadrant) quadrantsOf(e).forEach((p) => push(p, 'quadrant'));
      if (modes.tangent && opts.from) {
        tangentsFrom(e, opts.from).forEach((p) => push(p, 'tangent'));
      }
    }

    if (modes.perpendicular && opts.from) push(perpendicularFrom(e, opts.from), 'perpendicular');
    if (modes.nearest) push(nearestOn(e, cursor), 'nearest');

    // Пересечения ищутся только среди пар, попавших в окрестность курсора
    if (modes.intersection) {
      for (let j = i + 1; j < entities.length; j += 1) {
        intersectEntities(e, entities[j]).forEach((p) => push(p, 'intersection'));
      }
    }
  }

  if (cand.length) {
    cand.sort((a, b) => {
      // Расхождение в пределах 2 px считаем несущественным и решаем приоритетом
      if (Math.abs(a.dist - b.dist) > 2) return a.dist - b.dist;
      return PRIORITY[b.kind] - PRIORITY[a.kind];
    });
    return cand[0];
  }

  // Сетка — запасной вариант, когда рядом нет геометрии
  if (modes.grid && opts.gridSize) {
    const g = opts.gridSize;
    const point = { x: Math.round(cursor.x / g) * g, y: Math.round(cursor.y / g) * g };
    return { point, kind: 'grid', dist: dist(cursor, point), label: SNAP_LABELS.grid };
  }

  return null;
}

/* ─────────────────── Орто и полярное отслеживание ─────────────────── */

/**
 * Ограничение направления от опорной точки.
 *
 * Орто-режим — частный случай полярного с шагом 90°. Выделен отдельно,
 * потому что в черчении он используется постоянно и включается одной клавишей.
 */
export function applyOrtho(from: Pt, to: Pt): Pt {
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
    ? { x: to.x, y: from.y }
    : { x: from.x, y: to.y };
}

/** Притягивает направление к ближайшему кратному угловому шагу. */
export function applyPolar(from: Pt, to: Pt, stepDeg = 15): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { ...to };

  const step = (stepDeg * Math.PI) / 180;
  const ang = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: from.x + len * Math.cos(ang), y: from.y + len * Math.sin(ang) };
}

/** Угол отрезка в градусах, приведённый к [0, 360). */
export function angleDeg(from: Pt, to: Pt): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}