/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from "react";
import { Canvas, Line, Circle, Rect, IText, Group, ActiveSelection, Path } from "fabric";
import { type Tool, type Layer } from "@/components/smartmach/cad2d.data";
import { entitiesFromObject } from "@/components/smartmach/useCad2DOsnap";
import type { Entity, SegEntity } from "@/lib/cad/osnap";
import {
  chamferSegments, extendSegment, filletSegments, trimSegment,
} from "@/lib/cad/edit";

interface ActionsDeps {
  fabricRef:       MutableRefObject<Canvas | null>;
  historyRef:      MutableRefObject<string[]>;
  clipboardRef:    MutableRefObject<any[]>;
  polyPointsRef:   MutableRefObject<{ x: number; y: number }[]>;
  drawingRef:      MutableRefObject<boolean>;
  showGridRef:     MutableRefObject<boolean>;
  histIdx:         number;
  histLen:         number;
  setHistIdx:      Dispatch<SetStateAction<number>>;
  zoom:            number;
  setZoom:         Dispatch<SetStateAction<number>>;
  setTool:         Dispatch<SetStateAction<Tool>>;
  setLayers:       Dispatch<SetStateAction<Layer[]>>;
  drawGrid:        (fc: Canvas, w: number, h: number) => void;
  saveHistory:     (fc: Canvas) => void;
}

