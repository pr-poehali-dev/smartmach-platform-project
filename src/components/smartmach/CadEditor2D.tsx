/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Canvas, Line, Circle, Rect, IText, Group, Ellipse, Path,
  type TPointerEventInfo,
} from "fabric";
import Icon from "@/components/ui/icon";
import { type PartInfo } from "@/components/smartmach/cad.data";

/* ─── типы ───────────────────────────────────────────────────── */
type Tool = "select" | "line" | "polyline" | "rect" | "circle" | "ellipse"
          | "arc" | "dimension" | "text" | "hatch" | "erase" | "move";

interface Layer { id: string; name: string; color: string; visible: boolean; locked: boolean; }

/* ─── константы ──────────────────────────────────────────────── */
const TOOLS: { id: Tool; icon: string; label: string; group: string }[] = [
  { id: "select",    icon: "MousePointer", label: "Выбор (V)",          group: "nav" },
  { id: "move",      icon: "Move",         label: "Переместить (M)",    group: "nav" },
  { id: "line",      icon: "Minus",        label: "Отрезок (L)",        group: "draw" },
  { id: "polyline",  icon: "Spline",       label: "Полилиния (P)",      group: "draw" },
  { id: "rect",      icon: "Square",       label: "Прямоугольник (R)",  group: "draw" },
  { id: "circle",    icon: "Circle",       label: "Окружность (C)",     group: "draw" },
  { id: "ellipse",   icon: "Ellipsis",     label: "Эллипс (E)",         group: "draw" },
  { id: "arc",       icon: "Aperture",     label: "Дуга (A)",           group: "draw" },
  { id: "dimension", icon: "Ruler",        label: "Размер (D)",         group: "annotate" },
  { id: "text",      icon: "Type",         label: "Текст (T)",          group: "annotate" },
  { id: "hatch",     icon: "Grid2x2",      label: "Штриховка (H)",      group: "annotate" },
  { id: "erase",     icon: "Eraser",       label: "Удалить (Del)",      group: "edit" },
];

