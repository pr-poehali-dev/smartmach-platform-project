import Icon from "@/components/ui/icon";
import { STROKES, LINE_TYPES, PAPER_SIZES, type Tool } from "@/components/smartmach/cad2d.data";
import {
  Dropdown, MenuItem, MenuDivider, IconBtn, Sep, ToolMenuItem,
} from "@/components/smartmach/Cad2DToolbarPrimitives";

interface Props {
  tool: Tool;
  onTool: (t: Tool) => void;
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
  onMirror: () => void;
  onRotate: () => void;
  onScale: () => void;
  onOffset: () => void;
  onTrim: () => void;
  onExtend: () => void;
  onFillet: () => void;
  onChamfer?: () => void;
  onArray: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onOpenGost: () => void;
  onSaveDrawing: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Cad2DToolbar({
  tool, onTool,
  paperSize, strokeW, lineType, showGrid, snapGrid, showLayers, showProps,
  zoom, histIdx, histLen,
  onPaperSize, onStrokeW, onLineType,
  onToggleGrid, onToggleSnap, onToggleLayers, onToggleProps,
  onZoom, onFitView,
  onUndo, onRedo, onCopy, onPaste, onDeleteSelected, onClearCanvas,
  onImportSVG, onExportDXF, onExportPNG,
  onMirror, onRotate, onScale, onOffset, onTrim, onExtend, onFillet, onChamfer, onArray,
  onGroupSelected, onUngroupSelected, onBringForward, onSendBackward,
  onAlignLeft, onAlignCenter, onAlignRight, onOpenGost, onSaveDrawing,
  theme, onToggleTheme,
}: Props) {

  const drawTools: Tool[] = ["line", "polyline", "rect", "circle", "arc", "ellipse", "spline"];
  const editTools: Tool[] = ["erase", "rotate", "mirror", "scale", "offset", "trim", "extend", "fillet", "chamfer", "array", "stretch", "break"];
  const annotateTools: Tool[] = ["dimension", "dim-aligned", "dim-radius", "dim-diameter", "dim-angular", "leader", "text", "mtext", "hatch"];
  const activeDraw = drawTools.includes(tool);
  const activeEdit = editTools.includes(tool);
  const activeAnnotate = annotateTools.includes(tool);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[#1a1c2e] border-b border-gray-700/60 select-none flex-wrap">

      {/* Undo / Redo */}
      <IconBtn icon="Undo" title="Отменить (Ctrl+Z)" onClick={onUndo} disabled={histIdx <= 0} />
      <IconBtn icon="Redo" title="Повторить (Ctrl+Y)" onClick={onRedo} disabled={histIdx >= histLen - 1} />
      <Sep />

      {/* Навигация */}
      <IconBtn icon="MousePointer2" title="Выбор (V)" onClick={() => onTool("select")} active={tool === "select"} />
      <IconBtn icon="Move" title="Переместить (M)" onClick={() => onTool("move")} active={tool === "move"} />
      <Sep />

      {/* Рисование — выпадающее */}
      <Dropdown label="Рисование" icon="Pencil" active={activeDraw}>
        <ToolMenuItem id="line"     tool={tool} onTool={onTool} />
        <ToolMenuItem id="polyline" tool={tool} onTool={onTool} />
        <MenuDivider />
        <ToolMenuItem id="rect"     tool={tool} onTool={onTool} />
        <ToolMenuItem id="circle"   tool={tool} onTool={onTool} />
        <ToolMenuItem id="arc"      tool={tool} onTool={onTool} />
        <ToolMenuItem id="ellipse"  tool={tool} onTool={onTool} />
        <ToolMenuItem id="spline"   tool={tool} onTool={onTool} />
      </Dropdown>

      {/* Редактирование — выпадающее */}
      <Dropdown label="Редактирование" icon="Settings2" active={activeEdit}>
        <ToolMenuItem id="erase"   tool={tool} onTool={onTool} />
        <ToolMenuItem id="move"    tool={tool} onTool={onTool} />
        <MenuDivider />
        <ToolMenuItem id="rotate"  tool={tool} onTool={(t) => { onTool(t); onRotate(); }} />
        <ToolMenuItem id="mirror"  tool={tool} onTool={(t) => { onTool(t); onMirror(); }} />
        <ToolMenuItem id="scale"   tool={tool} onTool={(t) => { onTool(t); onScale(); }} />
        <ToolMenuItem id="offset"  tool={tool} onTool={(t) => { onTool(t); onOffset(); }} />
        <MenuDivider />
        {/* Команды применяются к выделению сразу при выборе: пункт меню
            только переключал режим, а сами действия были недостижимы. */}
        <ToolMenuItem id="trim"    tool={tool} onTool={(t) => { onTool(t); onTrim(); }} />
        <ToolMenuItem id="extend"  tool={tool} onTool={(t) => { onTool(t); onExtend(); }} />
        <ToolMenuItem id="fillet"  tool={tool} onTool={(t) => { onTool(t); onFillet(); }} />
        <ToolMenuItem id="chamfer" tool={tool} onTool={(t) => { onTool(t); onChamfer?.(); }} />
        <ToolMenuItem id="array"   tool={tool} onTool={(t) => { onTool(t); onArray(); }} />
        <ToolMenuItem id="stretch" tool={tool} onTool={onTool} />
        <ToolMenuItem id="break"   tool={tool} onTool={onTool} />
      </Dropdown>

      {/* Аннотации — выпадающее */}
      <Dropdown label="Аннотации" icon="Ruler" active={activeAnnotate}>
        <ToolMenuItem id="dimension"    tool={tool} onTool={onTool} />
        <ToolMenuItem id="dim-aligned"  tool={tool} onTool={onTool} />
        <ToolMenuItem id="dim-radius"   tool={tool} onTool={onTool} />
        <ToolMenuItem id="dim-diameter" tool={tool} onTool={onTool} />
        <ToolMenuItem id="dim-angular"  tool={tool} onTool={onTool} />
        <ToolMenuItem id="leader"       tool={tool} onTool={onTool} />
        <MenuDivider />
        <ToolMenuItem id="text"         tool={tool} onTool={onTool} />
        <ToolMenuItem id="mtext"        tool={tool} onTool={onTool} />
        <MenuDivider />
        <ToolMenuItem id="hatch"        tool={tool} onTool={onTool} />
      </Dropdown>

      {/* Объекты — выпадающее */}
      <Dropdown label="Объекты" icon="Layers2">
        <MenuItem icon="Copy"      label="Копировать"       shortcut="Ctrl+C" onClick={onCopy} />
        <MenuItem icon="Clipboard" label="Вставить"         shortcut="Ctrl+V" onClick={onPaste} />
        <MenuItem icon="Trash2"    label="Удалить"          shortcut="Del"    onClick={onDeleteSelected} />
        <MenuDivider />
        <MenuItem icon="MoveUp"    label="На передний план"  onClick={onBringForward} />
        <MenuItem icon="MoveDown"  label="На задний план"    onClick={onSendBackward} />
        <MenuDivider />
        <MenuItem icon="AlignLeft"   label="Выровнять влево"    onClick={onAlignLeft} />
        <MenuItem icon="AlignCenter" label="Выровнять по центру" onClick={onAlignCenter} />
        <MenuItem icon="AlignRight"  label="Выровнять вправо"   onClick={onAlignRight} />
        <MenuDivider />
        <MenuItem icon="Layers2" label="Группировать"      onClick={onGroupSelected} />
        <MenuItem icon="Layers"  label="Разгруппировать"  onClick={onUngroupSelected} />
        <MenuDivider />
        <MenuItem icon="RotateCcw" label="Очистить всё" onClick={onClearCanvas} />
      </Dropdown>

      <Sep />

      {/* Свойства линии */}
      <select value={strokeW} onChange={(e) => onStrokeW(Number(e.target.value))}
        title="Толщина линии"
        className="h-7 border border-gray-600 bg-gray-800 text-gray-200 rounded px-1.5 text-[11px] focus:outline-none focus:border-blue-500">
        {STROKES.map((s) => <option key={s} value={s}>{s} мм</option>)}
      </select>

      <select value={lineType} onChange={(e) => onLineType(e.target.value)}
        title="Тип линии"
        className="h-7 border border-gray-600 bg-gray-800 text-gray-200 rounded px-1.5 text-[11px] focus:outline-none focus:border-blue-500 w-28">
        {LINE_TYPES.map((lt) => <option key={lt} value={lt}>{lt}</option>)}
      </select>

      <Sep />

      {/* Сетка и привязка */}
      <IconBtn icon="Grid3x3" title="Сетка" onClick={onToggleGrid} active={showGrid} />
      <IconBtn icon="Magnet"  title="Привязка к сетке" onClick={onToggleSnap} active={snapGrid} />
      <Sep />

      {/* Слои и свойства */}
      <IconBtn icon="Layers"           title="Слои"       onClick={onToggleLayers} active={showLayers} />
      <IconBtn icon="SlidersHorizontal" title="Свойства"  onClick={onToggleProps}  active={showProps} />
      <Sep />

      {/* Лист */}
      <select value={paperSize} onChange={(e) => onPaperSize(e.target.value)}
        title="Формат листа"
        className="h-7 border border-gray-600 bg-gray-800 text-gray-200 rounded px-1.5 text-[11px] focus:outline-none focus:border-blue-500">
        {Object.keys(PAPER_SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
      </select>

      <Sep />

      {/* Зум */}
      <IconBtn icon="Minus"    title="Уменьшить" onClick={() => onZoom(-0.15)} />
      <span className="text-[11px] text-gray-400 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
      <IconBtn icon="Plus"     title="Увеличить" onClick={() => onZoom(0.15)} />
      <IconBtn icon="Maximize2" title="Вписать в окно" onClick={onFitView} />
      <Sep />

      {/* Экспорт — выпадающее */}
      <Dropdown label="Экспорт" icon="Download">
        <MenuItem icon="Download" label="Экспорт DXF"   onClick={onExportDXF} />
        <MenuItem icon="Image"    label="Экспорт PNG"   onClick={onExportPNG} />
        <MenuItem icon="Printer"  label="Печать (PDF)"  onClick={onExportPNG} />
        <MenuDivider />
        <MenuItem icon="Upload"   label="Импорт SVG"    onClick={onImportSVG} />
      </Dropdown>

      <Sep />

      {/* Тема */}
      <button onClick={onToggleTheme} title={theme === "light" ? "Тёмный фон" : "Светлый фон"}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border
          ${theme === "dark"
            ? "bg-gray-900 text-gray-200 border-gray-500"
            : "bg-white/10 text-gray-300 border-gray-600 hover:border-gray-500"}`}>
        <Icon name={theme === "dark" ? "Moon" : "Sun"} size={13} />
        {theme === "dark" ? "Тёмный" : "Светлый"}
      </button>

      <Sep />

      {/* Рамка ГОСТ */}
      <button onClick={onOpenGost}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors text-amber-300 hover:bg-amber-900/30 border border-amber-700/40 hover:border-amber-600/60">
        <Icon name="Frame" size={13} />
        Рамка ГОСТ
      </button>

      <Sep />

      {/* Сохранить чертёж */}
      <button onClick={onSaveDrawing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors bg-green-600 hover:bg-green-500 text-white">
        <Icon name="Save" size={13} />
        Сохранить
      </button>

    </div>
  );
}