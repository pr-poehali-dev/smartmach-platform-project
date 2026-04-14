 
import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  SHAPES, SHAPE_GROUPS, MATERIALS, COLORS,
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
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onRenameObject: (id: string, label: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function SectionHeader({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors">
      {label}
      <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={11} />
    </button>
  );
}

export default function Cad3DLeftPanel({
  shapeType, matType, color, dims, objects, selected, objectsRef,
  onShapeType, onMatType, onColor, onDims,
  onAddObject, onSelect, onToggleVisibility, onToggleLock, onRemove, onClearAll,
  onRenameObject, onMoveUp, onMoveDown,
}: Props) {
  const [secShape, setSecShape]  = useState(true);
  const [secDims,  setSecDims]   = useState(true);
  const [secMat,   setSecMat]    = useState(true);
  const [secColor, setSecColor]  = useState(false);
  const [secScene, setSecScene]  = useState(true);
  const [renameId, setRenameId]  = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  return (
    <div className="w-52 shrink-0 bg-[#15162a] border-r border-gray-700/60 flex flex-col overflow-y-auto text-xs">

      {/* Примитивы */}
      <div className="border-b border-gray-700/60">
        <SectionHeader label="Примитив" expanded={secShape} onToggle={() => setSecShape((v) => !v)} />
        {secShape && (
          <div className="px-2 pb-2 space-y-1">
            {SHAPE_GROUPS.map((grp) => (
              <div key={grp}>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider px-1 pt-1 pb-0.5">{grp}</p>
                <div className="grid grid-cols-2 gap-1">
                  {SHAPES.filter((s) => s.group === grp).map((s) => (
                    <button key={s.id} onClick={() => onShapeType(s.id)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors truncate
                        ${shapeType === s.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                      <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={11} className="flex-shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Размеры */}
      <div className="border-b border-gray-700/60">
        <SectionHeader label="Размеры (м)" expanded={secDims} onToggle={() => setSecDims((v) => !v)} />
        {secDims && (
          <div className="px-3 pb-3 space-y-2">
            {(["w", "h", "d"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 w-16">
                  {k === "w" ? "Ширина" : k === "h" ? "Высота" : "Глубина"}
                </span>
                <input type="number" step="0.1" min="0.05" value={dims[k]}
                  onChange={(e) => onDims({ ...dims, [k]: Math.max(0.05, parseFloat(e.target.value) || 1) })}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-blue-500" />
                <span className="text-[10px] text-gray-600">м</span>
              </div>
            ))}
            {/* Быстрые значения */}
            <div className="flex gap-1 flex-wrap pt-1">
              {[[0.1,0.1,0.1],[0.5,0.5,0.5],[1,1,1],[2,1,1]].map(([w,h,d]) => (
                <button key={`${w}x${h}x${d}`} onClick={() => onDims({ w, h, d })}
                  className="px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700">
                  {w}×{h}×{d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Материал */}
      <div className="border-b border-gray-700/60">
        <SectionHeader label="Материал" expanded={secMat} onToggle={() => setSecMat((v) => !v)} />
        {secMat && (
          <div className="px-2 pb-2 space-y-0.5">
            {MATERIALS.map((m) => (
              <button key={m.id} onClick={() => onMatType(m.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition-colors
                  ${matType === m.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                <div className="w-3 h-3 rounded-full shrink-0 border border-gray-600" style={{ background: m.color }} />
                <span className="flex-1 truncate">{m.label}</span>
                {matType === m.id && <Icon name="Check" size={10} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Цвет */}
      <div className="border-b border-gray-700/60">
        <SectionHeader label="Цвет" expanded={secColor} onToggle={() => setSecColor((v) => !v)} />
        {secColor && (
          <div className="px-3 pb-3">
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => onColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => onColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-600 cursor-pointer bg-transparent p-0" />
              <span className="text-[10px] text-gray-500 font-mono">{color}</span>
            </div>
          </div>
        )}
      </div>

      {/* Кнопка добавить */}
      <div className="px-3 py-2 border-b border-gray-700/60">
        <button onClick={onAddObject}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition-colors">
          <Icon name="Plus" size={13} />Добавить объект
        </button>
      </div>

      {/* Список объектов (сцена) */}
      <div className="flex-1 min-h-0 flex flex-col border-b border-gray-700/60">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <button onClick={() => setSecScene((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200">
            Сцена ({objects.length})
            <Icon name={secScene ? "ChevronUp" : "ChevronDown"} size={11} />
          </button>
          {objects.length > 0 && (
            <button onClick={onClearAll} title="Очистить всё"
              className="text-gray-600 hover:text-red-400 transition-colors">
              <Icon name="Trash2" size={11} />
            </button>
          )}
        </div>

        {secScene && (
          <div className="flex-1 overflow-y-auto px-1 pb-2 space-y-0.5">
            {objects.length === 0 ? (
              <p className="text-[11px] text-gray-600 text-center py-4 px-2">
                Добавьте первый объект
              </p>
            ) : (
              objects.map((obj, idx) => (
                <div key={obj.id}
                  onClick={() => onSelect(obj.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors group
                    ${selected === obj.id ? "bg-blue-900/50 border border-blue-700/50" : "hover:bg-gray-800"}`}>

                  {/* Иконка типа */}
                  <Icon name={SHAPES.find((s) => s.id === obj.type)?.icon as Parameters<typeof Icon>[0]["name"] ?? "Box"}
                    size={11} className="text-gray-500 flex-shrink-0" />

                  {/* Название */}
                  <div className="flex-1 min-w-0">
                    {renameId === obj.id ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => { onRenameObject(obj.id, renameVal || obj.label); setRenameId(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { onRenameObject(obj.id, renameVal || obj.label); setRenameId(null); }
                          if (e.key === "Escape") setRenameId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-gray-800 border border-blue-500 rounded px-1 py-0 text-[11px] text-white outline-none"
                      />
                    ) : (
                      <span
                        className={`text-[11px] truncate block ${obj.visible ? "text-gray-200" : "text-gray-600 line-through"}`}
                        onDoubleClick={(e) => { e.stopPropagation(); setRenameId(obj.id); setRenameVal(obj.label); }}>
                        {obj.label}
                      </span>
                    )}
                  </div>

                  {/* Контролы */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onMoveUp(obj.id); }} title="Вверх"
                      disabled={idx === 0}
                      className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-200 disabled:opacity-20">
                      <Icon name="ChevronUp" size={9} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onMoveDown(obj.id); }} title="Вниз"
                      disabled={idx === objects.length - 1}
                      className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-200 disabled:opacity-20">
                      <Icon name="ChevronDown" size={9} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onToggleLock(obj.id); }} title="Заблокировать"
                      className={`w-4 h-4 flex items-center justify-center ${obj.locked ? "text-yellow-400" : "text-gray-500 hover:text-gray-200"}`}>
                      <Icon name={obj.locked ? "Lock" : "Unlock"} size={9} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }} title="Видимость"
                      className={`w-4 h-4 flex items-center justify-center ${obj.visible ? "text-gray-400 hover:text-gray-200" : "text-gray-600"}`}>
                      <Icon name={obj.visible ? "Eye" : "EyeOff"} size={9} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onRemove(obj.id); }} title="Удалить"
                      className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-red-400">
                      <Icon name="X" size={9} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
