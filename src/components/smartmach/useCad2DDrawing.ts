/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, type MutableRefObject } from "react";
import {
  Canvas, Line, Circle, Rect, IText, Group, Ellipse, Path,
  type TPointerEventInfo,
} from "fabric";
import { type Tool, type PartInfo } from "@/components/smartmach/cad.data";
import { snapToGrid } from "@/components/smartmach/cad2d.data";

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

  /* ── вставка детали из библиотеки ── */
  const insertPartDrawing = useCallback(() => {
    const fc = fabricRef.current; if (!fc || !part) return;
    const L = part.dim_length ?? 200;
    const W = part.dim_width  ?? 100;
    const H = part.dim_height ?? 50;
    const SCALE = 1;
    const ox = 80, oy = 80;

    const frontRect = new Rect({ left: ox, top: oy, width: L * SCALE, height: H * SCALE, stroke: "#000", strokeWidth: 1.5, fill: "transparent" });
    (frontRect as any).__layer = "layer-0";

    const topRect = new Rect({ left: ox, top: oy + H * SCALE + 40, width: L * SCALE, height: W * SCALE, stroke: "#000", strokeWidth: 1.5, fill: "transparent" });
    (topRect as any).__layer = "layer-0";

    const sideRect = new Rect({ left: ox + L * SCALE + 40, top: oy, width: W * SCALE, height: H * SCALE, stroke: "#000", strokeWidth: 1.5, fill: "transparent" });
    (sideRect as any).__layer = "layer-0";

    const axH = new Line([ox - 10, oy + H * SCALE / 2, ox + L * SCALE + 10, oy + H * SCALE / 2], { stroke: "#dc2626", strokeWidth: 0.5, strokeDashArray: [6, 4] });
    const axV = new Line([ox + L * SCALE / 2, oy - 10, ox + L * SCALE / 2, oy + H * SCALE + 10], { stroke: "#dc2626", strokeWidth: 0.5, strokeDashArray: [6, 4] });
    (axH as any).__layer = "layer-2"; (axV as any).__layer = "layer-2";

    const dimY = oy - 25;
    const dimLineL = new Line([ox, dimY, ox + L * SCALE, dimY], { stroke: "#1e40af", strokeWidth: 0.8 });
    const dimTextL = new IText(`${L}`, { left: ox + L * SCALE / 2 - 15, top: dimY - 14, fontSize: 11, fill: "#1e40af", fontFamily: "Inter, sans-serif" });
    const tickL1 = new Line([ox, dimY - 4, ox, dimY + 4], { stroke: "#1e40af", strokeWidth: 0.8 });
    const tickL2 = new Line([ox + L * SCALE, dimY - 4, ox + L * SCALE, dimY + 4], { stroke: "#1e40af", strokeWidth: 0.8 });

    const dimX = ox - 25;
    const dimLineH = new Line([dimX, oy, dimX, oy + H * SCALE], { stroke: "#1e40af", strokeWidth: 0.8 });
    const dimTextH = new IText(`${H}`, { left: dimX - 22, top: oy + H * SCALE / 2 - 7, fontSize: 11, fill: "#1e40af", fontFamily: "Inter, sans-serif" });
    const tickH1 = new Line([dimX - 4, oy, dimX + 4, oy], { stroke: "#1e40af", strokeWidth: 0.8 });
    const tickH2 = new Line([dimX - 4, oy + H * SCALE, dimX + 4, oy + H * SCALE], { stroke: "#1e40af", strokeWidth: 0.8 });

    const dimYW = oy + H * SCALE + 40 - 20;
    const dimLineW = new Line([ox, dimYW, ox + W * SCALE, dimYW], { stroke: "#1e40af", strokeWidth: 0.8 });
    const dimTextW = new IText(`${W}`, { left: ox + W * SCALE / 2 - 10, top: dimYW - 14, fontSize: 11, fill: "#1e40af", fontFamily: "Inter, sans-serif" });
    const tickW1 = new Line([ox, dimYW - 4, ox, dimYW + 4], { stroke: "#1e40af", strokeWidth: 0.8 });
    const tickW2 = new Line([ox + W * SCALE, dimYW - 4, ox + W * SCALE, dimYW + 4], { stroke: "#1e40af", strokeWidth: 0.8 });

    const lblFront = new IText("Вид спереди", { left: ox, top: oy + H * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: "Inter, sans-serif" });
    const lblTop   = new IText("Вид сверху",  { left: ox, top: oy + H * SCALE + 40 + W * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: "Inter, sans-serif" });
    const lblSide  = new IText("Вид сбоку",   { left: ox + L * SCALE + 40, top: oy + H * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: "Inter, sans-serif" });

    const stamp = new IText(
      `${part.code}  ${part.name}\nМатериал: ${part.material ?? "—"}  Стандарт: ${part.standard ?? "—"}`,
      { left: ox, top: oy + H * SCALE + 40 + W * SCALE + 20, fontSize: 10, fill: "#000", fontFamily: "Inter, sans-serif", lineHeight: 1.4 }
    );

    [frontRect, topRect, sideRect, axH, axV,
     dimLineL, dimTextL, tickL1, tickL2,
     dimLineH, dimTextH, tickH1, tickH2,
     dimLineW, dimTextW, tickW1, tickW2,
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

      if (t === "text") {
        const txt = new IText("Текст", { left: x, top: y, fontSize: 14, fill: (fc as any).__color ?? "#000", fontFamily: "Inter, sans-serif" });
        (txt as any).__layer = activeLayerRef.current;
        fc.add(txt); fc.setActiveObject(txt); fc.renderAll(); return;
      }

      if (t === "hatch") {
        const hSize = 60;
        const lines: Line[] = [];
        for (let i = 0; i < hSize; i += 8) {
          const l = new Line([x, y + i, x + hSize, y + i - hSize], { stroke: (fc as any).__color ?? "#000", strokeWidth: 0.5, selectable: false });
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

      if (t === "line" || t === "dimension") shape = new Line([x, y, x, y], { ...props, fill: color });
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

      if (t === "dimension" && sh instanceof Line) {
        const { x: sx, y: sy } = startRef.current;
        const dist = Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2));
        const lbl = new IText(`${dist}`, { left: (sx + ex) / 2, top: (sy + ey) / 2 - 14, fontSize: 11, fill: "#1e40af", fontFamily: "Inter, sans-serif" });
        const tickLen = 6;
        const angle = Math.atan2(ey - sy, ex - sx);
        const perpX = Math.cos(angle + Math.PI / 2) * tickLen;
        const perpY = Math.sin(angle + Math.PI / 2) * tickLen;
        const t1 = new Line([sx - perpX, sy - perpY, sx + perpX, sy + perpY], { stroke: "#1e40af", strokeWidth: 0.8 });
        const t2 = new Line([ex - perpX, ey - perpY, ex + perpX, ey + perpY], { stroke: "#1e40af", strokeWidth: 0.8 });
        const grp = new Group([sh, lbl, t1, t2], { selectable: true });
        (grp as any).__layer = "layer-1";
        fc.remove(sh); fc.add(grp);
      } else if (t === "arc" && sh) {
        const { x: sx, y: sy } = startRef.current;
        const r = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        fc.remove(sh);
        const arc = new Path(`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`, {
          stroke: (fc as any).__color ?? "#000", strokeWidth: (fc as any).__strokeW ?? 1,
          fill: "transparent", selectable: true,
        });
        (arc as any).__layer = activeLayerRef.current;
        fc.add(arc);
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
