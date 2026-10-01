/**
 * Конвейер «ИИ-конструктор → (чертёж ‖ ИИ-технолог) → сохранение».
 * Чертёж строится мгновенно по модели, технолог работает параллельно с показом чертежа.
 * Пользователь может поправить модель — чертёж перестраивается, техпроцесс перезапускается по кнопке.
 */
import { useState, useCallback, useRef } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { runConstructor, runTechnologist, type TechPlan, type EquipmentRef, type SketchReport } from "@/lib/aipart/agents";
import { buildDrawing, type DrawingResult } from "@/lib/aipart/drawing";
import { type PartModel, massKg, dimensions, fmt, CATEGORY } from "@/lib/aipart/model";
import { renderToFabric } from "@/lib/aipart/fabric";

export type AgentState = "idle" | "working" | "done" | "error";

export interface SaveResult { partId: number; drawingId: number; techcardId: number }

const initials = (name: string) => {
  const [last, first, mid] = name.trim().split(/\s+/);
  return [last, first ? `${first[0]}.` : "", mid ? `${mid[0]}.` : ""].join(" ").trim();
};

export function useAiPartDesign() {
  const { user } = useAuth();
  const [model, setModel] = useState<PartModel | null>(null);
  const [drawing, setDrawing] = useState<DrawingResult | null>(null);
  const [plan, setPlan] = useState<TechPlan | null>(null);
  const [warnings, setWarnings] = useState<{ constructor: string[]; technologist: string[] }>({ constructor: [], technologist: [] });
  const [cState, setCState] = useState<AgentState>("idle");
  const [tState, setTState] = useState<AgentState>("idle");
  const [cError, setCError] = useState<string | null>(null);
  const [tError, setTError] = useState<string | null>(null);
  const [planStale, setPlanStale] = useState(false);
  const [sketch, setSketch] = useState<SketchReport | null>(null);
  const [saving, setSaving] = useState(false);
  const equipmentRef = useRef<EquipmentRef[] | null>(null);
  const runId = useRef(0);

  const loadEquipment = useCallback(async () => {
    if (equipmentRef.current) return equipmentRef.current;
    try {
      const list = await apiGet<EquipmentRef[]>("equipment");
      equipmentRef.current = (Array.isArray(list) ? list : []).map((e) => ({ id: e.id, name: e.name, model: e.model, type: e.type }));
    } catch { equipmentRef.current = []; }
    return equipmentRef.current;
  }, []);

  const runTech = useCallback(async (m: PartModel, batch: number, id: number) => {
    setTState("working"); setTError(null); setPlanStale(false);
    try {
      const eq = await loadEquipment();
      const { plan: p, warnings: w } = await runTechnologist(m, eq, batch);
      if (runId.current !== id) return;
      setPlan(p); setWarnings((x) => ({ ...x, technologist: w })); setTState("done");
    } catch (e) {
      if (runId.current !== id) return;
      setTError(e instanceof Error ? e.message : "ИИ-технолог не ответил"); setTState("error");
    }
  }, [loadEquipment]);

  const design = useCallback(async (description: string, batch: number, image?: string) => {
    const id = ++runId.current;
    setModel(null); setDrawing(null); setPlan(null); setPlanStale(false); setSketch(null);
    setWarnings({ constructor: [], technologist: [] });
    setCState("working"); setTState("idle"); setCError(null); setTError(null);
    loadEquipment();
    try {
      const { model: m, warnings: w, sketch: sk } = await runConstructor(description, { image });
      if (runId.current !== id) return;
      setSketch(sk);
      setModel(m); setDrawing(buildDrawing(m));
      setWarnings((x) => ({ ...x, constructor: w })); setCState("done");
      void runTech(m, batch, id);
    } catch (e) {
      if (runId.current !== id) return;
      setCError(e instanceof Error ? e.message : "ИИ-конструктор не ответил"); setCState("error");
    }
  }, [loadEquipment, runTech]);

  /** Ручная правка модели: чертёж — сразу, техпроцесс помечается устаревшим */
  const updateModel = useCallback((m: PartModel) => {
    try {
      setDrawing(buildDrawing(m)); setModel(m);
      if (plan || tState === "working") setPlanStale(true);
    } catch { /* недостроенная модель — оставляем прежний чертёж */ }
  }, [plan, tState]);

  const rerunTech = useCallback((batch: number) => {
    if (model) void runTech(model, batch, runId.current);
  }, [model, runTech]);

  const save = useCallback(async (batch: number): Promise<SaveResult> => {
    if (!model || !drawing || !plan) throw new Error("Чертёж и техпроцесс ещё не готовы");
    setSaving(true);
    try {
      const mass = massKg(model);
      const gost = {
        paperSize: drawing.paper, drawingNumber: model.designation, drawingName: model.name,
        company: user?.company_name ?? "", designer: user ? initials(user.name) : "", checker: "", normController: "",
        approver: "", material: model.material, litera: "", scale: drawing.scale, mass: fmt(mass, 2), sheet: "1", sheets: "1",
      };
      const { json, png } = await renderToFabric(drawing.prims, drawing.paper, gost);

      const imp = await apiPost<{ id: number; part_id: number }>("manufacture", {
        part: {
          code: model.designation, name: model.name, material: model.material, category: CATEGORY[model.kind],
          dimensions: dimensions(model), weight_kg: mass,
          notes: `Создано ИИ-конструктором${sketch ? " по эскизу" : ""}. Модель: ` + JSON.stringify(model).slice(0, 3000),
        },
        process: {
          name: `Техпроцесс механической обработки: ${model.name}`, code: `ТП-${model.designation}`,
          material: model.material, blank_type: plan.blank_type, blank_size: plan.blank_size,
          blank_mass: plan.blank_mass, part_mass: mass, batch_size: batch, status: "draft",
          developer: gost.designer, notes: "Разработан ИИ-технологом — требует проверки технологом.",
        },
        operations: plan.ops,
      }, { resource: "techcard_import" });

      const dr = await apiPost<{ id: number }>("drawings", {
        image: png, canvas_json: json, name: `${model.designation} ${model.name}`,
        description: "Сгенерирован ИИ-конструктором", part_id: imp.part_id,
        paper_size: drawing.paper, theme: "light", gost_meta: gost, module: "cad",
        change_note: "Создан ИИ-конструктором",
      });
      return { partId: imp.part_id, drawingId: dr.id, techcardId: imp.id };
    } finally { setSaving(false); }
  }, [model, drawing, plan, user, sketch]);

  const reset = useCallback(() => {
    runId.current++;
    setModel(null); setDrawing(null); setPlan(null); setCState("idle"); setTState("idle");
    setCError(null); setTError(null); setPlanStale(false); setWarnings({ constructor: [], technologist: [] }); setSketch(null);
  }, []);

  return { model, drawing, plan, warnings, sketch, cState, tState, cError, tError, planStale, saving,
    design, updateModel, rerunTech, save, reset };
}
