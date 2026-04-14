import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  CAMERA_VIEWS,
  type ViewMode, type CameraView, type SceneLight, type TransformMode,
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
  selectedCount: number;
  transformMode: TransformMode;
  snapEnabled: boolean;
  onViewMode: (v: ViewMode) => void;
  onCameraView: (v: CameraView) => void;
  onToggleAxes: () => void;
  onToggleGrid: () => void;
  onToggleMeasure: () => void;
  onToggleSnap: () => void;
  onTransformMode: (m: TransformMode) => void;
  onExportOBJ: () => void;
  onExportPNG: () => void;
  onExportSTL: () => void;
  onLights: (l: SceneLight) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onGroupSelected: () => void;
  onAlignGround: () => void;
  onCenterSelected: () => void;
  onMirrorX: () => void;
  onMirrorZ: () => void;
  onResetCamera: () => void;
}

function Dropdown({ label, icon, children, active }: {
  label: string; icon: string; children: React.ReactNode; active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors
          ${open || active
            ? "bg-blue-600/25 text-blue-300 border border-blue-500/40"
            : "text-gray-300 hover:bg-gray-700/60 border border-transparent"}`}>
        <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={13} />
        {label}
        <Icon name="ChevronDown" size={10} className="opacity-50" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1c2e] border border-gray-600 rounded-lg shadow-xl min-w-[200px] py-1"
          onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, active, shortcut, danger }: {
  icon: string; label: string; onClick: () => void;
  active?: boolean; shortcut?: string; danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors text-left
        ${danger ? "text-red-400 hover:bg-red-900/30"
          : active ? "bg-blue-600/20 text-blue-300"
          : "text-gray-300 hover:bg-gray-700/60 hover:text-white"}`}>
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={13} className="flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-gray-600 text-[10px]">{shortcut}</span>}
    </button>
  );
}

function MenuDivider() { return <div className="my-1 border-t border-gray-700/60" />; }

function MenuLabel({ label }: { label: string }) {
  return <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</div>;
}

