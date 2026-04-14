import { useState } from "react";
import Icon from "@/components/ui/icon";
import { STROKES, LINE_TYPES, PAPER_SIZES, TOOLS, type Tool, type RibbonTab } from "@/components/smartmach/cad2d.data";

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
  onArray: () => void;
  onGroupSelected: () => void;
  onUngroupSelected: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
}

function RibbonBtn({
  icon, label, active, disabled, large, onClick, title,
}: {
  icon: string; label: string; active?: boolean; disabled?: boolean;
  large?: boolean; onClick: () => void; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={`flex flex-col items-center justify-center gap-0.5 rounded transition-colors disabled:opacity-30
        ${large
          ? "w-14 h-14 px-1"
          : "w-11 h-11 px-1"
        }
        ${active
          ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
          : "text-gray-300 hover:bg-gray-700/70 border border-transparent"
        }`}
    >
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={large ? 20 : 16} />
      <span className={`text-center leading-tight font-normal truncate w-full ${large ? "text-[10px]" : "text-[9px]"}`}>{label}</span>
    </button>
  );
}

function ToolBtn({ id, tool, onTool, large }: { id: Tool; tool: Tool; onTool: (t: Tool) => void; large?: boolean }) {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) return null;
  return (
    <RibbonBtn
      icon={t.icon}
      label={t.label.split(" (")[0]}
      title={t.label}
      active={tool === id}
      large={large}
      onClick={() => onTool(id)}
    />
  );
}

