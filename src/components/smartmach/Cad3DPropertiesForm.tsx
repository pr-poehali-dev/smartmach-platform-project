/**
 * Cad3DPropertiesForm — секции параметров объекта в левой панели 3D-редактора:
 * выбор примитива, размеры, материал, цвет и кнопка «Добавить объект».
 * Извлечено 1:1 из Cad3DLeftPanel без изменения логики.
 */
import Icon from "@/components/ui/icon";
import {
  SHAPES, SHAPE_GROUPS, MATERIALS, COLORS,
  type ShapeType, type MatType,
} from "@/components/smartmach/cad3d.types";

function SectionHeader({ label, expanded, onToggle }: { label: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors">
      {label}
      <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={11} />
    </button>
  );
}

interface Props {
  shapeType: ShapeType;
  matType: MatType;
  color: string;
  dims: { w: number; h: number; d: number };
  secShape: boolean;
  secDims: boolean;
  secMat: boolean;
  secColor: boolean;
  onToggleSecShape: () => void;
  onToggleSecDims: () => void;
  onToggleSecMat: () => void;
  onToggleSecColor: () => void;
  onShapeType: (s: ShapeType) => void;
  onMatType: (m: MatType) => void;
  onColor: (c: string) => void;
  onDims: (d: { w: number; h: number; d: number }) => void;
  onAddObject: () => void;
}

export default function Cad3DPropertiesForm({
  shapeType, matType, color, dims,
  secShape, secDims, secMat, secColor,
  onToggleSecShape, onToggleSecDims, onToggleSecMat, onToggleSecColor,
  onShapeType, onMatType, onColor, onDims, onAddObject,
}: Props) {
  return (
    <>
      {/* Примитивы */}
      <div className="border-b border-gray-700/60">
        <SectionHeader label="Примитив" expanded={secShape} onToggle={onToggleSecShape} />
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
        <SectionHeader label="Размеры (м)" expanded={secDims} onToggle={onToggleSecDims} />
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
        <SectionHeader label="Материал" expanded={secMat} onToggle={onToggleSecMat} />
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
        <SectionHeader label="Цвет" expanded={secColor} onToggle={onToggleSecColor} />
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
    </>
  );
}