function IconBtn({ icon, title, onClick, active, disabled }: {
  icon: string; title: string; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded transition-colors disabled:opacity-30
        ${active ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" : "text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent"}`}>
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={14} />
    </button>
  );
}

function Sep() { return <div className="h-5 w-px bg-gray-700 mx-1" />; }

function TransformBtn({ mode, current, icon, title, onClick }: {
  mode: TransformMode; current: TransformMode; icon: string; title: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors
        ${current === mode ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 border border-transparent"}`}>
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={13} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

export default function Cad3DToolbar({
  viewMode, cameraView, showAxes, showGrid,
  measureMode, measureDist, lights, objectCount, selectedCount,
  transformMode, snapEnabled,
  onViewMode, onCameraView, onToggleAxes, onToggleGrid,
  onToggleMeasure, onToggleSnap, onTransformMode,
  onExportOBJ, onExportPNG, onExportSTL, onLights,
  onDuplicateSelected, onDeleteSelected, onGroupSelected,
  onAlignGround, onCenterSelected, onMirrorX, onMirrorZ, onResetCamera,
}: Props) {
  return (
    <div className="flex flex-col bg-[#1a1c2e] border-b border-gray-700/60 select-none">

      {/* Основная строка */}
      <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">

        {/* Трансформации */}
        <TransformBtn mode="translate" current={transformMode} icon="Move3d" title="Перемест." onClick={() => onTransformMode("translate")} />
        <TransformBtn mode="rotate"    current={transformMode} icon="RotateCw" title="Повернуть" onClick={() => onTransformMode("rotate")} />
        <TransformBtn mode="scale"     current={transformMode} icon="Maximize2" title="Масштаб"  onClick={() => onTransformMode("scale")} />
        <Sep />

        {/* Вид */}
        <Dropdown label="Вид" icon="Eye" active={["wireframe","xray","flat"].includes(viewMode)}>
          <MenuLabel label="Режим отображения" />
          <MenuItem icon="Box"      label="Тело"    active={viewMode === "solid"}     onClick={() => onViewMode("solid")} />
          <MenuItem icon="Grid3x3"  label="Каркас"  active={viewMode === "wireframe"} onClick={() => onViewMode("wireframe")} />
          <MenuItem icon="Scan"     label="X-Ray"   active={viewMode === "xray"}      onClick={() => onViewMode("xray")} />
          <MenuItem icon="Square"   label="Плоский" active={viewMode === "flat"}      onClick={() => onViewMode("flat")} />
          <MenuDivider />
          <MenuLabel label="Камера" />
          {CAMERA_VIEWS.map((v) => (
            <MenuItem key={v.id} icon={v.icon} label={v.label} active={cameraView === v.id} onClick={() => onCameraView(v.id)} />
          ))}
          <MenuDivider />
          <MenuItem icon="RefreshCw" label="Сбросить камеру" onClick={onResetCamera} />
        </Dropdown>

        {/* Объект */}
        <Dropdown label="Объект" icon="Package" active={false}>
          <MenuLabel label="Трансформация" />
          <MenuItem icon="AlignVerticalJustifyStart" label="На поверхность (Y=0)" onClick={onAlignGround} />
          <MenuItem icon="Crosshair"                 label="В центр сцены"        onClick={onCenterSelected} />
          <MenuDivider />
          <MenuLabel label="Зеркало" />
          <MenuItem icon="FlipHorizontal" label="Зеркало по X" onClick={onMirrorX} />
          <MenuItem icon="FlipVertical"   label="Зеркало по Z" onClick={onMirrorZ} />
          <MenuDivider />
          <MenuItem icon="Copy"   label="Дублировать"   shortcut="Ctrl+D" onClick={onDuplicateSelected} />
          <MenuItem icon="Layers" label="Группировать"               onClick={onGroupSelected} />
          <MenuDivider />
          <MenuItem icon="Trash2" label="Удалить выбранные" danger onClick={onDeleteSelected} />
        </Dropdown>

        {/* Сцена */}
        <Dropdown label="Сцена" icon="Layers2">
          <MenuLabel label="Вспомогательные объекты" />
          <MenuItem icon="Axis3d"  label="Оси координат" active={showAxes} onClick={onToggleAxes} />
          <MenuItem icon="Grid3x3" label="Сетка"         active={showGrid} onClick={onToggleGrid} />
          <MenuDivider />
          <MenuLabel label="Инструменты" />
          <MenuItem icon="Ruler"   label="Измерить расстояние" active={measureMode} onClick={onToggleMeasure} />
          <MenuItem icon="Magnet"  label="Привязка к сетке"    active={snapEnabled} onClick={onToggleSnap} />
          <MenuDivider />
          <MenuLabel label="Освещение" />
          <div className="px-3 py-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-[11px] text-gray-300">
              <span className="w-16">Ambient</span>
              <input type="range" min="0" max="2" step="0.1" value={lights.ambient}
                onChange={(e) => onLights({ ...lights, ambient: Number(e.target.value) })}
                className="flex-1 h-1" />
              <span className="w-6 text-right">{lights.ambient.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-300">
              <span className="w-16">Направл.</span>
              <input type="range" min="0" max="3" step="0.1" value={lights.directional}
                onChange={(e) => onLights({ ...lights, directional: Number(e.target.value) })}
                className="flex-1 h-1" />
              <span className="w-6 text-right">{lights.directional.toFixed(1)}</span>
            </div>
          </div>
        </Dropdown>

        {/* Экспорт */}
        <Dropdown label="Экспорт" icon="Download">
          <MenuItem icon="Download" label="Экспорт OBJ"  onClick={onExportOBJ} />
          <MenuItem icon="Download" label="Экспорт STL"  onClick={onExportSTL} />
          <MenuItem icon="Image"    label="Скриншот PNG" onClick={onExportPNG} />
        </Dropdown>

        <Sep />

        {/* Быстрые кнопки */}
        <IconBtn icon="Grid3x3" title="Сетка"   onClick={onToggleGrid}   active={showGrid} />
        <IconBtn icon="Axis3d"  title="Оси"     onClick={onToggleAxes}   active={showAxes} />
        <IconBtn icon="Magnet"  title="Привязка" onClick={onToggleSnap}  active={snapEnabled} />
        <IconBtn icon="Ruler"   title="Измерить" onClick={onToggleMeasure} active={measureMode} />

        {/* Статус */}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-500">
          {measureDist != null && (
            <span className="text-yellow-300 bg-yellow-900/30 px-2 py-0.5 rounded">
              {measureDist.toFixed(3)} м
            </span>
          )}
          {selectedCount > 0 && (
            <span className="text-blue-300">{selectedCount} выбрано</span>
          )}
          <span>{objectCount} объектов</span>
          <span className="text-gray-600 hidden md:inline">ЛКМ — выбрать · Колесо — зум</span>
        </div>
      </div>

      {/* Подсказка при измерении */}
      {measureMode && (
        <div className="px-3 py-1 bg-yellow-900/20 border-t border-yellow-700/30 text-[11px] text-yellow-300">
          Режим измерения: кликните на две точки объекта
        </div>
      )}
    </div>
  );
}
