/**
 * Cad2DCanvasArea — рабочая область CadEditor2D: панель слоёв, линейки,
 * скроллируемый canvas, статус-бар и панель свойств.
 * Извлечено 1:1 из CadEditor2D без изменения логики.
 */
import { useRef } from "react";
import { Cad2DLayersPanel, Cad2DPropsPanel } from "@/components/smartmach/Cad2DPanels";
import { useCad2DCanvas } from "@/components/smartmach/useCad2DCanvas";
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

interface Props {
  canvas: ReturnType<typeof useCad2DCanvas>;
  actions: ReturnType<typeof useCad2DActions>;
  scrollX: number;
  scrollY: number;
}

export default function Cad2DCanvasArea({ canvas, actions, scrollX, scrollY }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);

  return (
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
  );
}
