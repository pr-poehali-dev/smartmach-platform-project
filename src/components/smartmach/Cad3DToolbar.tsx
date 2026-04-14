import Icon from "@/components/ui/icon";
import {
  CAMERA_VIEWS,
  type ViewMode, type CameraView, type SceneLight,
} from "@/components/smartmach/cad3d.types";

interface Props {
  viewMode: ViewMode;
  cameraView: CameraView;
  showAxes: boolean;
  showGrid: boolean;
  measureMode: boolean;
  measureDist: number | null;
  lights: SceneLight;
  objectCount: number;
  onViewMode: (v: ViewMode) => void;
  onCameraView: (v: CameraView) => void;
  onToggleAxes: () => void;
  onToggleGrid: () => void;
  onToggleMeasure: () => void;
  onExportOBJ: () => void;
  onExportPNG: () => void;
  onLights: (l: SceneLight) => void;
}

export default function Cad3DToolbar({
  viewMode, cameraView, showAxes, showGrid,
  measureMode, measureDist, lights, objectCount,
  onViewMode, onCameraView, onToggleAxes, onToggleGrid,
  onToggleMeasure, onExportOBJ, onExportPNG, onLights,
}: Props) {
  return (
    <div className="flex flex-col bg-gray-900 border-b border-gray-700">

      {/* Основной тулбар */}
      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">

        {/* Виды камеры */}
        <div className="flex gap-1">
          {CAMERA_VIEWS.map((v) => (
            <button key={v.id} onClick={() => onCameraView(v.id)} title={v.label}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${cameraView === v.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
              <Icon name={v.icon as Parameters<typeof Icon>[0]["name"]} size={12} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-700 mx-1" />

        {/* Режим отображения */}
        {(["solid", "wireframe", "xray"] as ViewMode[]).map((v) => (
          <button key={v} onClick={() => onViewMode(v)}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === v ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
            {v === "solid" ? "Тело" : v === "wireframe" ? "Каркас" : "X-Ray"}
          </button>
        ))}

        <div className="h-4 w-px bg-gray-700 mx-1" />

        <button onClick={onToggleAxes}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${showAxes ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
          <Icon name="Axis3d" size={12} />Оси
        </button>
        <button onClick={onToggleGrid}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${showGrid ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
          <Icon name="Grid3x3" size={12} />Сетка
        </button>

        {/* Измерение */}
        <button onClick={onToggleMeasure}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${measureMode ? "bg-yellow-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
          <Icon name="Ruler" size={12} />Измерить
        </button>
        {measureDist != null && (
          <span className="text-xs text-yellow-300 bg-yellow-900/40 px-2 py-1 rounded">
            Расстояние: {measureDist.toFixed(3)} м
          </span>
        )}

        <div className="flex gap-1 ml-auto">
          <button onClick={onExportOBJ}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-600">
            <Icon name="Download" size={12} />OBJ
          </button>
          <button onClick={onExportPNG}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            <Icon name="Image" size={12} />PNG
          </button>
        </div>
      </div>

      {/* Строка освещения */}
      <div className="px-3 py-1.5 border-t border-gray-700 flex items-center gap-4 text-[11px] text-gray-400 flex-wrap">
        <span>{objectCount} объектов</span>
        <span className="text-gray-600">·</span>
        <div className="flex items-center gap-2">
          <Icon name="Sun" size={11} />
          <span>Ambient</span>
          <input type="range" min="0" max="2" step="0.1" value={lights.ambient}
            onChange={(e) => onLights({ ...lights, ambient: Number(e.target.value) })}
            className="w-20 h-1" />
          <span>{lights.ambient.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="Zap" size={11} />
          <span>Direct</span>
          <input type="range" min="0" max="3" step="0.1" value={lights.directional}
            onChange={(e) => onLights({ ...lights, directional: Number(e.target.value) })}
            className="w-20 h-1" />
          <span>{lights.directional.toFixed(1)}</span>
        </div>
        <span className="ml-auto text-gray-600">ЛКМ — выбрать · ПКМ/колесо — камера</span>
        {measureMode && <span className="text-yellow-300">Режим измерения: кликни 2 точки</span>}
      </div>
    </div>
  );
}
