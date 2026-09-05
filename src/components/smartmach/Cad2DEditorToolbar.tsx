/**
 * Cad2DEditorToolbar — обёртка над Cad2DToolbar для CadEditor2D.
 * Связывает все пропсы toolbar с объектами canvas и actions.
 * Извлечено 1:1 из CadEditor2D без изменения логики.
 */
import Cad2DToolbar from "@/components/smartmach/Cad2DToolbar";
import { useCad2DCanvas } from "@/components/smartmach/useCad2DCanvas";
import { useCad2DActions } from "@/components/smartmach/useCad2DActions";

interface Props {
  canvas: ReturnType<typeof useCad2DCanvas>;
  actions: ReturnType<typeof useCad2DActions>;
  onOpenGost: () => void;
  onSaveDrawing: () => void;
}

export default function Cad2DEditorToolbar({ canvas, actions, onOpenGost, onSaveDrawing }: Props) {
  return (
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
      onChamfer={actions.chamferSelected}
      onArray={actions.arraySelected}
      onGroupSelected={actions.groupSelected}
      onUngroupSelected={actions.ungroupSelected}
      onBringForward={actions.bringForward}
      onSendBackward={actions.sendBackward}
      onAlignLeft={actions.alignLeft}
      onAlignCenter={actions.alignCenter}
      onAlignRight={actions.alignRight}
      onOpenGost={onOpenGost}
      theme={canvas.theme}
      onToggleTheme={() => canvas.setTheme((t) => t === "light" ? "dark" : "light")}
      onSaveDrawing={onSaveDrawing}
    />
  );
}