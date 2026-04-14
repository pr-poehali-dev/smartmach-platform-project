/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, type MutableRefObject } from "react";
import {
  Canvas, Line, Circle, Rect, IText, Group, Ellipse, Path,
  type TPointerEventInfo,
} from "fabric";
import { type PartInfo } from "@/components/smartmach/cad.data";
import { type Tool, snapToGrid } from "@/components/smartmach/cad2d.data";

/**
 * Цвет и параметры размерных линий по ГОСТ 2.307.
 * Размерная линия — сплошная тонкая (тип 01, ГОСТ 2.303).
 * Выносная линия — сплошная тонкая, выступает за размерную на 1-5 мм.
 * Стрелка — по ГОСТ 2.307 п.2.4: длина ≈ 3.5×SW, угол 15°.
 * Текст размера — шрифт по ГОСТ 2.304, над размерной линией по центру.
 */
const DIM_COLOR   = "#1e40af";   // синий (слой Размеры)
const DIM_SW      = 0.7;          // толщина размерной линии (px)
const FONT_FAMILY = "Courier Prime, Courier New, monospace";
const DIM_FONT_SZ = 11;           // кегль числа размера
const LABEL_SZ    = 9;            // кегль подписей типа «∅», «R»

// ── Вспомогательные функции для ГОСТ 2.307 ──────────────────────────

/** Стрелка ГОСТ 2.307: остриё в точке (tx,ty), направление угла dir. */
function makeArrow(tx: number, ty: number, dir: number): [number, number, number, number][] {
  const len = 7;     // длина стрелки (px при zoom=1, ≈ 3.5мм)
  const ang = 0.26;  // полуугол = ~15°
  return [
    [tx, ty, tx - len * Math.cos(dir - ang), ty - len * Math.sin(dir - ang)],
    [tx, ty, tx - len * Math.cos(dir + ang), ty - len * Math.sin(dir + ang)],
  ];
}

/** Добавляет стрелку в конце линии на canvas. */
function addArrow(fc: Canvas, tx: number, ty: number, dir: number, layer: string) {
  makeArrow(tx, ty, dir).forEach(([x1, y1, x2, y2]) => {
    const l = new Line([x1, y1, x2, y2], {
      stroke: DIM_COLOR, strokeWidth: DIM_SW + 0.3,
      selectable: false, evented: false,
    });
    (l as any).__layer = layer;
    fc.add(l); fc.sendObjectToBack(l);
  });
}

/**
 * Линейный размер (ГОСТ 2.307 п.2.1-2.8):
 *   - Выносные линии перпендикулярны измеряемому отрезку
 *   - Размерная линия параллельна, со стрелками на концах
 *   - Текст над размерной линией по центру
 *   - offset — отступ размерной линии от контура (мм → px)
 */
function addLinearDim(
  fc: Canvas,
  x1: number, y1: number, x2: number, y2: number,
  offset: number, label: string | null, layer: string,
): Group {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return new Group([]);

  // Перпендикуляр (направление размерной линии)
  const nx = -dy / len, ny = dx / len;
  // Точки размерной линии
  const d1x = x1 + nx * offset, d1y = y1 + ny * offset;
  const d2x = x2 + nx * offset, d2y = y2 + ny * offset;
  // Выносные линии: от контура до размерной + 5px выступ
  const ext = 5;
  const angle = Math.atan2(d2y - d1y, d2x - d1x);

  const objs: any[] = [];

  // Размерная линия (тонкая сплошная)
  objs.push(new Line([d1x, d1y, d2x, d2y], {
    stroke: DIM_COLOR, strokeWidth: DIM_SW, selectable: false, evented: false,
  }));

  // Стрелки на концах
  makeArrow(d1x, d1y, angle + Math.PI, ).forEach(([ax1, ay1, ax2, ay2]) =>
    objs.push(new Line([ax1, ay1, ax2, ay2], { stroke: DIM_COLOR, strokeWidth: DIM_SW + 0.2, selectable: false, evented: false }))
  );
  makeArrow(d2x, d2y, angle).forEach(([ax1, ay1, ax2, ay2]) =>
    objs.push(new Line([ax1, ay1, ax2, ay2], { stroke: DIM_COLOR, strokeWidth: DIM_SW + 0.2, selectable: false, evented: false }))
  );

  // Выносные линии
  objs.push(new Line([x1, y1, d1x + nx * ext, d1y + ny * ext], {
    stroke: DIM_COLOR, strokeWidth: DIM_SW, strokeDashArray: [],
    selectable: false, evented: false,
  }));
  objs.push(new Line([x2, y2, d2x + nx * ext, d2y + ny * ext], {
    stroke: DIM_COLOR, strokeWidth: DIM_SW, strokeDashArray: [],
    selectable: false, evented: false,
  }));

  // Текст размера — над размерной линией, по центру, перпендикулярно если вертикально
  const cx = (d1x + d2x) / 2;
  const cy = (d1y + d2y) / 2;
  const dimText = label ?? String(Math.round(len));
  const txt = new IText(dimText, {
    left: cx, top: cy - DIM_FONT_SZ - 2,
    fontSize: DIM_FONT_SZ, fontFamily: FONT_FAMILY,
    fill: DIM_COLOR, originX: "center", originY: "bottom",
    angle: (angle * 180 / Math.PI + 360) % 360 > 90 && (angle * 180 / Math.PI + 360) % 360 < 270
      ? (angle * 180 / Math.PI + 180) % 360
      : angle * 180 / Math.PI,
    selectable: false, evented: false,
  });
  objs.push(txt);

  const grp = new Group(objs, { selectable: true });
  (grp as any).__layer = layer;
  return grp;
}

