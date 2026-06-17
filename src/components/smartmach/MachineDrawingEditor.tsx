/**
 * MachineDrawingEditor — полноценный 2D-редактор чертежей для модуля «Станок МАТ-1».
 * Использует тот же Canvas-движок что и CadEditor2D, но сохраняет чертежи
 * через API drawings с привязкой module="machine".
 */
import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";
import Cad2DToolbar from "@/components/smartmach/Cad2DToolbar";
import Cad2DGostDialog from "@/components/smartmach/Cad2DGostDialog";
import { Cad2DLayersPanel, Cad2DPropsPanel } from "@/components/smartmach/Cad2DPanels";
import { useCad2DCanvas, drawGostFrame } from "@/components/smartmach/useCad2DCanvas";
import { useCad2DDrawing } from "@/components/smartmach/useCad2DDrawing";
import { useCad2DActions } from "@/components/smartmach/useCad2DActions";
import Cad2DRuler from "@/components/smartmach/Cad2DRuler";
import AiDraftAgentPanel from "@/components/smartmach/AiDraftAgentPanel";
import { toInitials } from "@/components/smartmach/Cad2DGostDialog";
import { useAuth } from "@/context/AuthContext";
import { apiPost, apiPut } from "@/lib/api";
import { toast } from "sonner";
import type { MachineDrawing } from "@/components/smartmach/MachineDrawingsList";
import type { MachineTemplate } from "@/components/smartmach/machineDrawingTemplates";

interface Props {
  drawing?: MachineDrawing | null;  // null = новый чертёж
  template?: MachineTemplate | null; // шаблон для нового чертежа
  onBack: () => void;
  onSaved: (drawing: MachineDrawing) => void;
}

interface SaveDialogProps {
  preview: string;
  paperSize: string;
  theme: "light" | "dark";
  initialName: string;
  initialDescription: string;
  saving: boolean;
  error: string | null;
  onSave: (name: string, desc: string) => void;
  onClose: () => void;
}

