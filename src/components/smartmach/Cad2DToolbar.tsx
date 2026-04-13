 
import Icon from "@/components/ui/icon";
import { STROKES, LINE_TYPES, PAPER_SIZES } from "@/components/smartmach/cad2d.data";

interface Props {
  paperSize: string;
  strokeW: number;
  lineType: string;
  showGrid: boolean;
  snapGrid: boolean;
  showLayers: boolean;
  showProps: boolean;
  zoom: number;
  histIdx: number;
  histLen: number;
  onPaperSize: (v: string) => void;
  onStrokeW: (v: number) => void;
  onLineType: (v: string) => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onToggleLayers: () => void;
  onToggleProps: () => void;
  onZoom: (delta: number) => void;
  onFitView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDeleteSelected: () => void;
  onClearCanvas: () => void;
  onImportSVG: () => void;
  onExportDXF: () => void;
  onExportPNG: () => void;
}

export default function Cad2DToolbar({
  paperSize, strokeW, lineType, showGrid, snapGrid, showLayers, showProps,
  zoom, histIdx, histLen,
  onPaperSize, onStrokeW, onLineType,
  onToggleGrid, onToggleSnap, onToggleLayers, onToggleProps,
  onZoom, onFitView,
  onUndo, onRedo, onCopy, onPaste, onDeleteSelected, onClearCanvas,
  onImportSVG, onExportDXF, onExportPNG,
}: Props) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border-b border-gray-700 flex-wrap">

      {/* Размер листа */}
      <select value={paperSize} onChange={(e) => onPaperSize(e.target.value)}
        className="border border-gray-600 bg-gray-800 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none mr-1">
        {Object.keys(PAPER_SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
      </select>

      <div className="h-4 w-px bg-gray-700 mx-1" />

      {/* Толщина */}
      <select value={strokeW} onChange={(e) => onStrokeW(Number(e.target.value))}
        className="border border-gray-600 bg-gray-800 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none w-16">
        {STROKES.map((s) => <option key={s} value={s}>{s} мм</option>)}
      </select>

      {/* Тип линии */}
      <select value={lineType} onChange={(e) => onLineType(e.target.value)}
        className="border border-gray-600 bg-gray-800 text-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none w-28">
        {LINE_TYPES.map((lt) => <option key={lt} value={lt}>{lt}</option>)}
      </select>

      <div className="h-4 w-px bg-gray-700 mx-1" />

      {/* Undo/Redo/Copy/Paste/Del/Clear */}
      {[
        { icon: "Undo",      title: "Отменить (Ctrl+Z)",   fn: onUndo,           disabled: histIdx <= 0 },
        { icon: "Redo",      title: "Повторить (Ctrl+Y)",  fn: onRedo,           disabled: histIdx >= histLen - 1 },
        { icon: "Copy",      title: "Копировать (Ctrl+C)", fn: onCopy,           disabled: false },
        { icon: "Clipboard", title: "Вставить (Ctrl+V)",   fn: onPaste,          disabled: false },
        { icon: "Trash2",    title: "Удалить (Del)",       fn: onDeleteSelected, disabled: false },
        { icon: "RotateCcw", title: "Очистить всё",        fn: onClearCanvas,    disabled: false },
      ].map((a) => (
        <button key={a.icon} title={a.title} onClick={a.fn} disabled={a.disabled}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-700 disabled:opacity-30">
          <Icon name={a.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
        </button>
      ))}

      <div className="h-4 w-px bg-gray-700 mx-1" />

      {/* Сетка / Привязка */}
      <button onClick={onToggleGrid} title="Показать/скрыть сетку"
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${showGrid ? "bg-blue-900/50 text-blue-300 border border-blue-700" : "text-gray-400 hover:bg-gray-700"}`}>
        <Icon name="Grid3x3" size={13} />Сетка
      </button>
      <button onClick={onToggleSnap} title="Привязка к сетке"
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${snapGrid ? "bg-blue-900/50 text-blue-300 border border-blue-700" : "text-gray-400 hover:bg-gray-700"}`}>
        <Icon name="Magnet" size={13} />Привязка
      </button>

      <div className="h-4 w-px bg-gray-700 mx-1" />

      {/* Слои / Свойства */}
      <button onClick={onToggleLayers}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${showLayers ? "bg-purple-900/50 text-purple-300 border border-purple-700" : "text-gray-400 hover:bg-gray-700"}`}>
        <Icon name="Layers" size={13} />Слои
      </button>
      <button onClick={onToggleProps}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${showProps ? "bg-green-900/50 text-green-300 border border-green-700" : "text-gray-400 hover:bg-gray-700"}`}>
        <Icon name="SlidersHorizontal" size={13} />Свойства
      </button>

      <div className="h-4 w-px bg-gray-700 mx-1" />

      {/* Зум */}
      <button onClick={() => onZoom(-0.15)} className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700">
        <Icon name="Minus" size={13} />
      </button>
      <span className="text-xs text-gray-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
      <button onClick={() => onZoom(0.15)} className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700">
        <Icon name="Plus" size={13} />
      </button>
      <button onClick={onFitView} title="По размеру" className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700">
        <Icon name="Maximize2" size={13} />
      </button>

      <div className="h-4 w-px bg-gray-700 mx-1" />

      {/* Импорт/Экспорт */}
      <button onClick={onImportSVG} title="Импорт SVG"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-300 hover:bg-gray-700">
        <Icon name="Upload" size={13} />SVG
      </button>
      <button onClick={onExportDXF}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
        <Icon name="Download" size={13} />DXF
      </button>
      <button onClick={onExportPNG}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-600">
        <Icon name="Image" size={13} />PNG
      </button>
    </div>
  );
}
