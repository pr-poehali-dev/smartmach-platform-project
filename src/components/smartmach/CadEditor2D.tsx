import { useState, useEffect } from "react";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";
import { type PartInfo } from "@/components/smartmach/cad.data";
import Cad2DGostDialog from "@/components/smartmach/Cad2DGostDialog";
import Cad2DSaveDialog from "@/components/smartmach/Cad2DSaveDialog";
import { Cad2DPartPanel } from "@/components/smartmach/Cad2DPanels";
import { useCad2DCanvas, drawGostFrame } from "@/components/smartmach/useCad2DCanvas";
import { useCad2DDrawing } from "@/components/smartmach/useCad2DDrawing";
import { useCad2DActions } from "@/components/smartmach/useCad2DActions";
import Cad2DEditorToolbar from "@/components/smartmach/Cad2DEditorToolbar";
import Cad2DCanvasArea from "@/components/smartmach/Cad2DCanvasArea";

export default function CadEditor2D({ part }: { part?: PartInfo | null }) {
  const canvas = useCad2DCanvas();
  const [showGost,    setShowGost]    = useState(false);
  const [showSave,    setShowSave]    = useState(false);
  const [savePreview, setSavePreview] = useState<string>("");
  const [lastGostMeta, setLastGostMeta] = useState<Record<string, string> | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Синхронизируем scroll контейнера канваса с линейкой
  useEffect(() => {
    const el = canvas.containerRef.current;
    if (!el) return;
    const onScroll = () => { setScrollX(-el.scrollLeft); setScrollY(-el.scrollTop); };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [canvas.containerRef]);

  const { insertPartDrawing } = useCad2DDrawing({
    fabricRef:      canvas.fabricRef,
    drawingRef:     canvas.drawingRef,
    startRef:       canvas.startRef,
    activeShapeRef: canvas.activeShapeRef,
    polyPointsRef:  canvas.polyPointsRef,
    snapRef:        canvas.snapRef,
    activeLayerRef: canvas.activeLayerRef,
    setCoords:      canvas.setCoords,
    setTool:        canvas.setTool,
    saveHistory:    canvas.saveHistory,
    part,
  });

  const actions = useCad2DActions({
    fabricRef:    canvas.fabricRef,
    historyRef:   canvas.historyRef,
    clipboardRef: canvas.clipboardRef,
    polyPointsRef: canvas.polyPointsRef,
    drawingRef:   canvas.drawingRef,
    showGridRef:  canvas.showGridRef,
    histIdx:      canvas.histIdx,
    histLen:      canvas.histLen,
    setHistIdx:   canvas.setHistIdx,
    zoom:         canvas.zoom,
    setZoom:      canvas.setZoom,
    setTool:      canvas.setTool,
    setLayers:    canvas.setLayers,
    drawGrid:     canvas.drawGrid,
    saveHistory:  canvas.saveHistory,
  });

  // Зум колёсиком мыши (Ctrl + колесо) — после объявления actions
  useEffect(() => {
    const el = canvas.containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      actions.handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [canvas.containerRef, actions]);

  return (
    <div className="flex flex-col h-full bg-[#12131f] rounded-xl border border-gray-700/60 overflow-hidden" style={{ minHeight: 640 }}>

      {/* Диалог рамки ГОСТ */}
      {showGost && (
        <Cad2DGostDialog
          currentPaper={canvas.paperSize}
          onClose={() => setShowGost(false)}
          onApply={(opts) => {
            setLastGostMeta(opts as unknown as Record<string, string>);
            // Сначала ставим флаг — чтобы смена размера не нарисовала простую рамку
            canvas.gostFrameActiveRef.current = true;
            canvas.setPaperSize(opts.paperSize);
            // Небольшая задержка после смены размера
            setTimeout(() => {
              const fc = canvas.fabricRef.current;
              if (!fc) return;
              const [pw, ph] = PAPER_SIZES[opts.paperSize] ?? [0, 0];
              if (pw && ph) {
                fc.setDimensions({ width: pw, height: ph });
                drawGostFrame(fc, pw, ph, opts);
              }
            }, 50);
          }}
        />
      )}

      {/* Диалог сохранения */}
      {showSave && (
        <Cad2DSaveDialog
          canvasDataUrl={savePreview}
          paperSize={canvas.paperSize}
          theme={canvas.theme}
          gostMeta={lastGostMeta}
          onClose={() => setShowSave(false)}
          onSaved={() => {}}
        />
      )}

      {/* Панель активной детали */}
      {part && (
        <Cad2DPartPanel
          part={part}
          showPartPanel={canvas.showPartPanel}
          onInsert={insertPartDrawing}
          onTogglePanel={() => canvas.setShowPartPanel((v) => !v)}
        />
      )}

      {/* Ribbon toolbar */}
      <Cad2DEditorToolbar
        canvas={canvas}
        actions={actions}
        onOpenGost={() => setShowGost(true)}
        onSaveDrawing={() => {
          const fc = canvas.fabricRef.current;
          if (!fc) return;
          const dataUrl = fc.toDataURL({ format: "png", multiplier: 2 });
          setSavePreview(dataUrl);
          setShowSave(true);
        }}
      />

      <Cad2DCanvasArea
        canvas={canvas}
        actions={actions}
        scrollX={scrollX}
        scrollY={scrollY}
      />
    </div>
  );
}
