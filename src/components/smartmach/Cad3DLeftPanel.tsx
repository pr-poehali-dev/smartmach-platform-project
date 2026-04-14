 
import * as THREE from "three";
import Icon from "@/components/ui/icon";
import {
  SHAPES, MATERIALS, COLORS,
  type ShapeType, type MatType, type SceneObject,
} from "@/components/smartmach/cad3d.types";

interface Props {
  shapeType: ShapeType;
  matType: MatType;
  color: string;
  dims: { w: number; h: number; d: number };
  objects: SceneObject[];
  selected: string | null;
  objectsRef: React.MutableRefObject<SceneObject[]>;
  onShapeType: (s: ShapeType) => void;
  onMatType: (m: MatType) => void;
  onColor: (c: string) => void;
  onDims: (d: { w: number; h: number; d: number }) => void;
  onAddObject: () => void;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export default function Cad3DLeftPanel({
  shapeType, matType, color, dims, objects, selected, objectsRef,
  onShapeType, onMatType, onColor, onDims,
  onAddObject, onSelect, onToggleVisibility, onRemove, onClearAll,
}: Props) {
  return (
    <div className="w-52 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col overflow-y-auto">

      {/* Примитивы */}
      <div className="p-3 border-b border-gray-700">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Примитив</p>
        <div className="grid grid-cols-2 gap-1">
          {SHAPES.map((s) => (
            <button key={s.id} onClick={() => onShapeType(s.id)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${shapeType === s.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
              <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={12} />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Размеры */}
      <div className="p-3 border-b border-gray-700">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Размеры (м)</p>
        <div className="space-y-1.5">
          {(["w", "h", "d"] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-4">{k === "w" ? "Ш" : k === "h" ? "В" : "Г"}</span>
              <input type="number" step="0.1" min="0.1" value={dims[k]}
                onChange={(e) => onDims({ ...dims, [k]: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Материал */}
      <div className="p-3 border-b border-gray-700">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Материал</p>
        <div className="space-y-1">
          {MATERIALS.map((m) => (
            <button key={m.id} onClick={() => onMatType(m.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${matType === m.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Цвет */}
      <div className="p-3 border-b border-gray-700">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Цвет</p>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button key={c} onClick={() => onColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
              style={{ background: c }} />
          ))}
          <input type="color" value={color} onChange={(e) => onColor(e.target.value)}
            className="w-6 h-6 rounded-full border-2 border-gray-600 cursor-pointer bg-transparent" title="Свой цвет" />
        </div>
      </div>

      {/* Добавить */}
      <div className="p-3 border-b border-gray-700">
        <button onClick={onAddObject}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
          <Icon name="Plus" size={13} />Добавить объект
        </button>
      </div>

      {/* Список объектов */}
      <div className="p-3 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Сцена ({objects.length})</p>
        {objects.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-3">Сцена пуста</p>
        ) : (
          <div className="space-y-0.5">
            {objects.map((o) => (
              <div key={o.id}
                onClick={() => {
                  onSelect(o.id);
                  objectsRef.current.forEach((obj) => {
                    (obj.mesh.material as THREE.MeshStandardMaterial).emissive?.set(obj.id === o.id ? 0x223366 : 0x000000);
                  });
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${selected === o.id ? "bg-blue-900/60 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: o.color }} />
                <span className="flex-1 truncate">{o.label}</span>
                <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(o.id); }}
                  className={o.visible ? "text-gray-500 hover:text-white" : "text-gray-700"}>
                  <Icon name={o.visible ? "Eye" : "EyeOff"} size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onRemove(o.id); }}
                  className="text-gray-600 hover:text-red-400">
                  <Icon name="X" size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-700">
        <button onClick={onClearAll} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg">
          <Icon name="Trash2" size={12} />Очистить сцену
        </button>
      </div>
    </div>
  );
}
