/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Line, Circle, Rect, IText, Group, type TPointerEventInfo } from "fabric";
import Icon from "@/components/ui/icon";

type Tool = "select" | "line" | "rect" | "circle" | "text" | "dimension" | "erase";

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "select",    icon: "MousePointer",  label: "Выбор"        },
  { id: "line",      icon: "Minus",         label: "Линия"        },
  { id: "rect",      icon: "Square",        label: "Прямоугольник"},
  { id: "circle",    icon: "Circle",        label: "Окружность"   },
  { id: "dimension", icon: "Ruler",         label: "Размер"       },
  { id: "text",      icon: "Type",          label: "Текст"        },
  { id: "erase",     icon: "Eraser",        label: "Удалить"      },
];

const COLORS = ["#000000", "#1e40af", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];
const STROKES = [0.5, 1, 2, 3];
const GRID = 20;

function snapToGrid(v: number) { return Math.round(v / GRID) * GRID; }

export default function CadEditor2D() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const fabricRef      = useRef<Canvas | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const drawingRef     = useRef(false);
  const startRef       = useRef({ x: 0, y: 0 });
  const activeShapeRef = useRef<any>(null);
  const showGridRef    = useRef(true);
  const historyRef     = useRef<string[]>([]);

  const [tool,     setTool]     = useState<Tool>("select");
  const [color,    setColor]    = useState("#000000");
  const [strokeW,  setStrokeW]  = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom,     setZoom]     = useState(1);
  const [coords,   setCoords]   = useState({ x: 0, y: 0 });
  const [histIdx,  setHistIdx]  = useState(0);
  const [histLen,  setHistLen]  = useState(1);

  const drawGrid = useCallback((fc: Canvas, w: number, h: number) => {
    if (!showGridRef.current) return;
    for (let x = 0; x <= w; x += GRID) {
      const l = new Line([x, 0, x, h], { stroke: "#e5e7eb", strokeWidth: x % 100 === 0 ? 0.8 : 0.3, selectable: false, evented: false });
      (l as any).__grid = true;
      fc.add(l);
    }
    for (let y = 0; y <= h; y += GRID) {
      const l = new Line([0, y, w, y], { stroke: "#e5e7eb", strokeWidth: y % 100 === 0 ? 0.8 : 0.3, selectable: false, evented: false });
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

  /* инициализация */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const w = containerRef.current.clientWidth || 900;
    const h = 560;
    const fc = new Canvas(canvasRef.current, { width: w, height: h, backgroundColor: "#ffffff", selection: true });
    fabricRef.current = fc;
    drawGrid(fc, w, h);
    historyRef.current = [JSON.stringify(fc.toJSON())];
    setHistIdx(0); setHistLen(1);
    return () => { fc.dispose(); };
  }, [drawGrid]);

  /* сетка */
  useEffect(() => {
    showGridRef.current = showGrid;
    const fc = fabricRef.current; if (!fc) return;
    fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
    if (showGrid) drawGrid(fc, fc.width!, fc.height!);
    fc.renderAll();
  }, [showGrid, drawGrid]);

  /* события мыши */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;

    const onMove = (opt: TPointerEventInfo) => {
      const p = fc.getViewportPoint(opt.e as MouseEvent);
      setCoords({ x: Math.round(p.x), y: Math.round(p.y) });
      if (!drawingRef.current || !activeShapeRef.current) return;
      const { x: sx, y: sy } = startRef.current;
      const ex = snapToGrid(p.x), ey = snapToGrid(p.y);
      const sh = activeShapeRef.current;
      if (sh instanceof Line)   sh.set({ x2: ex, y2: ey });
      else if (sh instanceof Rect)   sh.set({ left: Math.min(sx, ex), top: Math.min(sy, ey), width: Math.abs(ex - sx), height: Math.abs(ey - sy) });
      else if (sh instanceof Circle) sh.set({ radius: Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2) });
      fc.renderAll();
    };

    const onDown = (opt: TPointerEventInfo) => {
      const t = (fc as any).__tool as Tool;
      if (t === "select") return;
      const p = fc.getViewportPoint(opt.e as MouseEvent);
      const x = snapToGrid(p.x), y = snapToGrid(p.y);
      startRef.current = { x, y };

      if (t === "erase") {
        const target = fc.findTarget(opt.e as MouseEvent);
        if (target && !(target as any).__grid) { fc.remove(target); fc.renderAll(); }
        return;
      }
      if (t === "text") {
        const txt = new IText("Текст", { left: x, top: y, fontSize: 14, fill: (fc as any).__color, fontFamily: "Inter, sans-serif" });
        fc.add(txt); fc.setActiveObject(txt); fc.renderAll(); return;
      }

      drawingRef.current = true; fc.selection = false;
      const props = { stroke: (fc as any).__color as string, strokeWidth: (fc as any).__strokeW as number, fill: "transparent" };
      let shape: any = null;
      if (t === "line" || t === "dimension") shape = new Line([x, y, x, y], { ...props, fill: props.stroke });
      else if (t === "rect")   shape = new Rect({ left: x, top: y, width: 0, height: 0, ...props });
      else if (t === "circle") shape = new Circle({ left: x, top: y, radius: 0, ...props });
      if (shape) { fc.add(shape); activeShapeRef.current = shape; }
    };

    const onUp = (opt: TPointerEventInfo) => {
      if (!drawingRef.current) return;
      drawingRef.current = false; fc.selection = true;
      const t = (fc as any).__tool as Tool;
      const p = fc.getViewportPoint(opt.e as MouseEvent);
      const ex = snapToGrid(p.x), ey = snapToGrid(p.y);
      const sh = activeShapeRef.current;

      if (t === "dimension" && sh instanceof Line) {
        const { x: sx, y: sy } = startRef.current;
        const dist = Math.round(Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2));
        const lbl = new IText(`${dist}`, { left: (sx + ex) / 2, top: (sy + ey) / 2 - 14, fontSize: 11, fill: "#2563eb", fontFamily: "Inter, sans-serif" });
        const grp = new Group([sh, lbl], { selectable: true });
        fc.remove(sh); fc.add(grp);
      }
      activeShapeRef.current = null;
      fc.renderAll();
      saveHistory(fc);
    };

    fc.on("mouse:down", onDown as any);
    fc.on("mouse:move", onMove as any);
    fc.on("mouse:up",   onUp   as any);
    return () => {
      fc.off("mouse:down", onDown as any);
      fc.off("mouse:move", onMove as any);
      fc.off("mouse:up",   onUp   as any);
    };
  }, [saveHistory]);

  /* синхронизация инструментов через скрытые свойства canvas */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    (fc as any).__tool    = tool;
    (fc as any).__color   = color;
    (fc as any).__strokeW = strokeW;
    const map: Record<Tool, string> = { select: "default", line: "crosshair", rect: "crosshair", circle: "crosshair", dimension: "crosshair", text: "text", erase: "not-allowed" };
    fc.defaultCursor = map[tool];
  }, [tool, color, strokeW]);

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

  const clearCanvas = () => {
    const fc = fabricRef.current; if (!fc) return;
    fc.clear(); fc.backgroundColor = "#ffffff";
    if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
    fc.renderAll(); saveHistory(fc);
  };

  const deleteSelected = () => {
    const fc = fabricRef.current; if (!fc) return;
    fc.getActiveObjects().filter((o) => !(o as any).__grid).forEach((o) => fc.remove(o));
    fc.discardActiveObject(); fc.renderAll(); saveHistory(fc);
  };

  const exportDXF = () => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getObjects().filter((o) => !(o as any).__grid);
    let dxf = `0\nSECTION\n2\nENTITIES\n`;
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

  const handleZoom = (delta: number) => {
    const fc = fabricRef.current; if (!fc) return;
    const nz = Math.max(0.2, Math.min(5, zoom + delta));
    fc.setZoom(nz); setZoom(nz);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-950 border-b border-gray-700 flex-wrap">
        {/* Инструменты */}
        <div className="flex items-center gap-0.5 border-r border-gray-700 pr-2 mr-1">
          {TOOLS.map((t) => (
            <button key={t.id} title={t.label} onClick={() => setTool(t.id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-xs ${tool === t.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
              <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={15} />
            </button>
          ))}
        </div>
        {/* Толщина */}
        <div className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-1">
          {STROKES.map((s) => (
            <button key={s} onClick={() => setStrokeW(s)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${strokeW === s ? "bg-gray-700 ring-1 ring-blue-400" : "hover:bg-gray-800"}`}>
              <div className="bg-white rounded-full" style={{ width: 16, height: Math.max(s, 0.5) }} />
            </button>
          ))}
        </div>
        {/* Цвета */}
        <div className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
              style={{ background: c }} />
          ))}
        </div>
        {/* Действия */}
        <div className="flex items-center gap-0.5 border-r border-gray-700 pr-2 mr-1">
          {[
            { icon: "Undo",      title: "Отменить",           fn: undo,           disabled: histIdx <= 0 },
            { icon: "Redo",      title: "Повторить",          fn: redo,           disabled: histIdx >= histLen - 1 },
            { icon: "Trash2",    title: "Удалить выбранное",  fn: deleteSelected, disabled: false },
            { icon: "RotateCcw", title: "Очистить всё",       fn: clearCanvas,    disabled: false },
          ].map((a) => (
            <button key={a.icon} title={a.title} onClick={a.fn} disabled={a.disabled}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-800 disabled:opacity-30">
              <Icon name={a.icon as Parameters<typeof Icon>[0]["name"]} size={15} />
            </button>
          ))}
        </div>
        {/* Сетка */}
        <button onClick={() => setShowGrid((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors mr-2 ${showGrid ? "bg-blue-900/60 border-blue-500 text-blue-300" : "border-gray-600 text-gray-400 hover:bg-gray-800"}`}>
          <Icon name="Grid3x3" size={13} />Сетка
        </button>
        {/* Зум */}
        <div className="flex items-center gap-0.5 border-r border-gray-700 pr-2 mr-1">
          <button onClick={() => handleZoom(-0.1)} className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-800"><Icon name="Minus" size={13} /></button>
          <span className="text-xs text-gray-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => handleZoom(0.1)} className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-800"><Icon name="Plus" size={13} /></button>
        </div>
        {/* Экспорт */}
        <button onClick={exportDXF}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 ml-auto">
          <Icon name="Download" size={13} />Экспорт DXF
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto relative bg-white" style={{ minHeight: 520 }}>
        <canvas ref={canvasRef} />
        <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[11px] bg-gray-900/80 text-gray-200 px-2.5 py-1 rounded-lg pointer-events-none">
          <span className="font-medium text-white">{TOOLS.find((t2) => t2.id === tool)?.label}</span>
          <span>X: {coords.x}</span>
          <span>Y: {coords.y}</span>
          {tool !== "select" && tool !== "erase" && <span className="text-blue-300">ЛКМ — рисовать</span>}
        </div>
      </div>
    </div>
  );
}