const LAYER_COLORS = ["#000000", "#1e40af", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#d97706"];
const STROKES = [0.3, 0.5, 1, 1.5, 2, 3];
const GRID = 20;
const GRID_MAJOR = 100;

const LINE_TYPES = ["Сплошная", "Штриховая", "Осевая", "Пунктирная"];

const PAPER_SIZES: Record<string, [number, number]> = {
  "A4 гориз.":  [1122, 794],
  "A4 верт.":   [794, 1122],
  "A3 гориз.":  [1587, 1122],
  "A3 верт.":   [1122, 1587],
  "A2 гориз.":  [2245, 1587],
  "Свободно":   [0, 0],
};

function snapToGrid(v: number, size = GRID) { return Math.round(v / size) * size; }

/* ─── компонент ──────────────────────────────────────────────── */
export default function CadEditor2D({ part }: { part?: PartInfo | null }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fabricRef    = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef   = useRef(false);
  const startRef     = useRef({ x: 0, y: 0 });
  const activeShapeRef  = useRef<any>(null);
  const polyPointsRef   = useRef<{ x: number; y: number }[]>([]);
  const showGridRef     = useRef(true);
  const snapRef         = useRef(true);
  const historyRef      = useRef<string[]>([]);
  const clipboardRef    = useRef<any[]>([]);
  const activeLayerRef  = useRef("layer-0");

  const [tool,      setTool]      = useState<Tool>("select");
  const [strokeW,   setStrokeW]   = useState(1);
  const [lineType,  setLineType]  = useState(LINE_TYPES[0]);
  const [showGrid,  setShowGrid]  = useState(true);
  const [snapGrid,  setSnapGrid]  = useState(true);
  const [zoom,      setZoom]      = useState(1);
  const [coords,    setCoords]    = useState({ x: 0, y: 0 });
  const [histIdx,   setHistIdx]   = useState(0);
  const [histLen,   setHistLen]   = useState(1);
  const [paperSize, setPaperSize] = useState("A4 гориз.");
  const [layers,    setLayers]    = useState<Layer[]>([
    { id: "layer-0", name: "Основной", color: "#000000", visible: true, locked: false },
    { id: "layer-1", name: "Размеры",  color: "#1e40af", visible: true, locked: false },
    { id: "layer-2", name: "Осевые",   color: "#dc2626", visible: true, locked: false },
  ]);
  const [activeLayer, setActiveLayerState] = useState("layer-0");
  const [showLayers,  setShowLayers]  = useState(false);
  const [showProps,   setShowProps]   = useState(false);
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [showPartPanel, setShowPartPanel] = useState(!!part);

  /* ── helpers ─── */
  const getColor = useCallback(() => {
    const l = layers.find((lay) => lay.id === activeLayerRef.current);
    return l?.color ?? "#000000";
  }, [layers]);

  const drawGrid = useCallback((fc: Canvas, w: number, h: number) => {
    if (!showGridRef.current) return;
    for (let x = 0; x <= w; x += GRID) {
      const isMajor = x % GRID_MAJOR === 0;
      const l = new Line([x, 0, x, h], {
        stroke: isMajor ? "#c8d0e0" : "#e8edf5",
        strokeWidth: isMajor ? 0.6 : 0.3,
        selectable: false, evented: false,
      });
      (l as any).__grid = true;
      fc.add(l);
    }
    for (let y = 0; y <= h; y += GRID) {
      const isMajor = y % GRID_MAJOR === 0;
      const l = new Line([0, y, w, y], {
        stroke: isMajor ? "#c8d0e0" : "#e8edf5",
        strokeWidth: isMajor ? 0.6 : 0.3,
        selectable: false, evented: false,
      });
      (l as any).__grid = true;
      fc.add(l);
    }
    fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.sendObjectToBack(o));
  }, []);

  const saveHistory = useCallback((fc: Canvas) => {
    const json = JSON.stringify(fc.toJSON());
    const next = historyRef.current.slice(0, historyRef.current.length + 1);
    next.push(json);
    historyRef.current = next;
    setHistIdx(next.length - 1);
    setHistLen(next.length);
  }, []);

  /* ── вставка детали из библиотеки с авторазмерами ─── */
  const insertPartDrawing = useCallback(() => {
    const fc = fabricRef.current; if (!fc || !part) return;
    const L = part.dim_length ?? 200;
    const W = part.dim_width  ?? 100;
    const H = part.dim_height ?? 50;
    const SCALE = 1; // 1 мм = 1 px в редакторе
    const ox = 80, oy = 80; // начало вставки

    // Вид спереди (L × H)
    const frontRect = new Rect({
      left: ox, top: oy,
      width: L * SCALE, height: H * SCALE,
      stroke: "#000", strokeWidth: 1.5, fill: "transparent",
    });
    (frontRect as any).__layer = "layer-0";

    // Вид сверху (L × W)
    const topRect = new Rect({
      left: ox, top: oy + H * SCALE + 40,
      width: L * SCALE, height: W * SCALE,
      stroke: "#000", strokeWidth: 1.5, fill: "transparent",
    });
    (topRect as any).__layer = "layer-0";

    // Вид сбоку (W × H)
    const sideRect = new Rect({
      left: ox + L * SCALE + 40, top: oy,
      width: W * SCALE, height: H * SCALE,
      stroke: "#000", strokeWidth: 1.5, fill: "transparent",
    });
    (sideRect as any).__layer = "layer-0";

    // Осевые линии
    const axH = new Line([ox - 10, oy + H * SCALE / 2, ox + L * SCALE + 10, oy + H * SCALE / 2], { stroke: "#dc2626", strokeWidth: 0.5, strokeDashArray: [6, 4] });
    const axV = new Line([ox + L * SCALE / 2, oy - 10, ox + L * SCALE / 2, oy + H * SCALE + 10], { stroke: "#dc2626", strokeWidth: 0.5, strokeDashArray: [6, 4] });
    (axH as any).__layer = "layer-2"; (axV as any).__layer = "layer-2";

    // Размерная линия: длина (горизонталь)
    const dimY = oy - 25;
    const dimLineL = new Line([ox, dimY, ox + L * SCALE, dimY], { stroke: "#1e40af", strokeWidth: 0.8 });
    const dimTextL = new IText(`${L}`, { left: ox + L * SCALE / 2 - 15, top: dimY - 14, fontSize: 11, fill: "#1e40af", fontFamily: "Inter, sans-serif" });
    const tickL1 = new Line([ox, dimY - 4, ox, dimY + 4], { stroke: "#1e40af", strokeWidth: 0.8 });
    const tickL2 = new Line([ox + L * SCALE, dimY - 4, ox + L * SCALE, dimY + 4], { stroke: "#1e40af", strokeWidth: 0.8 });

    // Размерная линия: высота (вертикаль)
    const dimX = ox - 25;
    const dimLineH = new Line([dimX, oy, dimX, oy + H * SCALE], { stroke: "#1e40af", strokeWidth: 0.8 });
    const dimTextH = new IText(`${H}`, { left: dimX - 22, top: oy + H * SCALE / 2 - 7, fontSize: 11, fill: "#1e40af", fontFamily: "Inter, sans-serif" });
    const tickH1 = new Line([dimX - 4, oy, dimX + 4, oy], { stroke: "#1e40af", strokeWidth: 0.8 });
    const tickH2 = new Line([dimX - 4, oy + H * SCALE, dimX + 4, oy + H * SCALE], { stroke: "#1e40af", strokeWidth: 0.8 });

    // Размерная линия: ширина (вид сверху)
    const dimYW = oy + H * SCALE + 40 - 20;
    const dimLineW = new Line([ox, dimYW, ox + W * SCALE, dimYW], { stroke: "#1e40af", strokeWidth: 0.8 });
    const dimTextW = new IText(`${W}`, { left: ox + W * SCALE / 2 - 10, top: dimYW - 14, fontSize: 11, fill: "#1e40af", fontFamily: "Inter, sans-serif" });
    const tickW1 = new Line([ox, dimYW - 4, ox, dimYW + 4], { stroke: "#1e40af", strokeWidth: 0.8 });
    const tickW2 = new Line([ox + W * SCALE, dimYW - 4, ox + W * SCALE, dimYW + 4], { stroke: "#1e40af", strokeWidth: 0.8 });

    // Подписи видов
    const lblFront = new IText("Вид спереди", { left: ox, top: oy + H * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: "Inter, sans-serif" });
    const lblTop   = new IText("Вид сверху",  { left: ox, top: oy + H * SCALE + 40 + W * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: "Inter, sans-serif" });
    const lblSide  = new IText("Вид сбоку",   { left: ox + L * SCALE + 40, top: oy + H * SCALE + 4, fontSize: 9, fill: "#666", fontFamily: "Inter, sans-serif" });

    // Штамп с данными детали
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
  }, [part, saveHistory]);

  /* ── инициализация ─── */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const [pw, ph] = PAPER_SIZES["A4 гориз."];
    const w = pw || containerRef.current.clientWidth || 1100;
    const h = ph || 600;
    const fc = new Canvas(canvasRef.current, {
      width: w, height: h, backgroundColor: "#ffffff", selection: true,
    });
    fabricRef.current = fc;
    drawGrid(fc, w, h);
    historyRef.current = [JSON.stringify(fc.toJSON())];
    setHistIdx(0); setHistLen(1);

    fc.on("selection:created", (opt) => setSelectedObj(opt.selected?.[0] ?? null));
    fc.on("selection:updated", (opt) => setSelectedObj(opt.selected?.[0] ?? null));
    fc.on("selection:cleared", () => setSelectedObj(null));

    return () => { fc.dispose(); };
  }, [drawGrid]);

  /* ── обновление сетки ─── */
  useEffect(() => {
    showGridRef.current = showGrid;
    const fc = fabricRef.current; if (!fc) return;
    fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
    if (showGrid) drawGrid(fc, fc.width!, fc.height!);
    fc.renderAll();
  }, [showGrid, drawGrid]);

  /* ── размер листа ─── */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const [pw, ph] = PAPER_SIZES[paperSize];
    if (pw && ph) {
      fc.setWidth(pw); fc.setHeight(ph);
      fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
      if (showGridRef.current) drawGrid(fc, pw, ph);
      // Рамка ЕСКД
      const existing = fc.getObjects().filter((o) => (o as any).__frame);
      existing.forEach((o) => fc.remove(o));
      const frame = new Rect({ left: 20, top: 5, width: pw - 25, height: ph - 10, stroke: "#000", strokeWidth: 1.5, fill: "transparent", selectable: false, evented: false });
      (frame as any).__frame = true;
      fc.add(frame);
      fc.sendObjectToBack(frame);
      fc.renderAll();
    }
  }, [paperSize, drawGrid]);

  /* ── события мыши ─── */
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
      else if (sh instanceof Rect) sh.set({ left: Math.min(sx, x), top: Math.min(sy, y), width: Math.abs(x - sx), height: Math.abs(y - sy) });
      else if (sh instanceof Circle) sh.set({ radius: Math.sqrt((x - sx) ** 2 + (y - sy) ** 2) });
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
        // Простая штриховка — сетка линий в прямоугольнике
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
      else if (t === "arc") {
        shape = new Path(`M ${x} ${y} A 1 1 0 0 1 ${x+1} ${y+1}`, { ...props });
      }

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
        // Засечки размерной линии
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

    fc.on("mouse:down",    onDown    as any);
    fc.on("mouse:move",    onMove    as any);
    fc.on("mouse:up",      onUp      as any);
    fc.on("mouse:dblclick",onDblClick as any);
    return () => {
      fc.off("mouse:down",    onDown    as any);
      fc.off("mouse:move",    onMove    as any);
      fc.off("mouse:up",      onUp      as any);
      fc.off("mouse:dblclick",onDblClick as any);
    };
  }, [saveHistory]);

  /* ── синхронизация инструментов ─── */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    (fc as any).__tool    = tool;
    (fc as any).__color   = getColor();
    (fc as any).__strokeW = strokeW;
    const map: Record<Tool, string> = {
      select: "default", move: "grab", line: "crosshair", polyline: "crosshair",
      rect: "crosshair", circle: "crosshair", ellipse: "crosshair", arc: "crosshair",
      dimension: "crosshair", text: "text", hatch: "crosshair", erase: "not-allowed",
    };
    fc.defaultCursor = map[tool];
  }, [tool, strokeW, getColor]);

  /* ── слой → цвет ─── */
  useEffect(() => {
    activeLayerRef.current = activeLayer;
    const fc = fabricRef.current; if (!fc) return;
    (fc as any).__color = getColor();
  }, [activeLayer, layers, getColor]);

  /* ── снапинг ─── */
  useEffect(() => { snapRef.current = snapGrid; }, [snapGrid]);

  /* ── клавиатура ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fc = fabricRef.current; if (!fc) return;
      if (e.key === "Escape") { polyPointsRef.current = []; drawingRef.current = false; setTool("select"); }
      if (e.key === "Delete" || e.key === "Backspace") {
        fc.getActiveObjects().filter((o) => !(o as any).__grid && !(o as any).__frame).forEach((o) => fc.remove(o));
        fc.discardActiveObject(); fc.renderAll(); saveHistory(fc);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { undo(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { redo(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { copySelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { pasteSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        fc.getObjects().filter((o) => !(o as any).__grid && !(o as any).__frame).forEach((o) => fc.setActiveObject(o));
        e.preventDefault();
      }
      // быстрые клавиши инструментов
      const toolKeys: Record<string, Tool> = { v: "select", m: "move", l: "line", p: "polyline", r: "rect", c: "circle", e: "ellipse", a: "arc", d: "dimension", t: "text", h: "hatch" };
      if (!e.ctrlKey && !e.metaKey && toolKeys[e.key]) setTool(toolKeys[e.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveHistory]); // eslint-disable-line

  const undo = useCallback(() => {
    const fc = fabricRef.current; if (!fc || histIdx <= 0) return;
    const ni = histIdx - 1;
    fc.loadFromJSON(JSON.parse(historyRef.current[ni])).then(() => {
      if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
      fc.renderAll(); setHistIdx(ni);
    });
  }, [histIdx, drawGrid]);

  const redo = useCallback(() => {
    const fc = fabricRef.current; if (!fc || histIdx >= histLen - 1) return;
    const ni = histIdx + 1;
    fc.loadFromJSON(JSON.parse(historyRef.current[ni])).then(() => {
      if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
      fc.renderAll(); setHistIdx(ni);
    });
  }, [histIdx, histLen, drawGrid]);

  const copySelected = () => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getActiveObjects();
    if (objs.length) clipboardRef.current = objs;
  };

  const pasteSelected = () => {
    const fc = fabricRef.current; if (!fc) return;
    clipboardRef.current.forEach((obj) => {
      obj.clone().then((c: any) => {
        c.set({ left: (c.left ?? 0) + 20, top: (c.top ?? 0) + 20 });
        fc.add(c); fc.setActiveObject(c); fc.renderAll();
      });
    });
    saveHistory(fc);
  };

  const clearCanvas = () => {
    const fc = fabricRef.current; if (!fc) return;
    fc.clear(); fc.backgroundColor = "#ffffff";
    if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
    fc.renderAll(); saveHistory(fc);
  };

  const toggleLayer = (id: string) => {
    const fc = fabricRef.current; if (!fc) return;
    setLayers((prev) => {
      const updated = prev.map((l) => l.id === id ? { ...l, visible: !l.visible } : l);
      const hidden = updated.filter((l) => !l.visible).map((l) => l.id);
      fc.getObjects().forEach((o) => {
        if ((o as any).__grid || (o as any).__frame) return;
        o.set("opacity", hidden.includes((o as any).__layer) ? 0 : 1);
      });
      fc.renderAll();
      return updated;
    });
  };

  const handleZoom = (delta: number) => {
    const fc = fabricRef.current; if (!fc) return;
    const nz = Math.max(0.2, Math.min(8, zoom + delta));
    fc.setZoom(nz); setZoom(nz);
  };

  const fitView = () => {
    const fc = fabricRef.current; if (!fc) return;
    fc.setZoom(1); fc.viewportTransform = [1,0,0,1,0,0];
    setZoom(1); fc.renderAll();
  };

  /* ── экспорт DXF ─── */
  const exportDXF = () => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getObjects().filter((o) => !(o as any).__grid && !(o as any).__frame);
    let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
    objs.forEach((obj) => {
      if (obj instanceof Line) {
        dxf += `0\nLINE\n8\n0\n10\n${obj.x1 ?? 0}\n20\n${-(obj.y1 ?? 0)}\n30\n0\n11\n${obj.x2 ?? 0}\n21\n${-(obj.y2 ?? 0)}\n31\n0\n`;
      } else if (obj instanceof Circle) {
        dxf += `0\nCIRCLE\n8\n0\n10\n${(obj.left ?? 0) + (obj.radius ?? 0)}\n20\n${-((obj.top ?? 0) + (obj.radius ?? 0))}\n30\n0\n40\n${obj.radius ?? 0}\n`;
      } else if (obj instanceof Rect) {
        const [x, y, w, h] = [obj.left ?? 0, obj.top ?? 0, obj.width ?? 0, obj.height ?? 0];
        dxf += `0\nLWPOLYLINE\n8\n0\n70\n1\n90\n4\n`;
        [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].forEach(([px, py]) => { dxf += `10\n${px}\n20\n${-py}\n`; });
      } else if (obj instanceof IText) {
        dxf += `0\nTEXT\n8\n0\n10\n${obj.left ?? 0}\n20\n${-(obj.top ?? 0)}\n30\n0\n40\n${obj.fontSize ?? 12}\n1\n${obj.text ?? ""}\n`;
      }
    });
    dxf += `0\nENDSEC\n0\nEOF\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([dxf], { type: "text/plain" }));
    a.download = "drawing.dxf"; a.click();
  };

  /* ── экспорт PNG ─── */
  const exportPNG = () => {
    const fc = fabricRef.current; if (!fc) return;
    const a = document.createElement("a");
    a.href = fc.toDataURL({ format: "png", multiplier: 2 });
    a.download = "drawing.png"; a.click();
  };

  /* ── импорт SVG ─── */
  const importSVG = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".svg";
    input.onchange = (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fc = fabricRef.current; if (!fc) return;
        const svgStr = ev.target?.result as string;
        // Простая вставка SVG через fabric
        const img = new Image();
        const blob = new Blob([svgStr], { type: "image/svg+xml" });
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
          const fabricImg = new (window as any).fabric.Image(img, { left: 50, top: 50 });
          fc.add(fabricImg); fc.renderAll(); saveHistory(fc);
        };
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* ── группировки инструментов ─── */
  const toolGroups = [
    { label: "Навигация",    ids: ["select", "move"] },
    { label: "Рисование",    ids: ["line", "polyline", "rect", "circle", "ellipse", "arc"] },
    { label: "Аннотации",    ids: ["dimension", "text", "hatch"] },
    { label: "Редактирование", ids: ["erase"] },
  ];

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] rounded-xl border border-gray-700 overflow-hidden" style={{ minHeight: 640 }}>

      {/* ── Панель активной детали ── */}
      {part && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-950 border-b border-blue-800 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <Icon name="Box" size={14} className="text-blue-400" />
            <span className="text-blue-300 font-medium">{part.code}</span>
            <span className="text-white font-semibold">{part.name}</span>
            {part.material && <span className="text-blue-300">· {part.material}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-blue-300 ml-2">
            {part.dim_length && <span>L: <b className="text-white">{part.dim_length} мм</b></span>}
            {part.dim_width  && <span>W: <b className="text-white">{part.dim_width} мм</b></span>}
            {part.dim_height && <span>H: <b className="text-white">{part.dim_height} мм</b></span>}
            {!part.dim_length && !part.dim_width && !part.dim_height && part.dimensions && (
              <span className="text-blue-400">{part.dimensions}</span>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={insertPartDrawing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium">
              <Icon name="Download" size={12} />Вставить проекции с размерами
            </button>
            <button onClick={() => setShowPartPanel((v) => !v)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs ${showPartPanel ? "bg-blue-700 text-white" : "text-blue-400 hover:bg-blue-900"}`}>
              <Icon name="SlidersHorizontal" size={12} />Данные
            </button>
          </div>
        </div>
      )}

      {/* ── Дополнительная панель данных детали ── */}
      {part && showPartPanel && (
        <div className="flex gap-6 px-4 py-2.5 bg-gray-900 border-b border-gray-700 text-xs flex-wrap">
          {[
            { label: "Стандарт",    value: part.standard },
            { label: "Допуск",      value: part.tolerance },
            { label: "Шероховатость",value: part.roughness },
            { label: "№ чертежа",   value: part.drawing_number },
            { label: "Масса",       value: part.weight_kg ? `${part.weight_kg} кг` : null },
          ].filter((r) => r.value).map((r) => (
            <div key={r.label}>
              <span className="text-gray-500">{r.label}: </span>
              <span className="text-gray-200 font-medium">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
      {/* ── Левая панель инструментов ── */}
      <div className="w-12 flex flex-col items-center py-2 gap-1 bg-gray-900 border-r border-gray-700 overflow-y-auto">
        {toolGroups.map((grp, gi) => (
          <div key={gi} className="w-full">
            {gi > 0 && <div className="my-1 border-t border-gray-700 mx-2" />}
            {grp.ids.map((tid) => {
              const t = TOOLS.find((t2) => t2.id === tid)!;
              return (
                <button key={t.id} title={t.label} onClick={() => setTool(t.id as Tool)}
                  className={`w-10 h-10 mx-1 rounded-lg flex items-center justify-center transition-colors ${tool === t.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}>
                  <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={16} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Основная область ── */}
      <div className="flex-1 flex flex-col">

        {/* Верхний toolbar */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border-b border-gray-700 flex-wrap">

          {/* Размер листа */}
          <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}
            className="border border-gray-600 bg-gray-800 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none mr-1">
            {Object.keys(PAPER_SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Толщина */}
          <select value={strokeW} onChange={(e) => setStrokeW(Number(e.target.value))}
            className="border border-gray-600 bg-gray-800 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none w-16">
            {STROKES.map((s) => <option key={s} value={s}>{s} мм</option>)}
          </select>

          {/* Тип линии */}
          <select value={lineType} onChange={(e) => setLineType(e.target.value)}
            className="border border-gray-600 bg-gray-800 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none w-28">
            {LINE_TYPES.map((lt) => <option key={lt} value={lt}>{lt}</option>)}
          </select>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Undo/Redo/Copy/Paste/Del */}
          {[
            { icon: "Undo",       title: "Отменить (Ctrl+Z)",   fn: undo,        disabled: histIdx <= 0 },
            { icon: "Redo",       title: "Повторить (Ctrl+Y)",  fn: redo,        disabled: histIdx >= histLen - 1 },
            { icon: "Copy",       title: "Копировать (Ctrl+C)", fn: copySelected, disabled: false },
            { icon: "Clipboard",  title: "Вставить (Ctrl+V)",   fn: pasteSelected, disabled: false },
            { icon: "Trash2",     title: "Удалить (Del)",       fn: () => {
              const fc = fabricRef.current; if (!fc) return;
              fc.getActiveObjects().filter((o) => !(o as any).__grid && !(o as any).__frame).forEach((o) => fc.remove(o));
              fc.discardActiveObject(); fc.renderAll(); saveHistory(fc);
            }, disabled: false },
            { icon: "RotateCcw",  title: "Очистить всё",        fn: clearCanvas, disabled: false },
          ].map((a) => (
            <button key={a.icon} title={a.title} onClick={a.fn} disabled={a.disabled}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-700 disabled:opacity-30">
              <Icon name={a.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
            </button>
          ))}

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Сетка / Привязка */}
          <button onClick={() => setShowGrid((v) => !v)}
            title="Показать/скрыть сетку (G)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${showGrid ? "bg-blue-900/50 text-blue-300 border border-blue-700" : "text-gray-400 hover:bg-gray-700"}`}>
            <Icon name="Grid3x3" size={13} />Сетка
          </button>
          <button onClick={() => setSnapGrid((v) => !v)}
            title="Привязка к сетке"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${snapGrid ? "bg-blue-900/50 text-blue-300 border border-blue-700" : "text-gray-400 hover:bg-gray-700"}`}>
            <Icon name="Magnet" size={13} />Привязка
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Слои */}
          <button onClick={() => setShowLayers((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${showLayers ? "bg-purple-900/50 text-purple-300 border border-purple-700" : "text-gray-400 hover:bg-gray-700"}`}>
            <Icon name="Layers" size={13} />Слои
          </button>

          {/* Свойства */}
          <button onClick={() => setShowProps((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${showProps ? "bg-green-900/50 text-green-300 border border-green-700" : "text-gray-400 hover:bg-gray-700"}`}>
            <Icon name="SlidersHorizontal" size={13} />Свойства
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Зум */}
          <button onClick={() => handleZoom(-0.15)} className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700"><Icon name="Minus" size={13} /></button>
          <span className="text-xs text-gray-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => handleZoom(0.15)} className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700"><Icon name="Plus" size={13} /></button>
          <button onClick={fitView} title="По размеру" className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700"><Icon name="Maximize2" size={13} /></button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Импорт/Экспорт */}
          <button onClick={importSVG} title="Импорт SVG"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-300 hover:bg-gray-700">
            <Icon name="Upload" size={13} />SVG
          </button>
          <button onClick={exportDXF}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            <Icon name="Download" size={13} />DXF
          </button>
          <button onClick={exportPNG}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-600">
            <Icon name="Image" size={13} />PNG
          </button>
        </div>

        {/* Canvas + боковые панели */}
        <div className="flex flex-1 overflow-hidden">

          {/* Слои */}
          {showLayers && (
            <div className="w-48 bg-gray-900 border-r border-gray-700 flex flex-col">
              <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">Слои</span>
                <button onClick={() => {
                  const id = `layer-${Date.now()}`;
                  setLayers((prev) => [...prev, { id, name: `Слой ${prev.length + 1}`, color: LAYER_COLORS[prev.length % LAYER_COLORS.length], visible: true, locked: false }]);
                }} className="text-gray-400 hover:text-white"><Icon name="Plus" size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {layers.map((l) => (
                  <div key={l.id}
                    onClick={() => { setActiveLayerState(l.id); activeLayerRef.current = l.id; }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${activeLayer === l.id ? "bg-blue-900/60 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                    <span className="flex-1 truncate">{l.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); toggleLayer(l.id); }} className={`${l.visible ? "text-gray-400" : "text-gray-600"} hover:text-white`}>
                      <Icon name={l.visible ? "Eye" : "EyeOff"} size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canvas */}
          <div ref={containerRef} className="flex-1 overflow-auto bg-[#1a1a2e] relative">
            <canvas ref={canvasRef} className="block" />
            {/* Статус-бар */}
            <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[11px] bg-gray-900/90 text-gray-300 px-3 py-1 rounded-lg pointer-events-none border border-gray-700">
              <span className="font-medium text-white">{TOOLS.find((t2) => t2.id === tool)?.label}</span>
              <span className="text-gray-500">|</span>
              <span>X: {coords.x}</span>
              <span>Y: {coords.y}</span>
              {tool === "polyline" && polyPointsRef.current.length > 0 && (
                <span className="text-yellow-300">Точек: {polyPointsRef.current.length} · ДКМ — завершить</span>
              )}
              {tool !== "select" && tool !== "move" && tool !== "erase" && tool !== "polyline" && (
                <span className="text-blue-300">ЛКМ — рисовать</span>
              )}
            </div>
            {/* Линейка сверху */}
            <div className="absolute top-0 left-0 right-0 h-5 bg-gray-800/80 pointer-events-none flex items-end overflow-hidden">
              {Array.from({ length: Math.ceil((fabricRef.current?.width ?? 1200) / 100) }).map((_, i) => (
                <div key={i} style={{ left: i * 100 * zoom, position: "absolute", bottom: 0 }} className="flex flex-col items-start">
                  <span className="text-[9px] text-gray-400 pl-0.5">{i * 100}</span>
                  <div className="w-px h-2 bg-gray-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Свойства выбранного */}
          {showProps && (
            <div className="w-52 bg-gray-900 border-l border-gray-700 flex flex-col">
              <div className="px-3 py-2 border-b border-gray-700">
                <span className="text-xs font-semibold text-gray-200">Свойства</span>
              </div>
              <div className="p-3 space-y-3 text-xs text-gray-300 overflow-y-auto">
                {selectedObj ? (
                  <>
                    <p className="text-gray-400">Тип: <span className="text-white">{selectedObj.type}</span></p>
                    {selectedObj.left !== undefined && <PropRow label="X" value={Math.round(selectedObj.left)} />}
                    {selectedObj.top !== undefined && <PropRow label="Y" value={Math.round(selectedObj.top)} />}
                    {selectedObj.width !== undefined && <PropRow label="Ш" value={Math.round(selectedObj.width * (selectedObj.scaleX ?? 1))} />}
                    {selectedObj.height !== undefined && <PropRow label="В" value={Math.round(selectedObj.height * (selectedObj.scaleY ?? 1))} />}
                    {selectedObj.radius !== undefined && <PropRow label="R" value={Math.round(selectedObj.radius)} />}
                    {selectedObj.stroke && <div className="flex items-center gap-2"><span className="text-gray-400">Цвет:</span><div className="w-5 h-5 rounded border border-gray-600" style={{ background: selectedObj.stroke }} /></div>}
                    <div>
                      <label className="text-gray-400 block mb-1">Слой</label>
                      <select value={(selectedObj as any).__layer ?? "layer-0"}
                        onChange={(e) => {
                          (selectedObj as any).__layer = e.target.value;
                          fabricRef.current?.renderAll();
                        }}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none">
                        {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <button onClick={() => {
                      const fc = fabricRef.current; if (!fc) return;
                      selectedObj.set("angle", ((selectedObj.angle ?? 0) + 90) % 360);
                      fc.renderAll(); saveHistory(fc);
                    }} className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center gap-1">
                      <Icon name="RotateCw" size={12} />Повернуть 90°
                    </button>
                    <button onClick={() => {
                      selectedObj.set("flipX", !selectedObj.flipX);
                      fabricRef.current?.renderAll();
                    }} className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center gap-1">
                      <Icon name="FlipHorizontal2" size={12} />Зеркало X
                    </button>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-4">Выберите объект</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}