/**
 * Геометрические операции редактирования: обрезка, удлинение, сопряжение, фаска.
 *
 * В прежней реализации эти команды были имитацией: «обрезка» удаляла весь
 * объект целиком, «удлинение» умножало масштаб на 1.1, «сопряжение» просто
 * скругляло углы прямоугольника через свойство отрисовки. Такие операции
 * меняют картинку, но не геометрию — контур после них нельзя обсчитать
 * и передать в раскрой.
 *
 * Здесь операции считаются честно и возвращают новые координаты,
 * поэтому модуль покрывается тестами независимо от холста.
 */

import {
  type CircleEntity,
  type Entity,
  type Pt,
  type SegEntity,
  dist,
  intersectEntities,
  projectOnSegment,
} from '@/lib/cad/osnap';

/* ─────────────────── Обрезка ─────────────────── */

export interface TrimResult {
  /** Оставшиеся части отрезка. Пусто — объект удаляется целиком. */
  segments: SegEntity[];
  /** Операция изменила геометрию */
  changed: boolean;
}

/**
 * Обрезает отрезок по режущим кромкам со стороны указанной точки.
 *
 * Логика как в промышленных САПР: находятся все пересечения с режущими
 * объектами, отрезок делится ими на участки, удаляется тот участок,
 * внутри которого указал оператор.
 */
export function trimSegment(
  target: SegEntity,
  cutters: Entity[],
  clickPoint: Pt,
): TrimResult {
  const hits: number[] = [];

  for (const c of cutters) {
    if (c === target) continue;
    for (const p of intersectEntities(target, c)) {
      const { t } = projectOnSegment(p, target);
      // Пересечения на самых концах не делят отрезок
      if (t > 1e-6 && t < 1 - 1e-6) hits.push(t);
    }
  }

  if (!hits.length) return { segments: [target], changed: false };

  const cuts = [...new Set(hits.map((t) => Math.round(t * 1e6) / 1e6))].sort((a, b) => a - b);
  const bounds = [0, ...cuts, 1];
  const { t: clickT } = projectOnSegment(clickPoint, target);

  const dx = target.b.x - target.a.x;
  const dy = target.b.y - target.a.y;
  const at = (t: number): Pt => ({ x: target.a.x + dx * t, y: target.a.y + dy * t });

  const out: SegEntity[] = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const t0 = bounds[i];
    const t1 = bounds[i + 1];
    // Участок под курсором удаляется, остальные сохраняются
    if (clickT >= t0 && clickT <= t1) continue;
    out.push({ kind: 'segment', a: at(t0), b: at(t1) });
  }

  return { segments: out, changed: true };
}

/* ─────────────────── Удлинение ─────────────────── */

/**
 * Удлиняет отрезок до ближайшей границы.
 *
 * Продлевается тот конец, который ближе к точке указания — как в САПР,
 * где оператор кликает по удлиняемой стороне. Масштабирование объекта,
 * применявшееся ранее, растягивало отрезок в обе стороны и смещало его
 * относительно чертежа.
 */
