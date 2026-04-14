/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import { type Tool, type Layer, TOOLS, TOOL_GROUPS, LAYER_COLORS } from "@/components/smartmach/cad2d.data";
import { type PartInfo } from "@/components/smartmach/cad.data";

/* ── Панель инструментов (левая колонка) ── */
interface ToolbarProps {
  tool: Tool;
  onTool: (t: Tool) => void;
}
export function Cad2DToolPanel({ tool, onTool }: ToolbarProps) {
  return (
    <div className="w-12 flex flex-col items-center py-2 gap-1 bg-gray-900 border-r border-gray-700 overflow-y-auto">
      {TOOL_GROUPS.map((grp, gi) => (
        <div key={gi} className="w-full">
          {gi > 0 && <div className="my-1 border-t border-gray-700 mx-2" />}
          {grp.ids.map((tid) => {
            const t = TOOLS.find((t2) => t2.id === tid)!;
            return (
              <button key={t.id} title={t.label} onClick={() => onTool(t.id as Tool)}
                className={`w-10 h-10 mx-1 rounded-lg flex items-center justify-center transition-colors ${tool === t.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}>
                <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={16} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Панель слоёв ── */
interface LayersProps {
  layers: Layer[];
  activeLayer: string;
  activeLayerRef: MutableRefObject<string>;
  onSetActiveLayer: (id: string) => void;
  onSetLayers: Dispatch<SetStateAction<Layer[]>>;
  onToggleLayer: (id: string) => void;
}
export function Cad2DLayersPanel({
  layers, activeLayer, activeLayerRef, onSetActiveLayer, onSetLayers, onToggleLayer,
}: LayersProps) {
  return (
    <div className="w-48 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-200">Слои</span>
        <button onClick={() => {
          const id = `layer-${Date.now()}`;
          onSetLayers((prev) => [...prev, {
            id,
            name: `Слой ${prev.length + 1}`,
            color: LAYER_COLORS[prev.length % LAYER_COLORS.length],
            visible: true,
            locked: false,
          }]);
        }} className="text-gray-400 hover:text-white">
          <Icon name="Plus" size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layers.map((l) => (
          <div key={l.id}
            onClick={() => { onSetActiveLayer(l.id); activeLayerRef.current = l.id; }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${activeLayer === l.id ? "bg-blue-900/60 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
            <span className="flex-1 truncate">{l.name}</span>
            <button onClick={(e) => { e.stopPropagation(); onToggleLayer(l.id); }}
              className={`${l.visible ? "text-gray-400" : "text-gray-600"} hover:text-white`}>
              <Icon name={l.visible ? "Eye" : "EyeOff"} size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Панель свойств выбранного объекта ── */
interface PropsPanel {
  selectedObj: any;
  layers: Layer[];
  fabricRef: MutableRefObject<any>;
  onSaveHistory: (fc: any) => void;
}
export function Cad2DPropsPanel({ selectedObj, layers, fabricRef, onSaveHistory }: PropsPanel) {
  return (
    <div className="w-52 bg-gray-900 border-l border-gray-700 flex flex-col">
      <div className="px-3 py-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-200">Свойства</span>
      </div>
      <div className="p-3 space-y-3 text-xs text-gray-300 overflow-y-auto">
        {selectedObj ? (
          <>
            <p className="text-gray-400">Тип: <span className="text-white">{selectedObj.type}</span></p>
            {selectedObj.left  !== undefined && <PropRow label="X" value={Math.round(selectedObj.left)} />}
            {selectedObj.top   !== undefined && <PropRow label="Y" value={Math.round(selectedObj.top)} />}
            {selectedObj.width !== undefined && <PropRow label="Ш" value={Math.round(selectedObj.width * (selectedObj.scaleX ?? 1))} />}
            {selectedObj.height!== undefined && <PropRow label="В" value={Math.round(selectedObj.height * (selectedObj.scaleY ?? 1))} />}
            {selectedObj.radius!== undefined && <PropRow label="R" value={Math.round(selectedObj.radius)} />}
            {selectedObj.stroke && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Цвет:</span>
                <div className="w-5 h-5 rounded border border-gray-600" style={{ background: selectedObj.stroke }} />
              </div>
            )}
            <div>
              <label className="text-gray-400 block mb-1">Слой</label>
              <select value={(selectedObj as any).__layer ?? "layer-0"}
                onChange={(e) => {
                  (selectedObj as any).__layer = e.target.value;
                  fabricRef.current?.renderAll();
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none">
                {layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <button onClick={() => {
              const fc = fabricRef.current; if (!fc) return;
              selectedObj.set("angle", ((selectedObj.angle ?? 0) + 90) % 360);
              fc.renderAll(); onSaveHistory(fc);
            }} className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center gap-1">
              <Icon name="RotateCw" size={12} />Повернуть 90°
            </button>
            <button onClick={() => {
              selectedObj.set("flipX", !selectedObj.flipX);
              fabricRef.current?.renderAll();
            }} className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center gap-1">
              <Icon name="FlipHorizontal2" size={12} />Зеркало X
            </button>
          </>
        ) : (
          <p className="text-gray-500 text-center py-4">Выберите объект</p>
        )}
      </div>
    </div>
  );
}

/* ── Панель активной детали ── */
interface PartPanelProps {
  part: PartInfo;
  showPartPanel: boolean;
  onInsert: () => void;
  onTogglePanel: () => void;
}
export function Cad2DPartPanel({ part, showPartPanel, onInsert, onTogglePanel }: PartPanelProps) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-blue-950 border-b border-blue-800 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <Icon name="Box" size={14} className="text-blue-400" />
          <span className="text-blue-300 font-medium">{part.code}</span>
          <span className="text-white font-semibold">{part.name}</span>
          {part.material && <span className="text-blue-300">· {part.material}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-blue-300 ml-2">
          {part.dim_length && <span>L: <b className="text-white">{part.dim_length} мм</b></span>}
          {part.dim_width  && <span>W: <b className="text-white">{part.dim_width} мм</b></span>}
          {part.dim_height && <span>H: <b className="text-white">{part.dim_height} мм</b></span>}
          {!part.dim_length && !part.dim_width && !part.dim_height && part.dimensions && (
            <span className="text-blue-400">{part.dimensions}</span>
          )}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={onInsert}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium">
            <Icon name="Download" size={12} />Вставить проекции с размерами
          </button>
          <button onClick={onTogglePanel}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs ${showPartPanel ? "bg-blue-700 text-white" : "text-blue-400 hover:bg-blue-900"}`}>
            <Icon name="SlidersHorizontal" size={12} />Данные
          </button>
        </div>
      </div>

      {showPartPanel && (
        <div className="flex gap-6 px-4 py-2.5 bg-gray-900 border-b border-gray-700 text-xs flex-wrap">
          {[
            { label: "Стандарт",      value: part.standard },
            { label: "Допуск",        value: part.tolerance },
            { label: "Шероховатость", value: part.roughness },
            { label: "№ чертежа",     value: part.drawing_number },
            { label: "Масса",         value: part.weight_kg ? `${part.weight_kg} кг` : null },
          ].filter((r) => r.value).map((r) => (
            <div key={r.label}>
              <span className="text-gray-500">{r.label}: </span>
              <span className="text-gray-200 font-medium">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Строка в панели свойств ── */
function PropRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}