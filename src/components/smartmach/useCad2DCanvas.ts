/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Line, Rect } from "fabric";
import { type Tool, type Layer, PAPER_SIZES, GRID, GRID_MAJOR } from "@/components/smartmach/cad2d.data";

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
  const [paperSize, setPaperSize] = useState("A4 гориз.");
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
    const [pw, ph] = PAPER_SIZES["A4 гориз."];
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