/**
 * Тесты геометрического ядра CAD: привязки и операции редактирования.
 *
 * Ядро вынесено из холста именно ради проверяемости — точность построений
 * нельзя оценить по внешнему виду чертежа. Тесты фиксируют, что операции
 * дают геометрически корректный результат, а не визуальную имитацию.
 *
 * Запуск: npx tsx src/lib/cad/__tests__/geometry.test.ts
 */
import {
  DEFAULT_SNAP_MODES,
  type CircleEntity,
  type SegEntity,
  applyOrtho,
  applyPolar,
  endpointsOf,
  findSnap,
  intersectCircles,
  intersectSegmentCircle,
  intersectSegments,
  midpointOf,
  perpendicularFrom,
  quadrantsOf,
  tangentsFrom,
} from '@/lib/cad/osnap';
import {
  chamferSegments,
  extendSegment,
  filletSegments,
  mirrorPoint,
  offsetSegment,
  rotatePoint,
  trimSegment,
} from '@/lib/cad/edit';

let passed = 0;
let failed = 0;

const eq = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  ПРОВАЛ: ${name}`);
  }
}

function suite(title: string, fn: () => void) {
  console.log(`\n${title}`);
  fn();
}

/* ═══════════════ Пересечения ═══════════════ */

suite('Пересечения примитивов', () => {
  const s1: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 100, y: 100 } };
  const s2: SegEntity = { kind: 'segment', a: { x: 0, y: 100 }, b: { x: 100, y: 0 } };

  const cross = intersectSegments(s1, s2);
  check('пересечение по диагонали', cross.length === 1 && eq(cross[0].x, 50) && eq(cross[0].y, 50));
  check('параллельные не пересекаются',
    intersectSegments(s1, { kind: 'segment', a: { x: 10, y: 0 }, b: { x: 110, y: 100 } }).length === 0);
  check('разнесённые не пересекаются',
    intersectSegments(s1, { kind: 'segment', a: { x: 200, y: 0 }, b: { x: 300, y: 100 } }).length === 0);

  const circle: CircleEntity = { kind: 'circle', c: { x: 50, y: 50 }, r: 25 };
  const sec = intersectSegmentCircle(
    { kind: 'segment', a: { x: 0, y: 50 }, b: { x: 100, y: 50 } }, circle);
  check('секущая даёт две точки', sec.length === 2);
  check('секущая: координаты 25 и 75',
    eq(Math.min(sec[0].x, sec[1].x), 25) && eq(Math.max(sec[0].x, sec[1].x), 75));

  // Регрессия: при касании оба корня совпадали и точка возвращалась дважды,
  // что давало задвоенный маркер и ложное «пересечение».
  const tangentLine = intersectSegmentCircle(
    { kind: 'segment', a: { x: 0, y: 25 }, b: { x: 100, y: 25 } }, circle);
  check('касание даёт ровно одну точку', tangentLine.length === 1);

  check('две окружности: две точки',
    intersectCircles({ kind: 'circle', c: { x: 0, y: 0 }, r: 50 },
      { kind: 'circle', c: { x: 80, y: 0 }, r: 50 }).length === 2);
  check('внешнее касание окружностей: одна точка',
    intersectCircles({ kind: 'circle', c: { x: 0, y: 0 }, r: 50 },
      { kind: 'circle', c: { x: 100, y: 0 }, r: 50 }).length === 1);
  check('вложенные окружности не пересекаются',
    intersectCircles({ kind: 'circle', c: { x: 0, y: 0 }, r: 50 },
      { kind: 'circle', c: { x: 0, y: 0 }, r: 20 }).length === 0);
});

/* ═══════════════ Характерные точки ═══════════════ */

suite('Характерные точки объектов', () => {
  const arc: CircleEntity = {
    kind: 'circle', c: { x: 0, y: 0 }, r: 100, a0: 0, a1: Math.PI / 2,
  };

  const mid = midpointOf(arc)!;
  check('середина дуги лежит на радиусе', eq(Math.hypot(mid.x, mid.y), 100));
  check('середина дуги на 45°', eq(mid.x, 100 * Math.cos(Math.PI / 4)));
  check('у дуги две конечные точки', endpointsOf(arc).length === 2);
  check('у полной окружности конечных точек нет',
    endpointsOf({ kind: 'circle', c: { x: 0, y: 0 }, r: 10 }).length === 0);
  check('у окружности четыре квадранта',
    quadrantsOf({ kind: 'circle', c: { x: 0, y: 0 }, r: 10 }).length === 4);
  check('у четверти дуги два квадранта', quadrantsOf(arc).length === 2);

  const tangents = tangentsFrom({ kind: 'circle', c: { x: 0, y: 0 }, r: 50 }, { x: 100, y: 0 });
  check('две касательные из внешней точки', tangents.length === 2);
  check('точки касания лежат на окружности',
    tangents.every((p) => eq(Math.hypot(p.x, p.y), 50)));
  check('касательная перпендикулярна радиусу',
    tangents.every((p) => eq(p.x * (p.x - 100) + p.y * p.y, 0, 1e-5)));
  check('изнутри касательных нет',
    tangentsFrom({ kind: 'circle', c: { x: 0, y: 0 }, r: 50 }, { x: 10, y: 0 }).length === 0);

  const perp = perpendicularFrom(
    { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } }, { x: 30, y: 40 })!;
  check('основание перпендикуляра', eq(perp.x, 30) && eq(perp.y, 0));
  check('перпендикуляр вне отрезка не строится',
    perpendicularFrom({ kind: 'segment', a: { x: 0, y: 0 }, b: { x: 10, y: 0 } },
      { x: 50, y: 40 }) === null);
});

/* ═══════════════ Выбор привязки ═══════════════ */

suite('Выбор привязки под курсором', () => {
  const line: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
  const opts = { modes: DEFAULT_SNAP_MODES, tolerance: 12, gridSize: 20 };

  const atEnd = findSnap({ x: 2, y: 2 }, [line], opts);
  check('у края выбирается конечная точка', atEnd?.kind === 'endpoint' && eq(atEnd.point.x, 0));

  const atMid = findSnap({ x: 50, y: 3 }, [line], opts);
  check('в центре выбирается середина', atMid?.kind === 'midpoint' && eq(atMid.point.x, 50));

  const far = findSnap({ x: 500, y: 500 }, [], opts);
  check('вдали от геометрии срабатывает сетка', far?.kind === 'grid');

  const diag1: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 100, y: 100 } };
  const diag2: SegEntity = { kind: 'segment', a: { x: 0, y: 100 }, b: { x: 100, y: 0 } };
  const inter = findSnap({ x: 48, y: 48 }, [diag1, diag2], opts);
  check('пересечение распознаётся', inter?.kind === 'intersection' && eq(inter.point.x, 50));

  const off = findSnap({ x: 50, y: 3 }, [line], {
    ...opts,
    modes: { ...DEFAULT_SNAP_MODES, midpoint: false, nearest: false, endpoint: false },
  });
  check('отключённая привязка не срабатывает', off?.kind === 'grid');
});

/* ═══════════════ Ограничение направления ═══════════════ */

suite('Орто и полярное отслеживание', () => {
  const h = applyOrtho({ x: 0, y: 0 }, { x: 100, y: 20 });
  check('орто удерживает горизонталь', eq(h.x, 100) && eq(h.y, 0));

  const v = applyOrtho({ x: 0, y: 0 }, { x: 20, y: 100 });
  check('орто удерживает вертикаль', eq(v.x, 0) && eq(v.y, 100));

  const p = applyPolar({ x: 0, y: 0 }, { x: 100, y: 90 }, 45);
  check('полярный шаг 45° даёт диагональ', eq(p.x, p.y));
});

/* ═══════════════ Обрезка и удлинение ═══════════════ */

suite('Обрезка и удлинение', () => {
  const h: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
  const v1: SegEntity = { kind: 'segment', a: { x: 40, y: -50 }, b: { x: 40, y: 50 } };
  const v2: SegEntity = { kind: 'segment', a: { x: 70, y: -50 }, b: { x: 70, y: 50 } };

  const left = trimSegment(h, [v1], { x: 10, y: 0 });
  check('обрезка удаляет указанный участок', left.changed && left.segments.length === 1);
  check('обрезка сохраняет остаток',
    eq(left.segments[0].a.x, 40) && eq(left.segments[0].b.x, 100));

  const right = trimSegment(h, [v1], { x: 80, y: 0 });
  check('обрезка с другой стороны',
    eq(right.segments[0].a.x, 0) && eq(right.segments[0].b.x, 40));

  const middle = trimSegment(h, [v1, v2], { x: 55, y: 0 });
  check('две кромки: середина удаляется, остаются два участка',
    middle.segments.length === 2);

  check('без пересечений обрезка не выполняется',
    !trimSegment(h, [{ kind: 'segment', a: { x: 0, y: 99 }, b: { x: 9, y: 99 } }],
      { x: 5, y: 0 }).changed);

  const short: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 50, y: 0 } };
  const wall: SegEntity = { kind: 'segment', a: { x: 120, y: -50 }, b: { x: 120, y: 50 } };

  const ext = extendSegment(short, [wall], { x: 49, y: 0 });
  check('удлинение доводит до границы',
    ext.changed && eq(ext.segment.b.x, 120) && eq(ext.segment.a.x, 0));

  const back = extendSegment(short,
    [{ kind: 'segment', a: { x: -30, y: -50 }, b: { x: -30, y: 50 } }], { x: 1, y: 0 });
  check('удлинение работает в обе стороны',
    eq(back.segment.a.x, -30) && eq(back.segment.b.x, 50));

  check('без границы удлинение не выполняется',
    !extendSegment(short, [], { x: 49, y: 0 }).changed);
});

/* ═══════════════ Сопряжение и фаска ═══════════════ */

suite('Сопряжение и фаска', () => {
  const s1: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };
  const s2: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 0, y: 100 } };

  const f = filletSegments(s1, s2, 20)!;
  check('сопряжение построено', Boolean(f));
  check('радиус дуги соответствует заданному', eq(f.arc.r, 20));
  check('центр дуги на биссектрисе', eq(f.arc.c.x, 20) && eq(f.arc.c.y, 20));
  check('первая сторона подрезана до касания', eq(f.seg1.a.x, 20) && eq(f.seg1.a.y, 0));
  check('вторая сторона подрезана до касания', eq(f.seg2.a.y, 20) && eq(f.seg2.a.x, 0));
  check('избыточный радиус отклоняется', filletSegments(s1, s2, 500) === null);
  check('для параллельных сопряжение не строится',
    filletSegments(s1, { kind: 'segment', a: { x: 0, y: 50 }, b: { x: 100, y: 50 } }, 10) === null);

  const c = chamferSegments(s1, s2, 20)!;
  check('фаска построена', Boolean(c));
  check('точки отступа на сторонах', eq(c.chamfer.a.x, 20) && eq(c.chamfer.b.y, 20));
  check('фаска 45° имеет длину катет×√2',
    eq(Math.hypot(c.chamfer.b.x - c.chamfer.a.x, c.chamfer.b.y - c.chamfer.a.y),
      20 * Math.SQRT2));
});

/* ═══════════════ Преобразования ═══════════════ */

suite('Смещение, отражение, поворот', () => {
  const h: SegEntity = { kind: 'segment', a: { x: 0, y: 0 }, b: { x: 100, y: 0 } };

  const up = offsetSegment(h, 10, { x: 50, y: 30 });
  check('смещение в сторону указания', eq(up.a.y, 10) && eq(up.b.y, 10));

  const down = offsetSegment(h, 10, { x: 50, y: -30 });
  check('смещение в противоположную сторону', eq(down.a.y, -10));

  const m = mirrorPoint({ x: 30, y: 40 }, h);
  check('отражение относительно оси', eq(m.x, 30) && eq(m.y, -40));

  const r = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
  check('поворот на 90°', eq(r.x, 0, 1e-9) && eq(r.y, 10));
});

/* ═══════════════ Итог ═══════════════ */

console.log(`\n${'─'.repeat(46)}`);
console.log(`Пройдено: ${passed}   Провалено: ${failed}`);

if (failed > 0) process.exit(1);
