import { useState, useRef, useEffect } from "react";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";
import { type PartInfo } from "@/components/smartmach/cad.data";
import Cad2DToolbar from "@/components/smartmach/Cad2DToolbar";
import Cad2DGostDialog from "@/components/smartmach/Cad2DGostDialog";
import Cad2DSaveDialog from "@/components/smartmach/Cad2DSaveDialog";
import {
  Cad2DLayersPanel,
  Cad2DPropsPanel,
  Cad2DPartPanel,
} from "@/components/smartmach/Cad2DPanels";
import { useCad2DCanvas, drawGostFrame } from "@/components/smartmach/useCad2DCanvas";
import { useCad2DDrawing } from "@/components/smartmach/useCad2DDrawing";
import { useCad2DActions } from "@/components/smartmach/useCad2DActions";
import Cad2DRuler from "@/components/smartmach/Cad2DRuler";

const TOOL_LABELS: Record<string, string> = {
  select: "Выбор (V)", move: "Переместить (M)", line: "Отрезок (L)",
  polyline: "Полилиния (PL)", rect: "Прямоугольник (REC)", circle: "Окружность (C)",
  ellipse: "Эллипс (EL)", arc: "Дуга (A)", spline: "Сплайн (SPL)",
  dimension: "Линейный размер", "dim-aligned": "Выровненный размер",
  "dim-radius": "Радиус", "dim-diameter": "Диаметр", "dim-angular": "Угол",
  leader: "Выноска", text: "Текст (T)", mtext: "Многостр. текст",
  hatch: "Штриховка (H)", erase: "Удалить",
  rotate: "Повернуть", scale: "Масштаб", mirror: "Зеркало",
  offset: "Подобие", trim: "Обрезать", extend: "Удлинить",
  fillet: "Сопряжение", chamfer: "Фаска", array: "Массив",
  stretch: "Растянуть", break: "Разорвать",
};

export default function CadEditor2D({ part }: { part?: PartInfo | null }) {
  const canvas = useCad2DCanvas();
  const [showGost,    setShowGost]    = useState(false);
  const [showSave,    setShowSave]    = useState(false);
  const [savePreview, setSavePreview] = useState<string>("");
  const [lastGostMeta, setLastGostMeta] = useState<Record<string, string> | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const outerRef = useRef<HTMLDivElement>(null);

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
      <Cad2DToolbar
        tool={canvas.tool}
        onTool={canvas.setTool}
        paperSize={canvas.paperSize}
        strokeW={canvas.strokeW}
        lineType={canvas.lineType}
        showGrid={canvas.showGrid}
        snapGrid={canvas.snapGrid}
        showLayers={canvas.showLayers}
        showProps={canvas.showProps}
        zoom={canvas.zoom}
        histIdx={canvas.histIdx}
        histLen={canvas.histLen}
        onPaperSize={canvas.setPaperSize}
        onStrokeW={canvas.setStrokeW}
        onLineType={canvas.setLineType}
        onToggleGrid={() => canvas.setShowGrid((v) => !v)}
        onToggleSnap={() => canvas.setSnapGrid((v) => !v)}
        onToggleLayers={() => canvas.setShowLayers((v) => !v)}
        onToggleProps={() => canvas.setShowProps((v) => !v)}
        onZoom={actions.handleZoom}
        onFitView={actions.fitView}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onCopy={actions.copySelected}
        onPaste={actions.pasteSelected}
        onDeleteSelected={actions.deleteSelected}
        onClearCanvas={actions.clearCanvas}
        onImportSVG={actions.importSVG}
        onExportDXF={actions.exportDXF}
        onExportPNG={actions.exportPNG}
        onMirror={actions.mirrorSelected}
        onRotate={actions.rotateSelected}
        onScale={() => actions.scaleSelected(2)}
        onOffset={actions.offsetSelected}
        onTrim={actions.trimSelected}
        onExtend={actions.extendSelected}
        onFillet={actions.filletSelected}
        onArray={actions.arraySelected}
        onGroupSelected={actions.groupSelected}
        onUngroupSelected={actions.ungroupSelected}
        onBringForward={actions.bringForward}
        onSendBackward={actions.sendBackward}
        onAlignLeft={actions.alignLeft}
        onAlignCenter={actions.alignCenter}
        onAlignRight={actions.alignRight}
        onOpenGost={() => setShowGost(true)}
        theme={canvas.theme}
        onToggleTheme={() => canvas.setTheme((t) => t === "light" ? "dark" : "light")}
        onSaveDrawing={() => {
          const fc = canvas.fabricRef.current;
          if (!fc) return;
          const dataUrl = fc.toDataURL({ format: "png", multiplier: 2 });
          setSavePreview(dataUrl);
          setShowSave(true);
        }}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* Основная область */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Canvas + боковые панели */}
          <div className="flex flex-1 overflow-hidden">

            {/* Панель слоёв */}
            {canvas.showLayers && (
              <Cad2DLayersPanel
                layers={canvas.layers}
                activeLayer={canvas.activeLayer}
                activeLayerRef={canvas.activeLayerRef}
                onSetActiveLayer={canvas.setActiveLayerState}
                onSetLayers={canvas.setLayers}
                onToggleLayer={actions.toggleLayer}
              />
            )}

            {/* Canvas + линейки */}
            <div ref={outerRef} className="flex-1 overflow-hidden bg-[#12131f] relative">

              {/* Линейки ГОСТ (Canvas 2D) */}
              <Cad2DRuler
                zoom={canvas.zoom}
                scrollX={scrollX}
                scrollY={scrollY}
                cursorX={canvas.coords.x}
                cursorY={canvas.coords.y}
                canvasW={canvas.fabricRef.current?.width ?? 1122}
                canvasH={canvas.fabricRef.current?.height ?? 794}
                theme={canvas.theme}
                rulerSize={20}
              />

              {/* Скроллируемая область канваса — отступ на размер линеек */}
              <div
                ref={canvas.containerRef}
                className="overflow-auto"
                style={{ position: "absolute", left: 20, top: 20, right: 0, bottom: 0 }}
              >
                <canvas ref={canvas.canvasRef} className="block" />
              </div>

              {/* Статус-бар */}
              <div className="absolute bottom-2 left-24 flex items-center gap-3 text-[11px] bg-gray-900/90 text-gray-300 px-3 py-1 rounded-lg pointer-events-none border border-gray-700 z-20">
                <span className="font-medium text-white">
                  {TOOL_LABELS[canvas.tool] ?? canvas.tool}
                </span>
                <span className="text-gray-500">|</span>
                <span>X: {canvas.coords.x}</span>
                <span>Y: {canvas.coords.y}</span>
                {canvas.tool === "polyline" && canvas.polyPointsRef.current.length > 0 && (
                  <span className="text-yellow-300">Точек: {canvas.polyPointsRef.current.length} · ПКМ — завершить</span>
                )}
                {canvas.tool !== "select" && canvas.tool !== "move" && canvas.tool !== "erase" && canvas.tool !== "polyline" && (
                  <span className="text-blue-300">ЛКМ — рисовать · Esc — выход</span>
                )}
              </div>
            </div>

            {/* Панель свойств */}
            {canvas.showProps && (
              <Cad2DPropsPanel
                selectedObj={canvas.selectedObj}
                layers={canvas.layers}
                fabricRef={canvas.fabricRef}
                onSaveHistory={canvas.saveHistory}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}