export function extendSegment(
  target: SegEntity,
  boundaries: Entity[],
  clickPoint: Pt,
): { segment: SegEntity; changed: boolean } {
  const dx = target.b.x - target.a.x;
  const dy = target.b.y - target.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return { segment: target, changed: false };

  // Какой конец тянем
  const nearB = dist(clickPoint, target.b) <= dist(clickPoint, target.a);

  // Луч продолжения за выбранный конец
  const FAR = 1e5;
  const ray: SegEntity = nearB
    ? {
      kind: 'segment',
      a: { ...target.b },
      b: { x: target.b.x + (dx / len) * FAR, y: target.b.y + (dy / len) * FAR },
    }
    : {
      kind: 'segment',
      a: { ...target.a },
      b: { x: target.a.x - (dx / len) * FAR, y: target.a.y - (dy / len) * FAR },
    };

  let best: Pt | null = null;
  let bestDist = Infinity;

  for (const b of boundaries) {
    if (b === target) continue;
    for (const p of intersectEntities(ray, b)) {
      const d = dist(ray.a, p);
      if (d > 1e-6 && d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
  }

  if (!best) return { segment: target, changed: false };

  return {
    segment: nearB
      ? { ...target, b: best }
      : { ...target, a: best },
    changed: true,
  };
}

/* ─────────────────── Сопряжение ─────────────────── */

export interface FilletResult {
  /** Подрезанные исходные отрезки */
  seg1: SegEntity;
  seg2: SegEntity;
  /** Дуга сопряжения */
  arc: CircleEntity;
  changed: boolean;
}

/**
 * Строит дугу сопряжения заданного радиуса между двумя отрезками
 * и подрезает их до точек касания.
 *
 * Построение: центр дуги лежит на биссектрисе угла на расстоянии
 * r / sin(θ/2) от вершины, где θ — угол между сторонами. Точки касания —
 * проекции центра на стороны.
 */
export function filletSegments(
  s1: SegEntity,
  s2: SegEntity,
  radius: number,
): FilletResult | null {
  const inter = intersectSegmentLines(s1, s2);
  if (!inter) return null;

  // Направления от вершины к дальним концам сторон
  const dir = (s: SegEntity): Pt | null => {
    const far = dist(inter, s.a) > dist(inter, s.b) ? s.a : s.b;
    const vx = far.x - inter.x;
    const vy = far.y - inter.y;
    const l = Math.hypot(vx, vy);
    return l < 1e-9 ? null : { x: vx / l, y: vy / l };
  };

  const u1 = dir(s1);
  const u2 = dir(s2);
  if (!u1 || !u2) return null;

  const cosT = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
  const theta = Math.acos(cosT);
  // Стороны коллинеарны — сопряжение не определено
  if (theta < 1e-6 || Math.abs(theta - Math.PI) < 1e-6) return null;

  const tanDist = radius / Math.tan(theta / 2);

  // Радиус не должен превышать длину сторон
  const maxLen = Math.min(
    Math.max(dist(inter, s1.a), dist(inter, s1.b)),
    Math.max(dist(inter, s2.a), dist(inter, s2.b)),
  );
  if (tanDist > maxLen) return null;

  const t1: Pt = { x: inter.x + u1.x * tanDist, y: inter.y + u1.y * tanDist };
  const t2: Pt = { x: inter.x + u2.x * tanDist, y: inter.y + u2.y * tanDist };

  // Центр — на биссектрисе
  const bx = u1.x + u2.x;
  const by = u1.y + u2.y;
  const bl = Math.hypot(bx, by);
  if (bl < 1e-9) return null;
  const centerDist = radius / Math.sin(theta / 2);
  const c: Pt = { x: inter.x + (bx / bl) * centerDist, y: inter.y + (by / bl) * centerDist };

  const a0 = Math.atan2(t1.y - c.y, t1.x - c.x);
  const a1 = Math.atan2(t2.y - c.y, t2.x - c.x);

  // Подрезаем стороны до точек касания, сохраняя дальние концы
  const cut = (s: SegEntity, t: Pt): SegEntity =>
    dist(inter, s.a) < dist(inter, s.b)
      ? { ...s, a: t }
      : { ...s, b: t };

  return {
    seg1: cut(s1, t1),
    seg2: cut(s2, t2),
    arc: { kind: 'circle', c, r: radius, a0, a1 },
    changed: true,
  };
}

/* ─────────────────── Фаска ─────────────────── */

export interface ChamferResult {
  seg1: SegEntity;
  seg2: SegEntity;
  /** Отрезок фаски между точками отступа */
  chamfer: SegEntity;
  changed: boolean;
}

/**
 * Строит фаску между отрезками с заданными отступами от вершины.
 * Равные отступы дают фаску под 45° — типовой случай в машиностроении.
 */
export function chamferSegments(
  s1: SegEntity,
  s2: SegEntity,
  d1: number,
  d2 = d1,
): ChamferResult | null {
  const inter = intersectSegmentLines(s1, s2);
  if (!inter) return null;

  const dir = (s: SegEntity): Pt | null => {
    const far = dist(inter, s.a) > dist(inter, s.b) ? s.a : s.b;
    const vx = far.x - inter.x;
    const vy = far.y - inter.y;
    const l = Math.hypot(vx, vy);
    return l < 1e-9 ? null : { x: vx / l, y: vy / l };
  };

  const u1 = dir(s1);
  const u2 = dir(s2);
  if (!u1 || !u2) return null;

  const maxLen1 = Math.max(dist(inter, s1.a), dist(inter, s1.b));
  const maxLen2 = Math.max(dist(inter, s2.a), dist(inter, s2.b));
  if (d1 > maxLen1 || d2 > maxLen2) return null;

  const p1: Pt = { x: inter.x + u1.x * d1, y: inter.y + u1.y * d1 };
  const p2: Pt = { x: inter.x + u2.x * d2, y: inter.y + u2.y * d2 };

  const cut = (s: SegEntity, t: Pt): SegEntity =>
    dist(inter, s.a) < dist(inter, s.b) ? { ...s, a: t } : { ...s, b: t };

  return {
    seg1: cut(s1, p1),
    seg2: cut(s2, p2),
    chamfer: { kind: 'segment', a: p1, b: p2 },
    changed: true,
  };
}

/* ─────────────────── Вспомогательное ─────────────────── */

/**
 * Точка пересечения прямых, содержащих отрезки.
 *
 * В отличие от пересечения самих отрезков, здесь границы не проверяются:
 * сопряжение и фаска строятся и для сторон, которые пока не сходятся —
 * именно так эти команды работают в промышленных САПР.
 */
export function intersectSegmentLines(s1: SegEntity, s2: SegEntity): Pt | null {
  const d1x = s1.b.x - s1.a.x;
  const d1y = s1.b.y - s1.a.y;
  const d2x = s2.b.x - s2.a.x;
  const d2y = s2.b.y - s2.a.y;

  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return null;

  const t = ((s2.a.x - s1.a.x) * d2y - (s2.a.y - s1.a.y) * d2x) / den;
  return { x: s1.a.x + d1x * t, y: s1.a.y + d1y * t };
}

/** Смещение отрезка на расстояние по нормали — команда «Подобие». */
export function offsetSegment(s: SegEntity, distance: number, side: Pt): SegEntity {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return s;

  // Нормаль и выбор стороны по знаку векторного произведения
  const nx = -dy / len;
  const ny = dx / len;
  const sign = (side.x - s.a.x) * nx + (side.y - s.a.y) * ny >= 0 ? 1 : -1;
  const ox = nx * distance * sign;
  const oy = ny * distance * sign;

  return {
    kind: 'segment',
    a: { x: s.a.x + ox, y: s.a.y + oy },
    b: { x: s.b.x + ox, y: s.b.y + oy },
  };
}

/** Поворот точки вокруг центра — основа команд поворота и массива. */
export function rotatePoint(p: Pt, center: Pt, angleRad: number): Pt {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Зеркальное отражение точки относительно прямой, заданной отрезком. */
export function mirrorPoint(p: Pt, axis: SegEntity): Pt {
  const { point } = projectOnSegment(p, axis);
  return { x: 2 * point.x - p.x, y: 2 * point.y - p.y };
}