export function useCad2DActions({
  fabricRef, historyRef, clipboardRef, polyPointsRef, drawingRef,
  showGridRef, histIdx, histLen, setHistIdx, zoom, setZoom,
  setTool, setLayers, drawGrid, saveHistory,
}: ActionsDeps) {

  const undo = useCallback(() => {
    const fc = fabricRef.current; if (!fc || histIdx <= 0) return;
    const ni = histIdx - 1;
    fc.loadFromJSON(JSON.parse(historyRef.current[ni])).then(() => {
      if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
      fc.renderAll(); setHistIdx(ni);
    });
  }, [histIdx, drawGrid, fabricRef, historyRef, showGridRef, setHistIdx]);

  const redo = useCallback(() => {
    const fc = fabricRef.current; if (!fc || histIdx >= histLen - 1) return;
    const ni = histIdx + 1;
    fc.loadFromJSON(JSON.parse(historyRef.current[ni])).then(() => {
      if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
      fc.renderAll(); setHistIdx(ni);
    });
  }, [histIdx, histLen, drawGrid, fabricRef, historyRef, showGridRef, setHistIdx]);

  const copySelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getActiveObjects();
    if (objs.length) clipboardRef.current = objs;
  }, [fabricRef, clipboardRef]);

  const pasteSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    clipboardRef.current.forEach((obj) => {
      obj.clone().then((c: any) => {
        c.set({ left: (c.left ?? 0) + 20, top: (c.top ?? 0) + 20 });
        fc.add(c); fc.setActiveObject(c); fc.renderAll();
      });
    });
    saveHistory(fc);
  }, [fabricRef, clipboardRef, saveHistory]);

  const clearCanvas = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    fc.clear(); fc.backgroundColor = "#ffffff";
    if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, showGridRef, drawGrid, saveHistory]);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    fc.getActiveObjects().filter((o) => !(o as any).__grid && !(o as any).__frame).forEach((o) => fc.remove(o));
    fc.discardActiveObject(); fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  const toggleLayer = useCallback((id: string) => {
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
  }, [fabricRef, setLayers]);

  const handleZoom = useCallback((delta: number) => {
    const fc = fabricRef.current; if (!fc) return;
    const nz = Math.max(0.2, Math.min(8, zoom + delta));
    // Базовые размеры листа (до зума)
    const baseW = fc.width!  / zoom;
    const baseH = fc.height! / zoom;
    // Физически масштабируем canvas-элемент — чтобы скролл работал
    fc.setDimensions({ width: Math.round(baseW * nz), height: Math.round(baseH * nz) });
    fc.setZoom(nz);
    setZoom(nz);
  }, [fabricRef, zoom, setZoom]);

  const fitView = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    // Восстанавливаем базовый размер (делим на текущий zoom)
    const baseW = fc.width!  / zoom;
    const baseH = fc.height! / zoom;
    fc.setDimensions({ width: Math.round(baseW), height: Math.round(baseH) });
    fc.setZoom(1);
    fc.viewportTransform = [1, 0, 0, 1, 0, 0];
    setZoom(1);
    fc.renderAll();
  }, [fabricRef, zoom, setZoom]);

  // ── Зеркало (отражение по вертикальной оси) ───────────────────────
  const mirrorSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    fc.getActiveObjects().forEach((o) => {
      o.set("flipX", !o.flipX);
    });
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── Поворот на 90° ────────────────────────────────────────────────
  const rotateSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    fc.getActiveObjects().forEach((o) => {
      o.set("angle", ((o.angle ?? 0) + 90) % 360);
    });
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── Масштаб ×2 ────────────────────────────────────────────────────
  const scaleSelected = useCallback((factor = 2) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.getActiveObjects().forEach((o) => {
      o.set({ scaleX: (o.scaleX ?? 1) * factor, scaleY: (o.scaleY ?? 1) * factor });
    });
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── Подобие (offset — сдвиг копии на 20px) ───────────────────────
  const offsetSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getActiveObjects().filter((o) => !(o as any).__grid && !(o as any).__frame);
    objs.forEach((obj) => {
      obj.clone().then((c: any) => {
        c.set({ left: (c.left ?? 0) + 20, top: (c.top ?? 0) + 20, opacity: 0.8 });
        fc.add(c); fc.renderAll();
      });
    });
    saveHistory(fc);
  }, [fabricRef, saveHistory]);

  /* ── Обрезка по режущим кромкам (ГОСТ-корректная геометрия) ───────
     Выбранный отрезок делится пересечениями с остальной геометрией;
     удаляется участок, ближайший к центру выделения. Раньше команда
     просто стирала объект целиком, что обрезкой не является. */
  const trimSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const targets = fc.getActiveObjects().filter((o) => o.type === "line");
    if (!targets.length) { deleteSelected(); return; }

    // Режущие кромки — вся остальная геометрия чертежа
    const cutters: Entity[] = [];
    fc.getObjects().forEach((o) => {
      if (!targets.includes(o as any)) cutters.push(...entitiesFromObject(o));
    });

    let touched = false;
    targets.forEach((o: any) => {
      const seg: SegEntity = {
        kind: "segment",
        a: { x: o.x1, y: o.y1 },
        b: { x: o.x2, y: o.y2 },
      };
      const click = { x: (o.x1 + o.x2) / 2, y: (o.y1 + o.y2) / 2 };
      const res = trimSegment(seg, cutters, click);
      if (!res.changed) return;

      touched = true;
      const style = {
        stroke: o.stroke, strokeWidth: o.strokeWidth,
        strokeDashArray: o.strokeDashArray, selectable: true,
      };
      fc.remove(o);
      res.segments.forEach((s) => {
        const l = new Line([s.a.x, s.a.y, s.b.x, s.b.y], style);
        (l as any).__layer = o.__layer;
        fc.add(l);
      });
    });

    if (touched) { fc.discardActiveObject(); fc.renderAll(); saveHistory(fc); }
  }, [fabricRef, saveHistory, deleteSelected]);

  /* ── Удлинение до ближайшей границы ───────────────────────────────
     Продлевается конец, ближний к центру соседней геометрии.
     Прежняя реализация умножала масштаб на 1.1, растягивая отрезок
     в обе стороны и смещая его относительно чертежа. */
  const extendSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const targets = fc.getActiveObjects().filter((o) => o.type === "line");
    if (!targets.length) return;

    const bounds: Entity[] = [];
    fc.getObjects().forEach((o) => {
      if (!targets.includes(o as any)) bounds.push(...entitiesFromObject(o));
    });

    let touched = false;
    targets.forEach((o: any) => {
      const seg: SegEntity = {
        kind: "segment",
        a: { x: o.x1, y: o.y1 },
        b: { x: o.x2, y: o.y2 },
      };
      // Пробуем оба конца — удлиняем тот, для которого нашлась граница
      for (const click of [seg.b, seg.a]) {
        const res = extendSegment(seg, bounds, click);
        if (res.changed) {
          o.set({
            x1: res.segment.a.x, y1: res.segment.a.y,
            x2: res.segment.b.x, y2: res.segment.b.y,
          });
          o.setCoords();
          touched = true;
          break;
        }
      }
    });

    if (touched) { fc.renderAll(); saveHistory(fc); }
  }, [fabricRef, saveHistory]);

  /* ── Сопряжение двух отрезков дугой ───────────────────────────────
     Строится настоящая дуга радиуса R с подрезкой сторон до точек
     касания. Прежняя версия ставила rx=8 у прямоугольника — это
     свойство отрисовки, геометрия при этом не менялась. */
  const filletSelected = useCallback((radius = 20) => {
    const fc = fabricRef.current; if (!fc) return;
    const lines = fc.getActiveObjects().filter((o) => o.type === "line");

    if (lines.length !== 2) {
      // Для прямоугольника оставляем прежнее поведение как визуальное
      fc.getActiveObjects().forEach((o) => { if (o instanceof Rect) o.set("rx", 8); });
      fc.renderAll(); saveHistory(fc);
      return;
    }

    const [o1, o2] = lines as any[];
    const s1: SegEntity = { kind: "segment", a: { x: o1.x1, y: o1.y1 }, b: { x: o1.x2, y: o1.y2 } };
    const s2: SegEntity = { kind: "segment", a: { x: o2.x1, y: o2.y1 }, b: { x: o2.x2, y: o2.y2 } };

    const res = filletSegments(s1, s2, radius);
    if (!res) return;

    o1.set({ x1: res.seg1.a.x, y1: res.seg1.a.y, x2: res.seg1.b.x, y2: res.seg1.b.y });
    o2.set({ x1: res.seg2.a.x, y1: res.seg2.a.y, x2: res.seg2.b.x, y2: res.seg2.b.y });
    o1.setCoords(); o2.setCoords();

    // Дуга сопряжения строится как SVG-путь по точкам касания
    const { c, r, a0, a1 } = res.arc;
    const p0 = { x: c.x + r * Math.cos(a0!), y: c.y + r * Math.sin(a0!) };
    const p1 = { x: c.x + r * Math.cos(a1!), y: c.y + r * Math.sin(a1!) };
    let sweep = (a1! - a0!) % (Math.PI * 2);
    if (sweep < 0) sweep += Math.PI * 2;
    const largeArc = sweep > Math.PI ? 1 : 0;

    const arc = new Path(
      `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y}`,
      {
        stroke: o1.stroke, strokeWidth: o1.strokeWidth,
        fill: "transparent", selectable: true,
      },
    );
    (arc as any).__layer = o1.__layer;
    fc.add(arc);

    fc.discardActiveObject(); fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  /* ── Фаска между двумя отрезками ──────────────────────────────────
     Команда была объявлена в панели инструментов, но не имела
     реализации вовсе. */
  const chamferSelected = useCallback((offset = 15) => {
    const fc = fabricRef.current; if (!fc) return;
    const lines = fc.getActiveObjects().filter((o) => o.type === "line");
    if (lines.length !== 2) return;

    const [o1, o2] = lines as any[];
    const s1: SegEntity = { kind: "segment", a: { x: o1.x1, y: o1.y1 }, b: { x: o1.x2, y: o1.y2 } };
    const s2: SegEntity = { kind: "segment", a: { x: o2.x1, y: o2.y1 }, b: { x: o2.x2, y: o2.y2 } };

    const res = chamferSegments(s1, s2, offset);
    if (!res) return;

    o1.set({ x1: res.seg1.a.x, y1: res.seg1.a.y, x2: res.seg1.b.x, y2: res.seg1.b.y });
    o2.set({ x1: res.seg2.a.x, y1: res.seg2.a.y, x2: res.seg2.b.x, y2: res.seg2.b.y });
    o1.setCoords(); o2.setCoords();

    const ch = new Line(
      [res.chamfer.a.x, res.chamfer.a.y, res.chamfer.b.x, res.chamfer.b.y],
      { stroke: o1.stroke, strokeWidth: o1.strokeWidth, selectable: true },
    );
    (ch as any).__layer = o1.__layer;
    fc.add(ch);

    fc.discardActiveObject(); fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── Массив (3×3 сетка копий) ──────────────────────────────────────
  const arraySelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getActiveObjects().filter((o) => !(o as any).__grid && !(o as any).__frame);
    const promises: Promise<void>[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row === 0 && col === 0) continue;
        objs.forEach((obj) => {
          promises.push(
            obj.clone().then((c: any) => {
              c.set({ left: (c.left ?? 0) + col * 80, top: (c.top ?? 0) + row * 80 });
              fc.add(c);
            })
          );
        });
      }
    }
    Promise.all(promises).then(() => { fc.renderAll(); saveHistory(fc); });
  }, [fabricRef, saveHistory]);

  /* ── Группировать ──────────────────────────────────────────────────
     В Fabric 7 методов toGroup/toActiveSelection больше нет, поэтому
     обе команды не работали. Группа собирается вручную: объекты
     снимаются с холста и передаются в конструктор Group. */
  const groupSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || !(active instanceof ActiveSelection)) return;

    const objects = active.getObjects()
      .filter((o: any) => !o.__grid && !o.__frame);
    if (objects.length < 2) return;

    fc.discardActiveObject();
    objects.forEach((o) => fc.remove(o));

    const group = new Group(objects, { selectable: true });
    (group as any).__layer = (objects[0] as any).__layer;
    fc.add(group);
    fc.setActiveObject(group);
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  /* ── Разгруппировать ───────────────────────────────────────────────
     removeAll возвращает объекты уже в координатах холста, поэтому
     их достаточно добавить обратно и заново выделить. */
  const ungroupSelected = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || !(active instanceof Group)) return;

    const objects = active.removeAll();
    fc.remove(active);
    objects.forEach((o) => fc.add(o));

    if (objects.length) {
      fc.setActiveObject(new ActiveSelection(objects, { canvas: fc }));
    }
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── На передний план ──────────────────────────────────────────────
  const bringForward = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    fc.getActiveObjects().forEach((o) => fc.bringObjectToFront(o));
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── На задний план ────────────────────────────────────────────────
  const sendBackward = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    fc.getActiveObjects().filter((o) => !(o as any).__grid && !(o as any).__frame)
      .forEach((o) => fc.sendObjectToBack(o));
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── Выравнивание ─────────────────────────────────────────────────
  const alignObjects = useCallback((dir: "left" | "center" | "right") => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getActiveObjects().filter((o) => !(o as any).__grid);
    if (objs.length < 2) return;
    const bounds = objs.map((o) => ({ left: o.left ?? 0, width: (o.width ?? 0) * (o.scaleX ?? 1) }));
    const minLeft = Math.min(...bounds.map((b) => b.left));
    const maxRight = Math.max(...bounds.map((b) => b.left + b.width));
    const centerX = (minLeft + maxRight) / 2;
    objs.forEach((o) => {
      const w = (o.width ?? 0) * (o.scaleX ?? 1);
      if (dir === "left")   o.set("left", minLeft);
      if (dir === "center") o.set("left", centerX - w / 2);
      if (dir === "right")  o.set("left", maxRight - w);
    });
    fc.renderAll(); saveHistory(fc);
  }, [fabricRef, saveHistory]);

  // ── Экспорт DXF ───────────────────────────────────────────────────
  const exportDXF = useCallback(() => {
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
  }, [fabricRef]);

  const exportPNG = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const a = document.createElement("a");
    a.href = fc.toDataURL({ format: "png", multiplier: 2 });
    a.download = "drawing.png"; a.click();
  }, [fabricRef]);

  const importSVG = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".svg";
    input.onchange = (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fc = fabricRef.current; if (!fc) return;
        const svgStr = ev.target?.result as string;
        const blob = new Blob([svgStr], { type: "image/svg+xml" });
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = () => {
          const fabricImg = new (window as any).fabric.Image(img, { left: 50, top: 50 });
          fc.add(fabricImg); fc.renderAll(); saveHistory(fc);
        };
      };
      reader.readAsText(file);
    };
    input.click();
  }, [fabricRef, saveHistory]);

  /* ── клавиатура ── */
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
      if ((e.ctrlKey || e.metaKey) && e.key === "g") { groupSelected(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        fc.getObjects().filter((o) => !(o as any).__grid && !(o as any).__frame).forEach((o) => fc.setActiveObject(o));
        e.preventDefault();
      }
      const toolKeys: Record<string, Tool> = {
        v: "select", m: "move", l: "line", p: "polyline",
        r: "rect", c: "circle", a: "arc", d: "dimension",
        t: "text", h: "hatch",
      };
      if (!e.ctrlKey && !e.metaKey && toolKeys[e.key]) setTool(toolKeys[e.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveHistory, undo, redo, copySelected, pasteSelected, setTool, fabricRef, polyPointsRef, drawingRef, groupSelected]);

  return {
    undo, redo,
    copySelected, pasteSelected,
    clearCanvas, deleteSelected,
    toggleLayer,
    handleZoom, fitView,
    exportDXF, exportPNG, importSVG,
    mirrorSelected, rotateSelected, scaleSelected,
    offsetSelected, trimSelected, extendSelected,
    filletSelected, chamferSelected, arraySelected,
    groupSelected, ungroupSelected,
    bringForward, sendBackward,
    alignLeft:   () => alignObjects("left"),
    alignCenter: () => alignObjects("center"),
    alignRight:  () => alignObjects("right"),
  };
}