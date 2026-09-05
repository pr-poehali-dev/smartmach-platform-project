/**
 * Мост между движком привязок и холстом Fabric.
 *
 * Отвечает за три вещи:
 *   1. извлекает геометрию из объектов Fabric в нейтральные примитивы;
 *   2. ищет привязку рядом с курсором и применяет орто/полярный режим;
 *   3. рисует маркер найденной привязки поверх чертежа.
 *
 * Маркер выводится напрямую в контекст холста, а не отдельным объектом
 * Fabric: иначе он попадал бы в историю операций, в выделение рамкой
 * и в экспорт чертежа.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { Canvas } from 'fabric';

import {
  DEFAULT_SNAP_MODES,
  type Entity,
  type Pt,
  type SnapKind,
  type SnapModes,
  type SnapResult,
  applyOrtho,
  applyPolar,
  findSnap,
} from '@/lib/cad/osnap';

/**
 * Объект холста с полями, которые проект добавляет к примитивам Fabric.
 * Геометрия читается из разных типов фигур, поэтому набор полей описан
 * как необязательный, а не через отдельные типы на каждую фигуру.
 */
interface CanvasShape {
  type?: string;
  visible?: boolean;
  left?: number; top?: number;
  width?: number; height?: number;
  radius?: number; rx?: number; ry?: number;
  x1?: number; y1?: number; x2?: number; y2?: number;
  scaleX?: number; scaleY?: number;
  originX?: string; originY?: string;
  points?: Pt[];
  __grid?: boolean; __frame?: boolean;
  __dim?: boolean; __snapMarker?: boolean;
}

/** Служебные объекты холста в геометрию не попадают. */
function isServiceObject(o: CanvasShape): boolean {
  return Boolean(o.__grid || o.__frame || o.__dim || o.__snapMarker);
}

/**
 * Переводит объект Fabric в набор геометрических примитивов.
 * Прямоугольник раскладывается на четыре стороны — иначе привязка
 * к его углам и серединам сторон была бы недоступна.
 */
export function entitiesFromObject(shape: object): Entity[] {
  // Объекты Fabric описаны обобщённо и не совпадают с CanvasShape
  // структурно, поэтому приводим их к читаемому виду в одном месте
  const o = shape as CanvasShape;
  if (isServiceObject(o) || o.visible === false) return [];

  const type = o.type;

  if (type === 'line') {
    return [{
      kind: 'segment',
      a: { x: o.x1 ?? 0, y: o.y1 ?? 0 },
      b: { x: o.x2 ?? 0, y: o.y2 ?? 0 },
    }];
  }

  if (type === 'rect') {
    const l = o.left ?? 0;
    const t = o.top ?? 0;
    const w = o.width ?? 0;
    const h = o.height ?? 0;
    const sw = w * (o.scaleX ?? 1);
    const sh = h * (o.scaleY ?? 1);
    const corners: Pt[] = [
      { x: l, y: t },
      { x: l + sw, y: t },
      { x: l + sw, y: t + sh },
      { x: l, y: t + sh },
    ];
    return corners.map((a, i) => ({
      kind: 'segment' as const,
      a,
      b: corners[(i + 1) % 4],
    }));
  }

  if (type === 'circle') {
    const r = (o.radius ?? 0) * (o.scaleX ?? 1);
    const left = o.left ?? 0;
    const top = o.top ?? 0;
    // originX/Y у примитивов холста — 'left'/'top', центр смещён на радиус
    const cx = o.originX === 'center' ? left : left + r;
    const cy = o.originY === 'center' ? top : top + r;
    return [{ kind: 'circle', c: { x: cx, y: cy }, r }];
  }

  if (type === 'ellipse') {
    // Эллипс аппроксимируется окружностью по среднему радиусу:
    // точная привязка к нему требует решения уравнения четвёртой степени,
    // что несоразмерно задаче. Центр при этом определяется точно.
    const rx = (o.rx ?? 0) * (o.scaleX ?? 1);
    const ry = (o.ry ?? 0) * (o.scaleY ?? 1);
    const left = o.left ?? 0;
    const top = o.top ?? 0;
    const cx = o.originX === 'center' ? left : left + rx;
    const cy = o.originY === 'center' ? top : top + ry;
    return [{ kind: 'circle', c: { x: cx, y: cy }, r: (rx + ry) / 2 }];
  }

  if (type === 'polyline' || type === 'polygon') {
    const pts: Pt[] = (o.points ?? []).map((p: Pt) => ({
      x: p.x + (o.left ?? 0),
      y: p.y + (o.top ?? 0),
    }));
    const out: Entity[] = [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      out.push({ kind: 'segment', a: pts[i], b: pts[i + 1] });
    }
    if (type === 'polygon' && pts.length > 2) {
      out.push({ kind: 'segment', a: pts[pts.length - 1], b: pts[0] });
    }
    return out;
  }

  return [];
}

/** Собирает геометрию всего чертежа для поиска привязок. */
export function collectEntities(fc: Canvas): Entity[] {
  const out: Entity[] = [];
  fc.getObjects().forEach((o) => out.push(...entitiesFromObject(o)));
  return out;
}

/* ─────────────────── Отрисовка маркера ─────────────────── */

const MARKER_COLOR = '#16a34a';
const MARKER_SIZE = 6;