function SaveDialog({ preview, paperSize, theme, initialName, initialDescription, saving, error, onSave, onClose }: SaveDialogProps) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDescription);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1c2e] border border-gray-600 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">Сохранить чертёж</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex gap-4">
            <div className="w-36 h-24 rounded-lg overflow-hidden border border-gray-600 bg-gray-900 flex-shrink-0">
              <img src={preview} alt="preview" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Название чертежа *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Станина, вид спереди"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span>Формат: <b className="text-gray-300">{paperSize}</b></span>
                <span>·</span>
                <span>Фон: <b className="text-gray-300">{theme === "dark" ? "Тёмный" : "Светлый"}</b></span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Описание (необязательно)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Рабочий чертёж станины для сварной конструкции..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              <Icon name="AlertCircle" size={13} />{error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Отмена</button>
            <button
              onClick={() => onSave(name.trim() || "Чертёж", desc.trim())}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              {saving
                ? <><Icon name="Loader2" size={13} className="animate-spin" />Сохраняю…</>
                : <><Icon name="Save" size={13} />Сохранить</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MachineDrawingEditor({ drawing, template, onBack, onSaved }: Props) {
  const { user } = useAuth();
  const canvas = useCad2DCanvas();
  const [showGost, setShowGost]   = useState(false);
  const [showSave, setShowSave]   = useState(false);
  const [savePreview, setSavePreview] = useState("");
  const [lastGostMeta, setLastGostMeta] = useState<Record<string, string> | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showAgent, setShowAgent] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Синхронизируем scroll с линейкой
  useEffect(() => {
    const el = canvas.containerRef.current;
    if (!el) return;
    const onScroll = () => { setScrollX(-el.scrollLeft); setScrollY(-el.scrollTop); };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [canvas.containerRef]);

  const { insertPartDrawing } = useCad2DDrawing({
    fabricRef: canvas.fabricRef, drawingRef: canvas.drawingRef,
    startRef: canvas.startRef, activeShapeRef: canvas.activeShapeRef,
    polyPointsRef: canvas.polyPointsRef, snapRef: canvas.snapRef,
    activeLayerRef: canvas.activeLayerRef, setCoords: canvas.setCoords,
    setTool: canvas.setTool, saveHistory: canvas.saveHistory, part: null,
  });

  const actions = useCad2DActions({
    fabricRef: canvas.fabricRef, historyRef: canvas.historyRef,
    clipboardRef: canvas.clipboardRef, polyPointsRef: canvas.polyPointsRef,
    drawingRef: canvas.drawingRef, showGridRef: canvas.showGridRef,
    histIdx: canvas.histIdx, histLen: canvas.histLen,
    setHistIdx: canvas.setHistIdx, zoom: canvas.zoom,
    setZoom: canvas.setZoom, setTool: canvas.setTool,
    setLayers: canvas.setLayers, drawGrid: canvas.drawGrid,
    saveHistory: canvas.saveHistory,
  });

  // Ctrl+колесо зум
  useEffect(() => {
    const el = canvas.containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      actions.handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [canvas.containerRef, actions]);

  // Загружаем canvas_json при открытии существующего чертежа
  useEffect(() => {
    if (!drawing?.canvas_json) return;
    const fc = canvas.fabricRef.current;
    if (!fc) {
      // canvas ещё не готов — ждём
      const tid = setTimeout(() => {
        const fc2 = canvas.fabricRef.current;
        if (fc2 && drawing.canvas_json) {
          fc2.loadFromJSON(drawing.canvas_json, () => fc2.renderAll());
        }
      }, 300);
      return () => clearTimeout(tid);
    }
    fc.loadFromJSON(drawing.canvas_json, () => fc.renderAll());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing?.id]);

  // Применяем шаблон (рамка ГОСТ + геометрия) для нового чертежа
  useEffect(() => {
    if (!template || drawing) return;
    setLastGostMeta(template.gost as unknown as Record<string, string>);
    const apply = () => {
      const fc = canvas.fabricRef.current;
      if (!fc) return false;
      canvas.gostFrameActiveRef.current = true;
      canvas.setPaperSize(template.paperSize);
      setTimeout(() => {
        const fc2 = canvas.fabricRef.current;
        if (!fc2) return;
        const [pw, ph] = PAPER_SIZES[template.paperSize] ?? [0, 0];
        if (pw && ph) {
          fc2.setDimensions({ width: pw, height: ph });
          drawGostFrame(fc2, pw, ph, template.gost);
          template.drawGeometry(fc2, pw, ph);
          fc2.renderAll();
          canvas.saveHistory();
        }
      }, 120);
      return true;
    };
    if (!apply()) {
      const tid = setTimeout(apply, 350);
      return () => clearTimeout(tid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  // Автосохранение canvas_json при каждом изменении истории
  const autoSave = useCallback(async () => {
    if (!drawing?.id) return;  // только для существующих
    const fc = canvas.fabricRef.current;
    if (!fc) return;
    const canvasJson = JSON.stringify(fc.toJSON());
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        await apiPut("drawings", { canvas_json: canvasJson }, { id: drawing.id });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch { setAutoSaveStatus("idle"); }
    }, 1500);
  }, [drawing?.id, canvas.fabricRef]);

  useEffect(() => {
    autoSave();
  }, [canvas.histIdx, autoSave]);

  // Сохранение через диалог (создание или обновление)
  const handleSave = async (name: string, description: string) => {
    const fc = canvas.fabricRef.current;
    if (!fc) return;
    setSaving(true); setSaveError(null);
    try {
      const image = fc.toDataURL({ format: "png", multiplier: 2 });
      const canvasJson = JSON.stringify(fc.toJSON());

      // Автозаполнение штампа: ФИО разработчика и организация из профиля
      const filledMeta: Record<string, string> = { ...(lastGostMeta ?? {}) };
      if (user) {
        if (!filledMeta.designer) filledMeta.designer = toInitials(user.name);
        if (!filledMeta.company && user.company_name) filledMeta.company = user.company_name;
      }

      const payload = {
        image,
        canvas_json: canvasJson,
        name,
        description,
        paper_size: canvas.paperSize,
        theme: canvas.theme,
        gost_meta: filledMeta,
        module: "machine",
      };

      if (drawing?.id) {
        await apiPut("drawings", payload, { id: drawing.id });
        onSaved({ ...drawing, name, description, updated_at: new Date().toISOString() });
      } else {
        const res = await apiPost<{ id: number; file_url: string }>("drawings", payload);
        onSaved({
          id: res.id,
          name,
          description,
          paper_size: canvas.paperSize,
          theme: canvas.theme,
          file_url: res.file_url,
          module: "machine",
          canvas_json: canvasJson,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setShowSave(false);
      toast.success(drawing?.id ? "Чертёж обновлён" : "Чертёж сохранён в библиотеку");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка сохранения";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#12131f] rounded-xl border border-gray-700/60 overflow-hidden" style={{ minHeight: 680 }}>

      {/* Диалог ГОСТ-рамки */}
      {showGost && (
        <Cad2DGostDialog
          currentPaper={canvas.paperSize}
          onClose={() => setShowGost(false)}
          onApply={(opts) => {
            setLastGostMeta(opts as unknown as Record<string, string>);
            canvas.gostFrameActiveRef.current = true;
            canvas.setPaperSize(opts.paperSize);
            setTimeout(() => {
              const fc = canvas.fabricRef.current;
              if (!fc) return;
              const [pw, ph] = PAPER_SIZES[opts.paperSize] ?? [0, 0];
              if (pw && ph) {
                fc.setDimensions({ width: pw, height: ph });
                drawGostFrame(fc, pw, ph, opts);
              }
            }, 50);
          }}
        />
      )}

      {/* Диалог сохранения */}
      {showSave && (
        <SaveDialog
          preview={savePreview}
          paperSize={canvas.paperSize}
          theme={canvas.theme}
          initialName={drawing?.name ?? template?.gost.drawingName ?? "Новый чертёж"}
          initialDescription={drawing?.description ?? template?.subtitle ?? ""}
          saving={saving}
          error={saveError}
          onSave={handleSave}
          onClose={() => setShowSave(false)}
        />
      )}

      {/* Верхняя полоса: назад + имя + статус */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-[#0f1020]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <Icon name="ChevronLeft" size={14} />
          К списку чертежей
        </button>
        <div className="w-px h-4 bg-gray-700" />
        <span className="text-xs font-semibold text-gray-200 flex-1 truncate">
          {drawing?.name ?? "Новый чертёж"}
        </span>
        <div className={cn(
          "flex items-center gap-1.5 text-[10px] transition-all",
          autoSaveStatus === "saving" ? "text-yellow-400" :
          autoSaveStatus === "saved"  ? "text-green-400" : "text-gray-600"
        )}>
          {autoSaveStatus === "saving" && <Icon name="Loader2" size={11} className="animate-spin" />}
          {autoSaveStatus === "saved"  && <Icon name="CheckCircle2" size={11} />}
          {autoSaveStatus === "saving" ? "Сохранение…" :
           autoSaveStatus === "saved"  ? "Сохранено"  : ""}
        </div>
        <button
          onClick={() => setShowAgent((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
            showAgent
              ? "bg-violet-500 text-white"
              : "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90"
          )}
        >
          <Icon name="Sparkles" size={13} />
          ИИ-инженер
        </button>
        <button
          onClick={() => {
            const fc = canvas.fabricRef.current;
            if (!fc) return;
            setSavePreview(fc.toDataURL({ format: "png", multiplier: 2 }));
            setShowSave(true);
          }}
          className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          <Icon name="Save" size={13} />
          Сохранить
        </button>
      </div>

      {/* Ribbon toolbar */}
      <Cad2DToolbar
        tool={canvas.tool}
        onTool={canvas.setTool}
        paperSize={canvas.paperSize}
        strokeW={canvas.strokeW}
        lineType={canvas.lineType}
        showGrid={canvas.showGrid}
        snapGrid={canvas.snapGrid}
        showLayers={canvas.showLayers}
        showProps={canvas.showProps}
        zoom={canvas.zoom}
        histIdx={canvas.histIdx}
        histLen={canvas.histLen}
        onPaperSize={canvas.setPaperSize}
        onStrokeW={canvas.setStrokeW}
        onLineType={canvas.setLineType}
        onToggleGrid={() => canvas.setShowGrid((v) => !v)}
        onToggleSnap={() => canvas.setSnapGrid((v) => !v)}
        onToggleLayers={() => canvas.setShowLayers((v) => !v)}
        onToggleProps={() => canvas.setShowProps((v) => !v)}
        onZoom={actions.handleZoom}
        onFitView={actions.fitView}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onCopy={actions.copySelected}
        onPaste={actions.pasteSelected}
        onDeleteSelected={actions.deleteSelected}
        onClearCanvas={actions.clearCanvas}
        onImportSVG={actions.importSVG}
        onExportDXF={actions.exportDXF}
        onExportPNG={actions.exportPNG}
        onMirror={actions.mirrorSelected}
        onRotate={actions.rotateSelected}
        onScale={() => actions.scaleSelected(2)}
        onOffset={actions.offsetSelected}
        onTrim={actions.trimSelected}
        onExtend={actions.extendSelected}
        onFillet={actions.filletSelected}
        onArray={actions.arraySelected}
        onGroupSelected={actions.groupSelected}
        onUngroupSelected={actions.ungroupSelected}
        onBringForward={actions.bringForward}
        onSendBackward={actions.sendBackward}
        onAlignLeft={actions.alignLeft}
        onAlignCenter={actions.alignCenter}
        onAlignRight={actions.alignRight}
        onOpenGost={() => setShowGost(true)}
        theme={canvas.theme}
        onToggleTheme={() => canvas.setTheme((t) => t === "light" ? "dark" : "light")}
        onSaveDrawing={() => {
          const fc = canvas.fabricRef.current;
          if (!fc) return;
          setSavePreview(fc.toDataURL({ format: "png", multiplier: 2 }));
          setShowSave(true);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">

            {/* Панель слоёв */}
            {canvas.showLayers && (
              <Cad2DLayersPanel
                layers={canvas.layers}
                activeLayer={canvas.activeLayer}
                activeLayerRef={canvas.activeLayerRef}
                onSetActiveLayer={canvas.setActiveLayerState}
                onSetLayers={canvas.setLayers}
                fabricRef={canvas.fabricRef}
              />
            )}

            {/* Линейка + canvas */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              {/* ИИ-агент-инженер */}
              {showAgent && (
                <AiDraftAgentPanel
                  fabricRef={canvas.fabricRef}
                  paperSize={canvas.paperSize}
                  saveHistory={canvas.saveHistory}
                  onApplied={(d) => {
                    if (d.title || d.designation) {
                      setLastGostMeta((prev) => ({
                        ...(prev ?? {}),
                        drawingName: d.title ?? prev?.drawingName ?? "",
                        drawingNumber: d.designation ?? prev?.drawingNumber ?? "",
                        material: d.material ?? prev?.material ?? "",
                      }));
                    }
                  }}
                  onClose={() => setShowAgent(false)}
                />
              )}
              <Cad2DRuler
                orientation="horizontal"
                zoom={canvas.zoom}
                scroll={scrollX}
                size={canvas.canvasSize.width}
              />
              <div className="flex flex-1 min-h-0">
                <Cad2DRuler
                  orientation="vertical"
                  zoom={canvas.zoom}
                  scroll={scrollY}
                  size={canvas.canvasSize.height}
                />
                <div
                  ref={canvas.containerRef}
                  className="flex-1 overflow-auto"
                  style={{ background: canvas.theme === "dark" ? "#1a1c2e" : "#e8e8e8" }}
                >
                  <canvas ref={canvas.canvasRef} />
                </div>
              </div>
            </div>

            {/* Панель свойств */}
            {canvas.showProps && (
              <Cad2DPropsPanel
                fabricRef={canvas.fabricRef}
                strokeW={canvas.strokeW}
                setStrokeW={canvas.setStrokeW}
                lineType={canvas.lineType}
                setLineType={canvas.setLineType}
                layers={canvas.layers}
                activeLayer={canvas.activeLayer}
              />
            )}
          </div>

          {/* Статус-бар */}
          <div className="flex items-center gap-4 px-4 py-1.5 bg-[#0d0e1a] border-t border-gray-800 text-[10px] text-gray-500 font-mono">
            <span>X: {canvas.coords.x.toFixed(0)} Y: {canvas.coords.y.toFixed(0)}</span>
            <span>·</span>
            <span>Масштаб: {Math.round(canvas.zoom * 100)}%</span>
            <span>·</span>
            <span>{canvas.paperSize}</span>
            <span className="ml-auto flex items-center gap-1">
              <Icon name="Hammer" size={10} className="text-amber-500" />
              МАТ-1 Рабочие чертежи
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}