/**
 * MachineDrawingCanvas — рабочая область редактора чертежей станка МАТ-1:
 * панель слоёв, ИИ-агент, линейки, canvas, панель свойств и статус-бар.
 * Извлечено 1:1 из MachineDrawingEditor без изменения логики.
 */
import Icon from "@/components/ui/icon";
import { Cad2DLayersPanel, Cad2DPropsPanel } from "@/components/smartmach/Cad2DPanels";
import { useCad2DCanvas } from "@/components/smartmach/useCad2DCanvas";
import Cad2DRuler from "@/components/smartmach/Cad2DRuler";
import AiDraftAgentPanel from "@/components/smartmach/AiDraftAgentPanel";

interface Props {
  canvas: ReturnType<typeof useCad2DCanvas>;
  scrollX: number;
  scrollY: number;
  showAgent: boolean;
  onAgentApplied: (d: { title?: string; designation?: string; material?: string }) => void;
  onCloseAgent: () => void;
  /** Переключение видимости слоя — приходит из useCad2DActions */
  onToggleLayer: (id: string) => void;
}

export default function MachineDrawingCanvas({
  canvas, scrollX, scrollY, showAgent, onAgentApplied, onCloseAgent, onToggleLayer,
}: Props) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">

          {/* Панель слоёв */}
          {canvas.showLayers && (
            <Cad2DLayersPanel
              layers={canvas.layers}
              activeLayer={canvas.activeLayer}
              activeLayerRef={canvas.activeLayerRef}
              onSetActiveLayer={canvas.setActiveLayerState}
              onSetLayers={canvas.setLayers}
              onToggleLayer={onToggleLayer}
            />
          )}

          {/* Линейка + canvas */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* ИИ-агент-инженер */}
            {showAgent && (
              <AiDraftAgentPanel
                fabricRef={canvas.fabricRef}
                paperSize={canvas.paperSize}
                // Агент вызывает saveHistory без аргументов,
                // поэтому холст подставляем здесь
                saveHistory={() => {
                  const fc = canvas.fabricRef.current;
                  if (fc) canvas.saveHistory(fc);
                }}
                onApplied={onAgentApplied}
                onClose={onCloseAgent}
              />
            )}
            {/* Линейка рисует обе шкалы сразу и берёт размеры холста
                из самого canvas: отдельного canvasSize в хуке нет */}
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
            <div className="flex flex-1 min-h-0">
              <div
                ref={canvas.containerRef}
                className="flex-1 overflow-auto"
                style={{ background: canvas.theme === "dark" ? "#1a1c2e" : "#e8e8e8" }}
              >
                <canvas ref={canvas.canvasRef} />
              </div>
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

        {/* Статус-бар */}
        <div className="flex items-center gap-4 px-4 py-1.5 bg-[#0d0e1a] border-t border-gray-800 text-[10px] text-gray-500 font-mono">
          <span>X: {canvas.coords.x.toFixed(0)} Y: {canvas.coords.y.toFixed(0)}</span>
          <span>·</span>
          <span>Масштаб: {Math.round(canvas.zoom * 100)}%</span>
          <span>·</span>
          <span>{canvas.paperSize}</span>
          <span className="ml-auto flex items-center gap-1">
            <Icon name="Hammer" size={10} className="text-amber-500" />
            МАТ-1 Рабочие чертежи
          </span>
        </div>
      </div>
    </div>
  );
}