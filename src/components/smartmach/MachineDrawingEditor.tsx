/**
 * MachineDrawingEditor — полноценный 2D-редактор чертежей для модуля «Станок МАТ-1».
 * Использует тот же Canvas-движок что и CadEditor2D, но сохраняет чертежи
 * через API drawings с привязкой module="machine".
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";
import Cad2DToolbar from "@/components/smartmach/Cad2DToolbar";
import Cad2DGostDialog from "@/components/smartmach/Cad2DGostDialog";
import { useCad2DCanvas, drawGostFrame } from "@/components/smartmach/useCad2DCanvas";
import { useCad2DDrawing } from "@/components/smartmach/useCad2DDrawing";
import { useCad2DActions } from "@/components/smartmach/useCad2DActions";
import { toInitials } from "@/components/smartmach/Cad2DGostDialog";
import MachineDrawingSaveDialog from "@/components/smartmach/MachineDrawingSaveDialog";
import MachineDrawingTopBar from "@/components/smartmach/MachineDrawingTopBar";
import MachineDrawingCanvas from "@/components/smartmach/MachineDrawingCanvas";
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

  useCad2DDrawing({
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
          // saveHistory принимает холст: без аргумента шаг истории
          // не записывался и отмена действия не работала
          canvas.saveHistory(fc2);
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

  const openSaveDialog = () => {
    const fc = canvas.fabricRef.current;
    if (!fc) return;
    setSavePreview(fc.toDataURL({ format: "png", multiplier: 2 }));
    setShowSave(true);
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
        <MachineDrawingSaveDialog
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
      <MachineDrawingTopBar
        drawingName={drawing?.name}
        autoSaveStatus={autoSaveStatus}
        showAgent={showAgent}
        onBack={onBack}
        onToggleAgent={() => setShowAgent((v) => !v)}
        onSave={openSaveDialog}
      />

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
        onSaveDrawing={openSaveDialog}
      />

      <MachineDrawingCanvas
        canvas={canvas}
        scrollX={scrollX}
        scrollY={scrollY}
        onToggleLayer={actions.toggleLayer}
        showAgent={showAgent}
        onAgentApplied={(d) => {
          if (d.title || d.designation) {
            setLastGostMeta((prev) => ({
              ...(prev ?? {}),
              drawingName: d.title ?? prev?.drawingName ?? "",
              drawingNumber: d.designation ?? prev?.drawingNumber ?? "",
              material: d.material ?? prev?.material ?? "",
            }));
          }
        }}
        onCloseAgent={() => setShowAgent(false)}
      />
    </div>
  );
}