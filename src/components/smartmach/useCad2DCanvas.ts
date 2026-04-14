/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Line, Rect, IText } from "fabric";
import { type Tool, type Layer, PAPER_SIZES, GRID, GRID_MAJOR } from "@/components/smartmach/cad2d.data";

export interface GostFrameOptions {
  paperSize: string;
  drawingNumber: string;
  drawingName: string;
  company: string;
  designer: string;
  checker: string;
  scale: string;
  mass: string;
  sheet: string;
  sheets: string;
}

/** Рисует рамку и основную надпись по ГОСТ 2.104-2006 */
export function drawGostFrame(fc: Canvas, pw: number, ph: number, opts: GostFrameOptions) {
  // Удаляем старые рамки
  fc.getObjects().filter((o) => (o as any).__frame).forEach((o) => fc.remove(o));

  const add = (obj: any, tag = "__frame") => { (obj as any)[tag] = true; fc.add(obj); fc.sendObjectToBack(obj); return obj; };
  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.5) =>
    add(new Line([x1, y1, x2, y2], { stroke: "#000", strokeWidth: w, selectable: false, evented: false }));
  const rect = (l: number, t: number, w: number, h: number, sw = 0.5) =>
    add(new Rect({ left: l, top: t, width: w, height: h, stroke: "#000", strokeWidth: sw, fill: "transparent", selectable: false, evented: false }));
  const text = (str: string, x: number, y: number, size = 8, align: "left" | "center" | "right" = "center") =>
    add(new IText(str || "", { left: x, top: y, fontSize: size, fontFamily: "GOST Type A, Arial, sans-serif", fill: "#000", selectable: false, evented: false, textAlign: align, originX: align === "center" ? "center" : "left" }));

  // Масштаб px/мм. A4 горизонт = 1122×794px ≈ 297×210мм
  // Для вертикальных форматов меняем оси
  const isVert = ph > pw;
  const mX = isVert ? ph / 297 : pw / 297;
  const mY = isVert ? pw / 210 : ph / 210;

  const L = 20 * mX;   // левое поле
  const T = 5  * mY;   // верхнее
  const R = pw - 5 * mX; // правый край рамки
  const B = ph - 5 * mY; // нижний край рамки

  // Внешняя граница листа
  rect(0, 0, pw - 1, ph - 1, 0.3);

  // Основная рамка (толстая)
  add(new Rect({ left: L, top: T, width: R - L, height: B - T, stroke: "#000", strokeWidth: 1.5, fill: "transparent", selectable: false, evented: false }));

  // ── Основная надпись ГОСТ 2.104-2006 (форма 1) ──────────────────
  // Высота основной надписи = 55мм, ширина = 185мм (вправо от рамки)
  const stampH = 55 * mY;
  const stampW = 185 * mX;
  const stampL = R - stampW;
  const stampT = B - stampH;

  // Фон основной надписи (белый)
  add(new Rect({ left: stampL, top: stampT, width: stampW, height: stampH, fill: "#fff", stroke: "#000", strokeWidth: 0.5, selectable: false, evented: false }));

  // Вертикальные линии основной надписи
  const cols = [7, 17, 23, 15, 10, 14, 53, 13, 15, 12, 11].map((mm, i) => {
    const prev = [7, 17, 23, 15, 10, 14, 53, 13, 15, 12].slice(0, i).reduce((a, b) => a + b, 0);
    return stampL + prev * mX;
  });

  // Горизонтальные строки (высоты по ГОСТ): 7, 8, 8, 8, 8, 8, 8мм
  const rows = [7, 8, 8, 8, 8, 8].map((mm, i) => {
    const prev = [7, 8, 8, 8, 8].slice(0, i).reduce((a, b) => a + b, 0);
    return stampT + prev * mY;
  });
  rows.push(stampT + 47 * mY);
  rows.push(B);

  // Рисуем горизонтальные линии основной надписи
  rows.forEach((y) => line(stampL, y, R, y, 0.5));

  // Вертикальные делители
  const vCols = [stampL + 7*mX, stampL + 17*mX, stampL + 23*mX, stampL + 38*mX, stampL + 48*mX, stampL + 62*mX, stampL + 76*mX, stampL + 100*mX, stampL + 113*mX, stampL + 128*mX, stampL + 140*mX, stampL + 151*mX, stampL + 162*mX, stampL + 173*mX];
  vCols.forEach((x) => { if (x > stampL && x < R) line(x, stampT, x, B, 0.5); });

  // Левая дополнительная колонка 14мм (зоны, обозначения изменений)
  const addColL = stampL - 14 * mX;
  if (addColL >= L) {
    add(new Rect({ left: addColL, top: stampT, width: 14 * mX, height: stampH, fill: "#fff", stroke: "#000", strokeWidth: 0.5, selectable: false, evented: false }));
    line(addColL, stampT, addColL, B, 0.5);
    text("Изм.", addColL + 7*mX, stampT + 3*mY, 6);
  }

  // Тексты основной надписи
  const cx = (a: number, b: number) => (a + b) / 2;
  const cy = (a: number, b: number) => (a + b) / 2;

  // Заголовок — наименование документа (крупный)
  text(opts.drawingName || "Наименование", cx(stampL + 62*mX, R), cy(rows[0], rows[1]), 10, "center");

  // Обозначение документа
  text(opts.drawingNumber || "ХXXХ.ХXXХ.ХXX", cx(stampL + 62*mX, R), cy(rows[1], rows[2]), 8, "center");

  // Подписи
  const labelSize = 6;
  text("Разраб.", stampL + 2*mX, cy(rows[2], rows[3]), labelSize, "left");
  text("Пров.",   stampL + 2*mX, cy(rows[3], rows[4]), labelSize, "left");
  text("Т.контр.", stampL + 2*mX, cy(rows[4], rows[5]), labelSize, "left");
  text("Н.контр.", stampL + 2*mX, cy(rows[5], rows[6]), labelSize, "left");
  text("Утв.",     stampL + 2*mX, cy(rows[6], rows[7]), labelSize, "left");

  // ФИО
  text(opts.designer || "", cx(stampL + 7*mX, stampL + 17*mX), cy(rows[2], rows[3]), 7, "center");
  text(opts.checker  || "", cx(stampL + 7*mX, stampL + 17*mX), cy(rows[3], rows[4]), 7, "center");

  // Предприятие
  text(opts.company || "Предприятие", cx(stampL + 100*mX, R), cy(rows[4], rows[6]), 7, "center");

  // Масса / Масштаб / Лист-Листов
  text("Масса",   cx(stampL + 62*mX, stampL + 76*mX), stampT + 2*mY, labelSize, "center");
  text("Масштаб", cx(stampL + 76*mX, stampL + 100*mX), stampT + 2*mY, labelSize, "center");
  text("Лист",    cx(stampL + 100*mX, stampL + 113*mX), stampT + 2*mY, labelSize, "center");
  text("Листов",  cx(stampL + 113*mX, stampL + 128*mX), stampT + 2*mY, labelSize, "center");

  text(opts.mass  || "",   cx(stampL + 62*mX, stampL + 76*mX),  rows[1] + 2*mY, 8, "center");
  text(opts.scale || "1:1", cx(stampL + 76*mX, stampL + 100*mX), rows[1] + 2*mY, 8, "center");
  text(opts.sheet  || "1",  cx(stampL + 100*mX, stampL + 113*mX), rows[1] + 2*mY, 8, "center");
  text(opts.sheets || "1",  cx(stampL + 113*mX, stampL + 128*mX), rows[1] + 2*mY, 8, "center");

  // Угловой штамп (ГОСТ требует): зона справа вверху
  const zoneW = 5 * mX;
  line(R - zoneW, T, R - zoneW, T + 5*mY, 0.5);
  line(R, T + 5*mY, R - zoneW, T + 5*mY, 0.5);

  fc.renderAll();
}

