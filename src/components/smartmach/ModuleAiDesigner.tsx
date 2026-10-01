import { useMemo, useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AiModelEditor from "@/components/smartmach/AiModelEditor";
import { useAiPartDesign, type AgentState } from "@/components/smartmach/useAiPartDesign";
import { sheetSvg } from "@/lib/aipart/svg";
import { massKg, fmt, KIND_LABEL } from "@/lib/aipart/model";
import { spindleFromSpeed, mainTime, opTimes, fmtMin } from "@/lib/techcard";
import type { TechPlan } from "@/lib/aipart/agents";

const EXAMPLES = [
  "Вал тихоходный редуктора: шейки под подшипники 6209, посадка зубчатого колеса ∅50 со шпонкой, выходной конец ∅40 под муфту со шпонкой, длина около 300 мм, сталь 45, улучшение",
  "Фланец переходной ∅180, толщина 25, ступица ∅90 высотой 50, отверстие ∅60H7 со шпоночным пазом, 8 отверстий под болты М12",
  "Плита опорная 200×120×20, четыре отверстия ∅11 по углам с отступом 20 мм, в центре резьба М12, сталь 3",
  "Втулка бронзовая ∅50×40, внутреннее отверстие ∅35H7, фаски 1×45°",
];

interface Props { onOpenTechCard?: (id: number) => void; onOpenCad?: () => void }

/** Оценка норм плана технолога до сохранения (сервер пересчитает так же) */
export function planTotals(plan: TechPlan, batch: number) {
  let tSht = 0, tShtK = 0;
  for (const op of plan.ops) {
    const tMain = op.steps.reduce((a, st) => {
      const n = spindleFromSpeed(st.speed, st.diameter);
      const t = st.feed && st.length ? mainTime(st.length, st.overrun, st.passes, n, st.feed) : null;
      return a + (t ?? st.t_main ?? 0);
    }, 0);
    const r = opTimes(tMain, op.t_aux, op.k_service_pct, op.t_pz, batch);
    tSht += r.tSht; tShtK += r.tShtK;
  }
  return { tSht, tShtK };
}

function AgentBadge({ title, role, state, error, icon }: { title: string; role: string; state: AgentState; error: string | null; icon: string }) {
  const cfg: Record<AgentState, [string, string, string]> = {
    idle: ["bg-muted text-muted-foreground", "Ожидает", "Clock"],
    working: ["bg-blue-50 text-blue-700 border-blue-200", "Работает…", "Loader2"],
    done: ["bg-green-50 text-green-700 border-green-200", "Готово", "CheckCircle2"],
    error: ["bg-red-50 text-red-700 border-red-200", "Ошибка", "AlertCircle"],
  };
  const [cls, label, stIcon] = cfg[state];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${cls}`} data-testid={`agent-${icon}`}>
      <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0"><Icon name={icon} size={18} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs opacity-80 truncate">{error ?? role}</div>
      </div>
      <span className="flex items-center gap-1 text-xs font-medium whitespace-nowrap">
        <Icon name={stIcon} size={14} className={state === "working" ? "animate-spin" : ""} />{label}
      </span>
    </div>
  );
}

export default function ModuleAiDesigner({ onOpenTechCard, onOpenCad }: Props) {
  const ai = useAiPartDesign();
  const [desc, setDesc] = useState("");
  const [batch, setBatch] = useState("50");
  const [tab, setTab] = useState<"drawing" | "params">("drawing");
  const [saved, setSaved] = useState<{ techcardId: number } | null>(null);
  const batchN = Math.max(1, parseInt(batch) || 1);

  const svg = useMemo(() => {
    if (!ai.drawing || !ai.model) return "";
    return sheetSvg(ai.drawing.prims, ai.drawing.sheetW, ai.drawing.sheetH, {
      name: ai.model.name, designation: ai.model.designation, material: ai.model.material,
      scale: ai.drawing.scale, mass: `${fmt(massKg(ai.model))} кг`,
    });
  }, [ai.drawing, ai.model]);

  const totals = useMemo(() => (ai.plan ? planTotals(ai.plan, batchN) : null), [ai.plan, batchN]);
  const busy = ai.cState === "working" || ai.tState === "working";

  const start = () => {
    if (desc.trim().length < 10) { toast.error("Опишите деталь подробнее: что это, основные размеры, материал"); return; }
    setSaved(null);
    ai.design(desc.trim(), batchN);
  };

  const save = async () => {
    try {
      const r = await ai.save(batchN);
      setSaved({ techcardId: r.techcardId });
      toast.success("Деталь, чертёж и техкарта сохранены");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка сохранения"); }
  };

  const downloadSvg = () => {
    if (!svg || !ai.model) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = `${ai.model.designation}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight flex items-center gap-2">
          ИИ-конструктор
          <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">BETA</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Опишите деталь — ИИ-конструктор выпустит рабочий чертёж, а ИИ-технолог параллельно разработает техкарту
        </p>
      </div>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <textarea data-testid="ai-desc"
          className="w-full min-h-[96px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Например: вал редуктора, шейки под подшипники 6209, посадка колеса ∅50 со шпонкой, выходной конец ∅40, сталь 45"
          value={desc} onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) start(); }} />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setDesc(ex)}
              className="text-xs rounded-full border px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground max-w-[260px] truncate">
              {ex}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Партия, шт</span>
            <Input className="h-9 w-24" inputMode="numeric" value={batch} onChange={(e) => setBatch(e.target.value)} />
          </label>
          <Button onClick={start} disabled={busy}>
            <Icon name={busy ? "Loader2" : "Sparkles"} size={16} className={`mr-2 ${busy ? "animate-spin" : ""}`} />
            {ai.model ? "Спроектировать заново" : "Спроектировать"}
          </Button>
          {ai.model && !busy && <Button variant="ghost" onClick={() => { ai.reset(); setSaved(null); }}>Очистить</Button>}
        </div>
      </section>

      {(ai.cState !== "idle" || ai.tState !== "idle") && (
        <div className="grid sm:grid-cols-2 gap-3">
          <AgentBadge title="ИИ-конструктор" role="Размеры, допуски, шероховатость, требования" state={ai.cState} error={ai.cError} icon="PenTool" />
          <AgentBadge title="ИИ-технолог" role={ai.planStale ? "Модель изменена — пересчитайте техпроцесс" : "Маршрут, переходы, режимы резания, нормы"}
            state={ai.tState} error={ai.tError} icon="Wrench" />
        </div>
      )}

      {ai.cState === "error" && (
        <Button variant="outline" size="sm" onClick={start}><Icon name="RotateCw" size={14} className="mr-1.5" />Повторить</Button>
      )}

      {ai.model && ai.drawing && (
        <div className="grid xl:grid-cols-[1fr_420px] gap-4 items-start">
          <section className="rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
              {(["drawing", "params"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`text-sm px-3 py-1 rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  {t === "drawing" ? "Чертёж" : "Параметры"}
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-auto">
                {KIND_LABEL[ai.model.kind]} · {ai.drawing.paper} · М {ai.drawing.scale} · {fmt(massKg(ai.model))} кг
              </span>
              <Button variant="ghost" size="sm" onClick={downloadSvg} title="Скачать SVG"><Icon name="Download" size={14} /></Button>
            </div>
            {tab === "drawing" ? (
              <div className="bg-muted/40 p-3">
                <div className="bg-white shadow-sm mx-auto [&>svg]:w-full [&>svg]:h-auto" data-testid="ai-drawing"
                  dangerouslySetInnerHTML={{ __html: svg }} />
              </div>
            ) : (
              <div className="p-4"><AiModelEditor model={ai.model} onChange={ai.updateModel} /></div>
            )}
            {ai.warnings.constructor.length > 0 && (
              <div className="border-t bg-amber-50 px-4 py-2 text-xs text-amber-800 space-y-0.5">
                {ai.warnings.constructor.map((w) => <div key={w}>• {w}</div>)}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <h2 className="font-semibold text-sm">Техпроцесс</h2>
              {totals && (
                <span className="text-xs text-muted-foreground">Тшт {fmtMin(totals.tSht)} · Тшк {fmtMin(totals.tShtK)}</span>
              )}
            </div>
            {ai.tState === "working" && (
              <div className="p-6 text-center text-sm text-muted-foreground space-y-2">
                <Icon name="Loader2" size={22} className="animate-spin mx-auto" />
                <div>ИИ-технолог подбирает станки, инструмент и режимы резания…</div>
              </div>
            )}
            {ai.tState === "error" && (
              <div className="p-4 space-y-2">
                <p className="text-sm text-destructive">{ai.tError}</p>
                <Button size="sm" variant="outline" onClick={() => ai.rerunTech(batchN)}>Повторить</Button>
              </div>
            )}
            {ai.plan && ai.tState !== "working" && (
              <div className="divide-y" data-testid="ai-plan">
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  Заготовка: {ai.plan.blank_type ?? "—"} {ai.plan.blank_size ?? ""}{ai.plan.blank_mass ? `, ${fmt(ai.plan.blank_mass)} кг` : ""}
                </div>
                {ai.plan.ops.map((op) => (
                  <div key={op.op_no} className="px-4 py-2">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{op.op_no}</span>
                      <span className="font-medium">{op.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-8">
                      {op.equipment_name ?? "станок не выбран"}
                      {op.equipment_id === null && op.steps.some((s) => s.feed) && <span className="text-amber-700"> · нет в справочнике</span>}
                      {` · переходов: ${op.steps.length}`}
                    </div>
                  </div>
                ))}
                {ai.warnings.technologist.length > 0 && (
                  <div className="bg-amber-50 px-4 py-2 text-xs text-amber-800 space-y-0.5">
                    {ai.warnings.technologist.map((w) => <div key={w}>• {w}</div>)}
                  </div>
                )}
              </div>
            )}
            {ai.planStale && ai.tState !== "working" && (
              <div className="px-4 py-3 border-t bg-blue-50 flex items-center gap-2 text-xs text-blue-800">
                <span className="flex-1">Параметры детали изменились после разработки техпроцесса.</span>
                <Button size="sm" variant="outline" onClick={() => ai.rerunTech(batchN)}>Пересчитать</Button>
              </div>
            )}
            <div className="p-4 border-t space-y-2">
              {saved ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-700 flex items-center gap-1.5"><Icon name="CheckCircle2" size={16} />Сохранено: деталь, чертёж и техкарта</p>
                  <div className="flex flex-wrap gap-2">
                    {onOpenTechCard && <Button size="sm" onClick={() => onOpenTechCard(saved.techcardId)}>Открыть техкарту</Button>}
                    {onOpenCad && <Button size="sm" variant="outline" onClick={onOpenCad}>К деталям</Button>}
                  </div>
                </div>
              ) : (
                <>
                  <Button className="w-full" onClick={save} disabled={!ai.plan || busy || ai.saving || ai.planStale}>
                    <Icon name={ai.saving ? "Loader2" : "Save"} size={15} className={`mr-2 ${ai.saving ? "animate-spin" : ""}`} />
                    Сохранить деталь, чертёж и техкарту
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Результат ИИ — черновик. Перед запуском в производство чертёж проверяет конструктор, техкарту — технолог.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
