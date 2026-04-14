import { type PartInfo } from "@/components/smartmach/cad.data";
import Cad2DToolbar from "@/components/smartmach/Cad2DToolbar";
import {
  Cad2DToolPanel,
  Cad2DLayersPanel,
  Cad2DPropsPanel,
  Cad2DPartPanel,
} from "@/components/smartmach/Cad2DPanels";
import { useCad2DCanvas } from "@/components/smartmach/useCad2DCanvas";
import { useCad2DDrawing } from "@/components/smartmach/useCad2DDrawing";
import { useCad2DActions } from "@/components/smartmach/useCad2DActions";

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
      />

      <div className="flex flex-1 overflow-hidden">

        {/* Левая панель инструментов */}
        <Cad2DToolPanel tool={canvas.tool} onTool={canvas.setTool} />

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

            {/* Canvas */}
            <div ref={canvas.containerRef} className="flex-1 overflow-auto bg-[#12131f] relative">
              <canvas ref={canvas.canvasRef} className="block" />

              {/* Статус-бар */}
              <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[11px] bg-gray-900/90 text-gray-300 px-3 py-1 rounded-lg pointer-events-none border border-gray-700">
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

              {/* Линейка сверху */}
              <div className="absolute top-0 left-0 right-0 h-5 bg-gray-800/70 pointer-events-none flex items-end overflow-hidden border-b border-gray-700/40">
                {Array.from({ length: Math.ceil((canvas.fabricRef.current?.width ?? 1200) / 100) }).map((_, i) => (
                  <div key={i} style={{ left: i * 100 * canvas.zoom, position: "absolute", bottom: 0 }} className="flex flex-col items-start">
                    <span className="text-[9px] text-gray-500 pl-0.5">{i * 100}</span>
                    <div className="w-px h-2 bg-gray-600" />
                  </div>
                ))}
              </div>

              {/* Линейка слева */}
              <div className="absolute top-5 left-0 bottom-0 w-5 bg-gray-800/70 pointer-events-none border-r border-gray-700/40">
                {Array.from({ length: Math.ceil((canvas.fabricRef.current?.height ?? 800) / 100) }).map((_, i) => (
                  <div key={i} style={{ top: i * 100 * canvas.zoom + 0, position: "absolute", left: 0 }}>
                    <span className="text-[9px] text-gray-500" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{i * 100}</span>
                  </div>
                ))}
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