export function useCad2DCanvas() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const fabricRef      = useRef<Canvas | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const drawingRef     = useRef(false);
  const startRef       = useRef({ x: 0, y: 0 });
  const activeShapeRef = useRef<any>(null);
  const polyPointsRef  = useRef<{ x: number; y: number }[]>([]);
  const showGridRef    = useRef(true);
  const snapRef        = useRef(true);
  const historyRef     = useRef<string[]>([]);
  const clipboardRef   = useRef<any[]>([]);
  const activeLayerRef = useRef("layer-0");

  const [tool,      setTool]      = useState<Tool>("select");
  const [strokeW,   setStrokeW]   = useState(1);
  const [lineType,  setLineType]  = useState("Сплошная");
  const [showGrid,  setShowGrid]  = useState(true);
  const [snapGrid,  setSnapGrid]  = useState(true);
  const [zoom,      setZoom]      = useState(1);
  const [coords,    setCoords]    = useState({ x: 0, y: 0 });
  const [histIdx,   setHistIdx]   = useState(0);
  const [histLen,   setHistLen]   = useState(1);
  const [paperSize, setPaperSize] = useState("A4 горизонт.");
  const [layers,    setLayers]    = useState<Layer[]>([
    { id: "layer-0", name: "Основной", color: "#000000", visible: true, locked: false },
    { id: "layer-1", name: "Размеры",  color: "#1e40af", visible: true, locked: false },
    { id: "layer-2", name: "Осевые",   color: "#dc2626", visible: true, locked: false },
  ]);
  const [activeLayer,   setActiveLayerState] = useState("layer-0");
  const [showLayers,    setShowLayers]       = useState(false);
  const [showProps,     setShowProps]        = useState(false);
  const [selectedObj,   setSelectedObj]      = useState<any>(null);
  const [showPartPanel, setShowPartPanel]    = useState(false);

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

  /* ── инициализация ── */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const [pw, ph] = PAPER_SIZES["A4 горизонт."] ?? PAPER_SIZES[Object.keys(PAPER_SIZES)[0]];
    const w = pw || containerRef.current.clientWidth || 1100;
    const h = ph || 600;
    const fc = new Canvas(canvasRef.current, { width: w, height: h, backgroundColor: "#ffffff", selection: true });
    fabricRef.current = fc;
    drawGrid(fc, w, h);
    historyRef.current = [JSON.stringify(fc.toJSON())];
    setHistIdx(0); setHistLen(1);

    fc.on("selection:created", (opt) => setSelectedObj(opt.selected?.[0] ?? null));
    fc.on("selection:updated", (opt) => setSelectedObj(opt.selected?.[0] ?? null));
    fc.on("selection:cleared", () => setSelectedObj(null));

    return () => { fc.dispose(); };
  }, [drawGrid]);

  /* ── сетка ── */
  useEffect(() => {
    showGridRef.current = showGrid;
    const fc = fabricRef.current; if (!fc) return;
    fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
    if (showGrid) drawGrid(fc, fc.width!, fc.height!);
    fc.renderAll();
  }, [showGrid, drawGrid]);

  /* ── размер листа ── */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const [pw, ph] = PAPER_SIZES[paperSize];
    if (pw && ph) {
      fc.setDimensions({ width: pw, height: ph });
      fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
      if (showGridRef.current) drawGrid(fc, pw, ph);
      const existing = fc.getObjects().filter((o) => (o as any).__frame);
      existing.forEach((o) => fc.remove(o));
      const frame = new Rect({ left: 20, top: 5, width: pw - 25, height: ph - 10, stroke: "#000", strokeWidth: 1.5, fill: "transparent", selectable: false, evented: false });
      (frame as any).__frame = true;
      fc.add(frame);
      fc.sendObjectToBack(frame);
      fc.renderAll();
    }
  }, [paperSize, drawGrid]);

  /* ── синхронизация инструментов ── */
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

  /* ── слой → цвет ── */
  useEffect(() => {
    activeLayerRef.current = activeLayer;
    const fc = fabricRef.current; if (!fc) return;
    (fc as any).__color = getColor();
  }, [activeLayer, layers, getColor]);

  /* ── снапинг ── */
  useEffect(() => { snapRef.current = snapGrid; }, [snapGrid]);

  return {
    canvasRef, fabricRef, containerRef,
    drawingRef, startRef, activeShapeRef, polyPointsRef,
    showGridRef, snapRef, historyRef, clipboardRef, activeLayerRef,
    tool, setTool,
    strokeW, setStrokeW,
    lineType, setLineType,
    showGrid, setShowGrid,
    snapGrid, setSnapGrid,
    zoom, setZoom,
    coords, setCoords,
    histIdx, setHistIdx,
    histLen, setHistLen,
    paperSize, setPaperSize,
    layers, setLayers,
    activeLayer, setActiveLayerState,
    showLayers, setShowLayers,
    showProps, setShowProps,
    selectedObj, setSelectedObj,
    showPartPanel, setShowPartPanel,
    getColor, drawGrid, saveHistory,
  };
}