/** Радиусный размер по ГОСТ 2.307 п.2.12: R-линия от центра, стрелка на контуре. */
function addRadiusDim(
  fc: Canvas, cx: number, cy: number, r: number, layer: string,
): Group {
  const ang = -Math.PI / 4; // 45° — удобное направление выноски
  const ex = cx + r * Math.cos(ang), ey = cy + r * Math.sin(ang);

  const objs: any[] = [];
  objs.push(new Line([cx, cy, ex, ey], {
    stroke: DIM_COLOR, strokeWidth: DIM_SW, selectable: false, evented: false,
  }));
  makeArrow(ex, ey, ang).forEach(([x1, y1, x2, y2]) =>
    objs.push(new Line([x1, y1, x2, y2], { stroke: DIM_COLOR, strokeWidth: DIM_SW + 0.2, selectable: false, evented: false }))
  );
  const txt = new IText(`R${Math.round(r)}`, {
    left: cx, top: cy - DIM_FONT_SZ - 2,
    fontSize: DIM_FONT_SZ, fontFamily: FONT_FAMILY,
    fill: DIM_COLOR, originX: "center", originY: "bottom",
    selectable: false, evented: false,
  });
  objs.push(txt);

  const grp = new Group(objs, { selectable: true });
  (grp as any).__layer = layer;
  return grp;
}

/** Диаметральный размер по ГОСТ 2.307 п.2.11: линия через центр, стрелки, знак ∅. */
function addDiameterDim(
  fc: Canvas, cx: number, cy: number, r: number, layer: string,
): Group {
  const x1 = cx - r, y1 = cy, x2 = cx + r, y2 = cy;

  const objs: any[] = [];
  objs.push(new Line([x1, y1, x2, y2], {
    stroke: DIM_COLOR, strokeWidth: DIM_SW, selectable: false, evented: false,
  }));
  makeArrow(x1, y1, Math.PI).forEach(([ax1, ay1, ax2, ay2]) =>
    objs.push(new Line([ax1, ay1, ax2, ay2], { stroke: DIM_COLOR, strokeWidth: DIM_SW + 0.2, selectable: false, evented: false }))
  );
  makeArrow(x2, y2, 0).forEach(([ax1, ay1, ax2, ay2]) =>
    objs.push(new Line([ax1, ay1, ax2, ay2], { stroke: DIM_COLOR, strokeWidth: DIM_SW + 0.2, selectable: false, evented: false }))
  );
  const txt = new IText(`∅${Math.round(r * 2)}`, {
    left: cx, top: cy - DIM_FONT_SZ - 2,
    fontSize: DIM_FONT_SZ, fontFamily: FONT_FAMILY,
    fill: DIM_COLOR, originX: "center", originY: "bottom",
    selectable: false, evented: false,
  });
  objs.push(txt);

  const grp = new Group(objs, { selectable: true });
  (grp as any).__layer = layer;
  return grp;
}