/**
 * Форма маркера кодирует тип привязки — как в промышленных САПР:
 * квадрат у конечной точки, треугольник у середины, круг у центра.
 * Оператор узнаёт привязку не читая подпись.
 */
function drawMarker(ctx: CanvasRenderingContext2D, p: Pt, kind: SnapKind) {
  const s = MARKER_SIZE;
  ctx.save();
  ctx.strokeStyle = MARKER_COLOR;
  ctx.fillStyle = 'rgba(22, 163, 74, 0.15)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();

  switch (kind) {
    case 'endpoint':
      ctx.rect(p.x - s, p.y - s, s * 2, s * 2);
      break;
    case 'midpoint':
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.closePath();
      break;
    case 'center':
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      break;
    case 'quadrant':
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s, p.y);
      ctx.closePath();
      break;
    case 'intersection':
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x + s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      break;
    case 'perpendicular':
      ctx.moveTo(p.x - s, p.y - s);
      ctx.lineTo(p.x - s, p.y + s);
      ctx.lineTo(p.x + s, p.y + s);
      ctx.moveTo(p.x - s, p.y + s - 3);
      ctx.lineTo(p.x - s + 3, p.y + s - 3);
      ctx.lineTo(p.x - s + 3, p.y + s);
      break;
    case 'tangent':
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.moveTo(p.x - s - 2, p.y - s);
      ctx.lineTo(p.x + s + 2, p.y - s);
      break;
    default: // nearest, grid
      ctx.moveTo(p.x - s, p.y);
      ctx.lineTo(p.x + s, p.y);
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x, p.y + s);
  }

  ctx.stroke();
  if (kind !== 'intersection' && kind !== 'nearest' && kind !== 'grid') ctx.fill();
  ctx.restore();
}

/* ─────────────────── Хук ─────────────────── */

export interface OsnapState {
  enabled: boolean;
  modes: SnapModes;
  ortho: boolean;
  polar: boolean;
  polarStepDeg: number;
  gridSize: number;
  tolerance: number;
}

export const DEFAULT_OSNAP_STATE: OsnapState = {
  enabled: true,
  modes: { ...DEFAULT_SNAP_MODES },
  ortho: false,
  polar: false,
  polarStepDeg: 15,
  gridSize: 20,
  tolerance: 12,
};

interface UseOsnapArgs {
  fabricRef: React.MutableRefObject<Canvas | null>;
  stateRef: React.MutableRefObject<OsnapState>;
  /** Опорная точка текущего построения; нужна орто и перпендикуляру */
  fromRef: React.MutableRefObject<Pt | null>;
  onSnapChange?: (s: SnapResult | null) => void;
}

export function useCad2DOsnap({
  fabricRef, stateRef, fromRef, onSnapChange,
}: UseOsnapArgs) {
  const lastSnapRef = useRef<SnapResult | null>(null);

  /**
   * Основная функция: превращает координату курсора в точку построения.
   * Порядок важен — объектная привязка сильнее орто, поскольку попадание
   * в узел геометрии важнее сохранения направления.
   */
  const resolve = useCallback((cursor: Pt): Pt => {
    const fc = fabricRef.current;
    const st = stateRef.current;
    if (!fc || !st.enabled) {
      lastSnapRef.current = null;
      onSnapChange?.(null);
      return { x: Math.round(cursor.x), y: Math.round(cursor.y) };
    }

    const from = fromRef.current;
    const snap = findSnap(cursor, collectEntities(fc), {
      modes: st.modes,
      tolerance: st.tolerance,
      gridSize: st.gridSize,
      from,
    });

    // Привязка к геометрии перекрывает угловые ограничения
    if (snap && snap.kind !== 'grid') {
      lastSnapRef.current = snap;
      onSnapChange?.(snap);
      return snap.point;
    }

    if (from) {
      if (st.ortho) {
        lastSnapRef.current = null;
        onSnapChange?.(null);
        const p = applyOrtho(from, cursor);
        return { x: Math.round(p.x), y: Math.round(p.y) };
      }
      if (st.polar) {
        lastSnapRef.current = null;
        onSnapChange?.(null);
        const p = applyPolar(from, cursor, st.polarStepDeg);
        return { x: Math.round(p.x), y: Math.round(p.y) };
      }
    }

    lastSnapRef.current = snap;
    onSnapChange?.(snap);
    return snap ? snap.point : { x: Math.round(cursor.x), y: Math.round(cursor.y) };
  }, [fabricRef, stateRef, fromRef, onSnapChange]);

  /* Маркер рисуется после отрисовки холста, поверх всей геометрии */
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const onAfterRender = () => {
      const snap = lastSnapRef.current;
      if (!snap || snap.kind === 'grid') return;
      const ctx = fc.getSelectionContext?.()
        ?? (fc as unknown as { contextTop?: CanvasRenderingContext2D }).contextTop;
      if (!ctx) return;
      drawMarker(ctx, snap.point, snap.kind);
    };

    fc.on('after:render', onAfterRender);
    return () => {
      fc.off('after:render', onAfterRender);
    };
  }, [fabricRef]);

  const clearSnap = useCallback(() => {
    lastSnapRef.current = null;
    onSnapChange?.(null);
  }, [onSnapChange]);

  return { resolve, clearSnap, lastSnapRef };
}