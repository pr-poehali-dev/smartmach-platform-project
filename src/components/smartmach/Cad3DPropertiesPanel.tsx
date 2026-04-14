 
import * as THREE from "three";
import Icon from "@/components/ui/icon";
import { MATERIALS, COLORS, type MatType, type SceneObject } from "@/components/smartmach/cad3d.types";

/* ── мини-компонент трансформа ── */
function TransformPanel({ label, obj, mode, step, onTransform }: {
  label: string; obj: THREE.Mesh; mode: "position" | "rotation" | "scale"; step: number;
  onTransform: (axis: "x" | "y" | "z", delta: number, mode: "pos" | "rot" | "scale") => void;
}) {
  const modeMap = { position: "pos", rotation: "rot", scale: "scale" } as const;
  return (
    <div>
      <p className="text-gray-400 mb-1">{label}</p>
      {(["x", "y", "z"] as const).map((a) => (
        <div key={a} className="flex items-center gap-1 mb-1">
          <span className="text-gray-400 uppercase w-3 text-[10px]">{a}</span>
          <span className="text-gray-300 font-mono w-12 text-right text-[10px]">
            {(obj[mode][a] as number).toFixed(2)}
          </span>
          <button onClick={() => onTransform(a, -step, modeMap[mode])}
            className="w-6 h-5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-[10px]">−</button>
          <button onClick={() => onTransform(a, step, modeMap[mode])}
            className="w-6 h-5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-[10px]">+</button>
        </div>
      ))}
    </div>
  );
}

interface Props {
  selectedObj: SceneObject;
  onUpdateMaterial: (color: string, matType: MatType) => void;
  onTransform: (axis: "x" | "y" | "z", delta: number, mode: "pos" | "rot" | "scale") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function Cad3DPropertiesPanel({
  selectedObj, onUpdateMaterial, onTransform, onDuplicate, onRemove,
}: Props) {
  return (
    <div className="w-52 shrink-0 bg-gray-900 border-l border-gray-700 overflow-y-auto p-3 space-y-4 text-xs text-gray-300">
      <p className="font-semibold text-white">{selectedObj.label}</p>
      <p className="text-gray-500">{selectedObj.type} · {selectedObj.matType}</p>

      {/* Цвет и материал */}
      <div>
        <p className="text-gray-400 mb-1">Материал</p>
        <select value={selectedObj.matType}
          onChange={(e) => onUpdateMaterial(selectedObj.color, e.target.value as MatType)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none mb-1">
          {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap mt-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => onUpdateMaterial(c, selectedObj.matType)}
              className={`w-5 h-5 rounded-full border-2 ${selectedObj.color === c ? "border-white" : "border-transparent"}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Позиция / Поворот / Масштаб */}
      <TransformPanel label="Позиция"      obj={selectedObj.mesh} mode="position" step={0.25}  onTransform={onTransform} />
      <TransformPanel label="Поворот (рад)" obj={selectedObj.mesh} mode="rotation" step={0.157} onTransform={onTransform} />
      <TransformPanel label="Масштаб"       obj={selectedObj.mesh} mode="scale"    step={0.1}   onTransform={onTransform} />

      {/* Действия */}
      <div className="space-y-1 pt-1 border-t border-gray-700">
        <button onClick={() => onDuplicate(selectedObj.id)}
          className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center gap-1">
          <Icon name="Copy" size={12} />Дублировать
        </button>
        <button onClick={() => onRemove(selectedObj.id)}
          className="w-full py-1.5 text-xs text-red-400 hover:bg-gray-800 rounded flex items-center justify-center gap-1 border border-gray-700">
          <Icon name="Trash2" size={12} />Удалить
        </button>
      </div>
    </div>
  );
}