interface DrawingDeps {
  fabricRef:       MutableRefObject<Canvas | null>;
  drawingRef:      MutableRefObject<boolean>;
  startRef:        MutableRefObject<{ x: number; y: number }>;
  activeShapeRef:  MutableRefObject<any>;
  polyPointsRef:   MutableRefObject<{ x: number; y: number }[]>;
  snapRef:         MutableRefObject<boolean>;
  activeLayerRef:  MutableRefObject<string>;
  setCoords:       (c: { x: number; y: number }) => void;
  setTool:         (t: Tool) => void;
  saveHistory:     (fc: Canvas) => void;
  part?:           PartInfo | null;
}

export function useCad2DDrawing({
  fabricRef, drawingRef, startRef, activeShapeRef, polyPointsRef,
  snapRef, activeLayerRef, setCoords, setTool, saveHistory, part,
}: DrawingDeps) {

  /* ── вставка детали из библиотеки с проекциями и ГОСТ-размерами ── */
  const insertPartDrawing = useCallback(() => {
    const fc = fabricRef.current; if (!fc || !part) return;
    const L = part.dim_length ?? 200;
    const W = part.dim_width  ?? 100;
    const H = part.dim_height ?? 50;
    const SCALE = 1;
    const ox = 80, oy = 80;
    const OFFSET = 30; // отступ размерных линий

    // Три вида
    const frontRect = new Rect({ left: ox, top: oy, width: L * SCALE, height: H * SCALE, stroke: "#000", strokeWidth: 1.5, fill: "transparent" });
    (frontRect as any).__layer = "layer-0";
    const topRect = new Rect({ left: ox, top: oy + H * SCALE + 40, width: L * SCALE, height: W * SCALE, stroke: "#000", strokeWidth: 1.5, fill: "transparent" });
    (topRect as any).__layer = "layer-0";
    const sideRect = new Rect({ left: ox + L * SCALE + 40, top: oy, width: W * SCALE, height: H * SCALE, stroke: "#000", strokeWidth: 1.5, fill: "transparent" });
    (sideRect as any).__layer = "layer-0";

    // Осевые линии (ГОСТ 2.303 тип 04: штрихпунктир)
    const axH = new Line([ox - 10, oy + H * SCALE / 2, ox + L * SCALE + 10, oy + H * SCALE / 2], { stroke: "#dc2626", strokeWidth: 0.5, strokeDashArray: [8, 3, 2, 3] });
    const axV = new Line([ox + L * SCALE / 2, oy - 10, ox + L * SCALE / 2, oy + H * SCALE + 10], { stroke: "#dc2626", strokeWidth: 0.5, strokeDashArray: [8, 3, 2, 3] });
    (axH as any).__layer = "layer-2"; (axV as any).__layer = "layer-2";

    // ГОСТ-размеры (через addLinearDim)
    const dimL = addLinearDim(fc, ox, oy, ox + L * SCALE, oy, -OFFSET, `${L}`, "layer-1");
    const dimH = addLinearDim(fc, ox, oy, ox, oy + H * SCALE, -OFFSET, `${H}`, "layer-1");
    const dimW = addLinearDim(fc, ox, oy + H * SCALE + 40, ox + W * SCALE, oy + H * SCALE + 40, -OFFSET, `${W}`, "layer-1");

    // Подписи видов (ГОСТ 2.305)
    const lblFront = new IText("А", { left: ox + L * SCALE / 2, top: oy - 18, fontSize: 11, fill: "#000", fontFamily: FONT_FAMILY, originX: "center" });
    const lblTop   = new IText("Вид сверху",  { left: ox, top: oy + H * SCALE + 40 + W * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: FONT_FAMILY });
    const lblSide  = new IText("Вид сбоку",   { left: ox + L * SCALE + 40, top: oy + H * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: FONT_FAMILY });
    [(lblFront as any), (lblTop as any), (lblSide as any)].forEach((o) => { (o as any).__layer = "layer-1"; });

    const stamp = new IText(
      `${part.code}  ${part.name}\nМатериал: ${part.material ?? "—"}  Стандарт: ${part.standard ?? "—"}`,
      { left: ox, top: oy + H * SCALE + 40 + W * SCALE + 20, fontSize: 10, fill: "#000", fontFamily: FONT_FAMILY, lineHeight: 1.4 }
    );

    [frontRect, topRect, sideRect, axH, axV, dimL, dimH, dimW,
     lblFront, lblTop, lblSide, stamp].forEach((o) => fc.add(o));

    fc.renderAll();
    saveHistory(fc);
  }, [part, saveHistory, fabricRef]);

  /* ── события мыши ── */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;

    const onMove = (opt: TPointerEventInfo) => {
      const p = fc.getViewportPoint(opt.e as MouseEvent);
      const x = snapRef.current ? snapToGrid(p.x) : Math.round(p.x);
      const y = snapRef.current ? snapToGrid(p.y) : Math.round(p.y);
      setCoords({ x, y });
      if (!drawingRef.current || !activeShapeRef.current) return;
      const { x: sx, y: sy } = startRef.current;
      const sh = activeShapeRef.current;
      if (sh instanceof Line)    sh.set({ x2: x, y2: y });
      else if (sh instanceof Rect)    sh.set({ left: Math.min(sx, x), top: Math.min(sy, y), width: Math.abs(x - sx), height: Math.abs(y - sy) });
      else if (sh instanceof Circle)  sh.set({ radius: Math.sqrt((x - sx) ** 2 + (y - sy) ** 2) });
      else if (sh instanceof Ellipse) sh.set({ rx: Math.abs(x - sx) / 2, ry: Math.abs(y - sy) / 2, left: Math.min(sx, x) + Math.abs(x - sx) / 2, top: Math.min(sy, y) + Math.abs(y - sy) / 2 });
      fc.renderAll();
    };

    const onDown = (opt: TPointerEventInfo) => {
      const t = (fc as any).__tool as Tool;
      const p = fc.getViewportPoint(opt.e as MouseEvent);
      const x = snapRef.current ? snapToGrid(p.x) : Math.round(p.x);
      const y = snapRef.current ? snapToGrid(p.y) : Math.round(p.y);

      if (t === "select" || t === "move") return;

      if (t === "erase") {
        const target = fc.findTarget(opt.e as MouseEvent);
        if (target && !(target as any).__grid && !(target as any).__frame) {
          fc.remove(target); fc.renderAll(); saveHistory(fc);
        }
        return;
      }

      if (t === "polyline") {
        if (polyPointsRef.current.length === 0) drawingRef.current = true;
        polyPointsRef.current.push({ x, y });
        if (polyPointsRef.current.length >= 2) {
          const pts = polyPointsRef.current;
          const last = pts[pts.length - 2];
          const l = new Line([last.x, last.y, x, y], {
            stroke: (fc as any).__color ?? "#000",
            strokeWidth: (fc as any).__strokeW ?? 1,
            fill: (fc as any).__color ?? "#000",
            selectable: true,
          });
          (l as any).__layer = activeLayerRef.current;
          fc.add(l); fc.renderAll();
        }
        return;
      }

      if (t === "text" || t === "mtext") {
        const txt = new IText(t === "mtext" ? "Многострочный\nтекст" : "Текст", {
          left: x, top: y, fontSize: 14,
          fill: (fc as any).__color ?? "#000", fontFamily: FONT_FAMILY,
        });
        (txt as any).__layer = activeLayerRef.current;
        fc.add(txt); fc.setActiveObject(txt); fc.renderAll(); return;
      }

      if (t === "hatch") {
        const hSize = 60;
        const lines: Line[] = [];
        for (let i = 0; i < hSize; i += 8) {
          const l = new Line([x, y + i, x + hSize, y + i - hSize], {
            stroke: (fc as any).__color ?? "#000", strokeWidth: 0.5, selectable: false,
          });
          lines.push(l);
        }
        const grp = new Group(lines, { selectable: true, left: x, top: y });
        (grp as any).__layer = activeLayerRef.current;
        fc.add(grp); fc.renderAll(); saveHistory(fc); return;
      }

      startRef.current = { x, y };
      drawingRef.current = true;
      fc.selection = false;

      const color = (fc as any).__color ?? "#000";
      const sw = (fc as any).__strokeW ?? 1;
      const props = { stroke: color, strokeWidth: sw, fill: "transparent" };
      let shape: any = null;

      if (t === "line" || t === "dimension" ||
          t === "dim-aligned" || t === "dim-radius" || t === "dim-diameter" ||
          t === "dim-angular" || t === "leader")
        shape = new Line([x, y, x, y], { ...props, fill: color });
      else if (t === "rect")    shape = new Rect({ left: x, top: y, width: 0, height: 0, ...props });
      else if (t === "circle")  shape = new Circle({ left: x, top: y, radius: 0, ...props });
      else if (t === "ellipse") shape = new Ellipse({ left: x, top: y, rx: 0, ry: 0, ...props });
      else if (t === "arc")     shape = new Path(`M ${x} ${y} A 1 1 0 0 1 ${x+1} ${y+1}`, { ...props });

      if (shape) {
        (shape as any).__layer = activeLayerRef.current;
        fc.add(shape); activeShapeRef.current = shape;
      }
    };

    const onUp = (opt: TPointerEventInfo) => {
      const t = (fc as any).__tool as Tool;
      if (t === "polyline") return;
      if (!drawingRef.current) return;
      drawingRef.current = false; fc.selection = true;
      const p = fc.getViewportPoint(opt.e as MouseEvent);
      const ex = snapRef.current ? snapToGrid(p.x) : Math.round(p.x);
      const ey = snapRef.current ? snapToGrid(p.y) : Math.round(p.y);
      const sh = activeShapeRef.current;
      const { x: sx, y: sy } = startRef.current;
      const DIM_LAYER = "layer-1";

      // ── Линейный размер (ГОСТ 2.307 п.2.1) ──────────────────────
      if ((t === "dimension" || t === "dim-aligned") && sh instanceof Line) {
        fc.remove(sh);
        const dist = Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2));
        if (dist > 3) {
          const grp = addLinearDim(fc, sx, sy, ex, ey, -28, `${dist}`, DIM_LAYER);
          fc.add(grp);
        }
      }

      // ── Радиусный размер (ГОСТ 2.307 п.2.12) ─────────────────────
      else if (t === "dim-radius" && sh instanceof Line) {
        fc.remove(sh);
        const r = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        if (r > 3) {
          const grp = addRadiusDim(fc, sx, sy, r, DIM_LAYER);
          fc.add(grp);
        }
      }

      // ── Диаметральный размер (ГОСТ 2.307 п.2.11) ─────────────────
      else if (t === "dim-diameter" && sh instanceof Line) {
        fc.remove(sh);
        const r = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        if (r > 3) {
          const grp = addDiameterDim(fc, sx, sy, r, DIM_LAYER);
          fc.add(grp);
        }
      }

      // ── Угловой размер (ГОСТ 2.307 п.2.9) — заглушка ────────────
      else if (t === "dim-angular" && sh instanceof Line) {
        fc.remove(sh);
        const dist = Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2));
        const angleDeg = Math.round(Math.atan2(ey - sy, ex - sx) * 180 / Math.PI);
        if (dist > 3) {
          const lbl = new IText(`${Math.abs(angleDeg)}°`, {
            left: (sx + ex) / 2, top: (sy + ey) / 2 - 14,
            fontSize: DIM_FONT_SZ, fontFamily: FONT_FAMILY,
            fill: DIM_COLOR, originX: "center",
          });
          (lbl as any).__layer = DIM_LAYER;
          fc.add(lbl);
        }
      }

      // ── Выноска (ГОСТ 2.307 п.2.17) ──────────────────────────────
      else if (t === "leader" && sh instanceof Line) {
        fc.remove(sh);
        const dist = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        if (dist > 5) {
          const angle = Math.atan2(ey - sy, ex - sx);
          const leaderLine = new Line([sx, sy, ex, ey], {
            stroke: DIM_COLOR, strokeWidth: DIM_SW, selectable: false, evented: false,
          });
          // Стрелка в начале выноски
          const arrows = makeArrow(sx, sy, angle + Math.PI).map(([x1, y1, x2, y2]) =>
            new Line([x1, y1, x2, y2], { stroke: DIM_COLOR, strokeWidth: DIM_SW + 0.2, selectable: false, evented: false })
          );
          // Полочка (горизонтальная линия от конца)
          const shelfLen = 20;
          const shelf = new Line([ex, ey, ex + shelfLen, ey], {
            stroke: DIM_COLOR, strokeWidth: DIM_SW, selectable: false, evented: false,
          });
          const txt = new IText("Текст", {
            left: ex + 2, top: ey - DIM_FONT_SZ - 1,
            fontSize: DIM_FONT_SZ - 1, fontFamily: FONT_FAMILY, fill: DIM_COLOR,
          });
          const grp = new Group([leaderLine, ...arrows, shelf, txt], { selectable: true });
          (grp as any).__layer = DIM_LAYER;
          fc.add(grp);
        }
      }

      // ── Дуга ─────────────────────────────────────────────────────
      else if (t === "arc" && sh) {
        const r = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        fc.remove(sh);
        const arc = new Path(`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`, {
          stroke: (fc as any).__color ?? "#000", strokeWidth: (fc as any).__strokeW ?? 1,
          fill: "transparent", selectable: true,
        });
        (arc as any).__layer = activeLayerRef.current;
        fc.add(arc);
        // Авторазмер: радиус дуги
        if (r > 5) {
          const cx2 = (sx + ex) / 2, cy2 = (sy + ey) / 2;
          const grp = addRadiusDim(fc, cx2, cy2, r / 2, DIM_LAYER);
          fc.add(grp);
        }
      }

      // ── Прямоугольник — авторазмеры ширины и высоты ──────────────
      else if (t === "rect" && sh instanceof Rect) {
        const w = Math.abs(ex - sx), h2 = Math.abs(ey - sy);
        if (w > 5 && h2 > 5) {
          const lx = Math.min(sx, ex), ty2 = Math.min(sy, ey);
          const dimW2 = addLinearDim(fc, lx, ty2, lx + w, ty2, -24, `${Math.round(w)}`, DIM_LAYER);
          const dimH2 = addLinearDim(fc, lx, ty2, lx, ty2 + h2, -24, `${Math.round(h2)}`, DIM_LAYER);
          fc.add(dimW2); fc.add(dimH2);
        }
      }

      // ── Окружность — авторазмер диаметра ─────────────────────────
      else if (t === "circle" && sh instanceof Circle) {
        const r = sh.radius ?? 0;
        if (r > 5) {
          const cx2 = (sh.left ?? 0) + r, cy2 = (sh.top ?? 0) + r;
          const grp = addDiameterDim(fc, cx2, cy2, r, DIM_LAYER);
          fc.add(grp);
        }
      }

      // ── Эллипс — авторазмеры осей ────────────────────────────────
      else if (t === "ellipse" && sh instanceof Ellipse) {
        const rx = sh.rx ?? 0, ry = sh.ry ?? 0;
        const cx2 = sh.left ?? 0, cy2 = sh.top ?? 0;
        if (rx > 5 && ry > 5) {
          const dimRx = addLinearDim(fc, cx2 - rx, cy2, cx2 + rx, cy2, -20, `${Math.round(rx * 2)}`, DIM_LAYER);
          const dimRy = addLinearDim(fc, cx2, cy2 - ry, cx2, cy2 + ry, -20, `${Math.round(ry * 2)}`, DIM_LAYER);
          fc.add(dimRx); fc.add(dimRy);
        }
      }

      // ── Отрезок — авторазмер длины ───────────────────────────────
      else if (t === "line" && sh instanceof Line) {
        const len = Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2));
        if (len > 5) {
          const grp = addLinearDim(fc, sx, sy, ex, ey, -20, `${len}`, DIM_LAYER);
          fc.add(grp);
        }
      }

      activeShapeRef.current = null;
      fc.renderAll();
      saveHistory(fc);
    };

    const onDblClick = () => {
      const t = (fc as any).__tool as Tool;
      if (t === "polyline") {
        polyPointsRef.current = [];
        drawingRef.current = false;
        saveHistory(fc);
      }
    };

    fc.on("mouse:down",     onDown     as any);
    fc.on("mouse:move",     onMove     as any);
    fc.on("mouse:up",       onUp       as any);
    fc.on("mouse:dblclick", onDblClick as any);
    return () => {
      fc.off("mouse:down",     onDown     as any);
      fc.off("mouse:move",     onMove     as any);
      fc.off("mouse:up",       onUp       as any);
      fc.off("mouse:dblclick", onDblClick as any);
    };
  }, [saveHistory, fabricRef, drawingRef, startRef, activeShapeRef, polyPointsRef, snapRef, activeLayerRef, setCoords]);

  return { insertPartDrawing };
}