function Sep() {
  return <div className="h-12 w-px bg-gray-700 mx-1 self-center" />;
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="w-full text-center text-[9px] text-gray-500 mt-0.5 border-t border-gray-700/50 pt-0.5 leading-tight">
      {label}
    </div>
  );
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-start gap-0.5 flex-wrap justify-center px-1">
        {children}
      </div>
      <GroupLabel label={label} />
    </div>
  );
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
  onMirror, onRotate, onScale, onOffset, onTrim, onExtend, onFillet, onArray,
  onGroupSelected, onUngroupSelected, onBringForward, onSendBackward,
  onAlignLeft, onAlignCenter, onAlignRight,
}: Props) {
  const [tab, setTab] = useState<RibbonTab>("home");

  return (
    <div className="bg-[#1e2030] border-b border-gray-700 select-none">

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-2 pt-1 border-b border-gray-700/60">
        {([
          { id: "home",     label: "Главная" },
          { id: "annotate", label: "Аннотации" },
          { id: "view",     label: "Вид" },
          { id: "output",   label: "Вывод" },
        ] as { id: RibbonTab; label: string }[]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1 text-xs rounded-t-md transition-colors font-medium
              ${tab === t.id
                ? "bg-[#252840] text-white border border-gray-700 border-b-[#252840] -mb-px"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"}`}>
            {t.label}
          </button>
        ))}

        {/* Быстрый доступ справа */}
        <div className="ml-auto flex items-center gap-1 pb-1">
          <button onClick={onUndo} disabled={histIdx <= 0} title="Отменить (Ctrl+Z)"
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700 disabled:opacity-30">
            <Icon name="Undo" size={13} />
          </button>
          <button onClick={onRedo} disabled={histIdx >= histLen - 1} title="Повторить (Ctrl+Y)"
            className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700 disabled:opacity-30">
            <Icon name="Redo" size={13} />
          </button>
          <div className="h-3 w-px bg-gray-700 mx-0.5" />
          <span className="text-[10px] text-gray-500">{Math.round(zoom * 100)}%</span>
          <button onClick={() => onZoom(-0.15)} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700">
            <Icon name="Minus" size={10} />
          </button>
          <button onClick={() => onZoom(0.15)} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700">
            <Icon name="Plus" size={10} />
          </button>
          <button onClick={onFitView} title="По размеру" className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700">
            <Icon name="Maximize2" size={10} />
          </button>
        </div>
      </div>

      {/* Ribbon content */}
      <div className="flex items-start gap-0 px-2 py-1.5 overflow-x-auto" style={{ background: "#252840" }}>

        {/* ── ГЛАВНАЯ ── */}
        {tab === "home" && (
          <>
            <RibbonGroup label="Буфер обмена">
              <RibbonBtn icon="Clipboard" label="Вставить" large onClick={onPaste} />
              <div className="flex flex-col gap-0.5">
                <RibbonBtn icon="Copy"     label="Копировать"  onClick={onCopy} />
                <RibbonBtn icon="Scissors" label="Вырезать"    onClick={() => { onCopy(); onDeleteSelected(); }} />
              </div>
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Рисование">
              <ToolBtn id="line"     tool={tool} onTool={onTool} large />
              <ToolBtn id="polyline" tool={tool} onTool={onTool} large />
              <ToolBtn id="circle"   tool={tool} onTool={onTool} />
              <ToolBtn id="arc"      tool={tool} onTool={onTool} />
              <ToolBtn id="rect"     tool={tool} onTool={onTool} />
              <ToolBtn id="ellipse"  tool={tool} onTool={onTool} />
              <ToolBtn id="spline"   tool={tool} onTool={onTool} />
              <ToolBtn id="hatch"    tool={tool} onTool={onTool} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Редактирование">
              <ToolBtn id="move"    tool={tool} onTool={onTool} large />
              <ToolBtn id="erase"   tool={tool} onTool={onTool} large />
              <ToolBtn id="rotate"  tool={tool} onTool={onTool} />
              <ToolBtn id="mirror"  tool={tool} onTool={onTool} />
              <ToolBtn id="scale"   tool={tool} onTool={onTool} />
              <ToolBtn id="offset"  tool={tool} onTool={onTool} />
              <ToolBtn id="trim"    tool={tool} onTool={onTool} />
              <ToolBtn id="extend"  tool={tool} onTool={onTool} />
              <ToolBtn id="fillet"  tool={tool} onTool={onTool} />
              <ToolBtn id="chamfer" tool={tool} onTool={onTool} />
              <ToolBtn id="array"   tool={tool} onTool={onTool} />
              <ToolBtn id="stretch" tool={tool} onTool={onTool} />
              <ToolBtn id="break"   tool={tool} onTool={onTool} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Слои">
              <RibbonBtn icon="Layers"           label="Слои"         large active={showLayers} onClick={onToggleLayers} />
              <RibbonBtn icon="SlidersHorizontal" label="Свойства"    active={showProps}  onClick={onToggleProps} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Свойства">
              <div className="flex flex-col gap-1 px-1 py-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-400 w-14">Лист:</span>
                  <select value={paperSize} onChange={(e) => onPaperSize(e.target.value)}
                    className="border border-gray-600 bg-gray-800 text-gray-200 rounded px-1 py-0.5 text-[10px] focus:outline-none">
                    {Object.keys(PAPER_SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-400 w-14">Толщина:</span>
                  <select value={strokeW} onChange={(e) => onStrokeW(Number(e.target.value))}
                    className="border border-gray-600 bg-gray-800 text-gray-200 rounded px-1 py-0.5 text-[10px] focus:outline-none w-20">
                    {STROKES.map((s) => <option key={s} value={s}>{s} мм</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-gray-400 w-14">Линия:</span>
                  <select value={lineType} onChange={(e) => onLineType(e.target.value)}
                    className="border border-gray-600 bg-gray-800 text-gray-200 rounded px-1 py-0.5 text-[10px] focus:outline-none w-28">
                    {LINE_TYPES.map((lt) => <option key={lt} value={lt}>{lt}</option>)}
                  </select>
                </div>
              </div>
            </RibbonGroup>
          </>
        )}

        {/* ── АННОТАЦИИ ── */}
        {tab === "annotate" && (
          <>
            <RibbonGroup label="Размеры">
              <ToolBtn id="dimension"    tool={tool} onTool={onTool} large />
              <ToolBtn id="dim-aligned"  tool={tool} onTool={onTool} large />
              <ToolBtn id="dim-radius"   tool={tool} onTool={onTool} />
              <ToolBtn id="dim-diameter" tool={tool} onTool={onTool} />
              <ToolBtn id="dim-angular"  tool={tool} onTool={onTool} />
              <ToolBtn id="leader"       tool={tool} onTool={onTool} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Текст">
              <ToolBtn id="text"  tool={tool} onTool={onTool} large />
              <ToolBtn id="mtext" tool={tool} onTool={onTool} large />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Штриховка">
              <ToolBtn id="hatch" tool={tool} onTool={onTool} large />
            </RibbonGroup>
          </>
        )}

        {/* ── ВИД ── */}
        {tab === "view" && (
          <>
            <RibbonGroup label="Навигация">
              <RibbonBtn icon="Maximize2" label="По всем объектам" large onClick={onFitView} />
              <div className="flex flex-col gap-0.5">
                <RibbonBtn icon="ZoomIn"  label="Увел." onClick={() => onZoom(0.25)} />
                <RibbonBtn icon="ZoomOut" label="Умен." onClick={() => onZoom(-0.25)} />
              </div>
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Сетка и привязка">
              <RibbonBtn icon="Grid3x3" label="Сетка"    large active={showGrid}  onClick={onToggleGrid} />
              <RibbonBtn icon="Magnet"  label="Привязка" large active={snapGrid}  onClick={onToggleSnap} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Порядок объектов">
              <RibbonBtn icon="MoveUp"   label="На перед"  onClick={onBringForward} />
              <RibbonBtn icon="MoveDown" label="На зад"    onClick={onSendBackward} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Группировка">
              <RibbonBtn icon="Layers2"  label="Группировать"   onClick={onGroupSelected} />
              <RibbonBtn icon="Layers"   label="Разгруппировать" onClick={onUngroupSelected} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Выравнивание">
              <RibbonBtn icon="AlignLeft"           label="По левому" onClick={onAlignLeft} />
              <RibbonBtn icon="AlignCenter"         label="По центру" onClick={onAlignCenter} />
              <RibbonBtn icon="AlignRight"          label="По правому" onClick={onAlignRight} />
            </RibbonGroup>
          </>
        )}

        {/* ── ВЫВОД ── */}
        {tab === "output" && (
          <>
            <RibbonGroup label="Печать / Экспорт">
              <RibbonBtn icon="Printer"  label="Печать (PDF)" large onClick={onExportPNG} />
              <RibbonBtn icon="Download" label="Экспорт DXF"  large onClick={onExportDXF} />
              <RibbonBtn icon="Image"    label="Экспорт PNG"       onClick={onExportPNG} />
              <RibbonBtn icon="Upload"   label="Импорт SVG"        onClick={onImportSVG} />
            </RibbonGroup>
            <Sep />

            <RibbonGroup label="Очистка">
              <RibbonBtn icon="RotateCcw" label="Очистить всё" large onClick={onClearCanvas} />
              <RibbonBtn icon="Trash2"    label="Удалить выбр." onClick={onDeleteSelected} />
            </RibbonGroup>
          </>
        )}
      </div>
    </div>
  );
}