import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  Assembly, AssemblyNode, AssemblyStats as StatsT,
  AsmStage, AsmType,
  ASM_STAGE_CFG, ASM_TYPE_LABELS,
  asmGet, asmPost, asmPut,
} from "@/lib/assembly";
import AssemblyTree   from "@/components/smartmach/AssemblyTree";
import AssemblyBOM    from "@/components/smartmach/AssemblyBOM";
import AssemblyStats  from "@/components/smartmach/AssemblyStats";
import AssemblyImport from "@/components/smartmach/AssemblyImport";
import AiAssistant    from "@/components/smartmach/AiAssistant";

const AI_SYSTEM = `Ты — эксперт по конструированию сборочных узлов и редукторов в системе СмартМаш.
Помогаешь с составом изделий, выбором материалов, стандартами ГОСТ, оформлением спецификаций по ГОСТ 2.106,
расчётом передаточных чисел, подбором подшипников и крепежа. Отвечай конкретно и по делу.`;

const AI_SUGGESTIONS = [
  "Какие материалы выбрать для шестерён цилиндрического редуктора?",
  "Как рассчитать передаточное число двухступенчатого редуктора?",
  "Стандарты ГОСТ на оформление спецификации (ГОСТ 2.106)",
  "Какие подшипники подойдут для быстроходного вала?",
  "Как правильно указать посадки в спецификации?",
];

const STAGE_ORDER: AsmStage[] = ["draft","design","review","approved","production","archive"];

function AssemblyForm({
  onSave, onClose,
}: {
  onSave: (a: Assembly) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    code: "", name: "", description: "", asm_type: "assembly" as AsmType,
    stage: "draft" as AsmStage, revision: "A", standard: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));
  const inp = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const saved = await asmPost<Assembly>("assemblies", form);
      onSave(saved);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Новая сборочная единица</h2>
          <button onClick={onClose}><Icon name="X" size={18} className="text-muted-foreground" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Обозначение *</label>
              <input required value={form.code} onChange={e => f("code", e.target.value)}
                placeholder="РЦ-250-СБ" className={inp} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ревизия</label>
              <input value={form.revision} onChange={e => f("revision", e.target.value)}
                placeholder="A" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Наименование *</label>
            <input required value={form.name} onChange={e => f("name", e.target.value)}
              placeholder="Редуктор цилиндрический РЦ-250" className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
            <textarea value={form.description} onChange={e => f("description", e.target.value)}
              rows={2} className={`${inp} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <select value={form.asm_type} onChange={e => f("asm_type", e.target.value)} className={inp}>
                {Object.entries(ASM_TYPE_LABELS).map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
              <select value={form.stage} onChange={e => f("stage", e.target.value)} className={inp}>
                {STAGE_ORDER.map(s => (
                  <option key={s} value={s}>{ASM_STAGE_CFG[s].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ГОСТ / Стандарт</label>
            <input value={form.standard} onChange={e => f("standard", e.target.value)}
              placeholder="ГОСТ Р 50891-96" className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Примечание</label>
            <textarea value={form.notes} onChange={e => f("notes", e.target.value)}
              rows={2} className={`${inp} resize-none`} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium">
              {saving ? "Создание…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────

type Tab = "tree" | "bom" | "ai";

export default function ModuleAssembly({ onNavigateToPart }: { onNavigateToPart?: (partId: number) => void }) {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selected,   setSelected]   = useState<Assembly | null>(null);
  const [nodes,      setNodes]       = useState<AssemblyNode[]>([]);
  const [stats,      setStats]       = useState<StatsT | null>(null);
  const [partsList,  setPartsList]   = useState<{id:number;code:string;name:string;material:string|null}[]>([]);
  const [loading,    setLoading]     = useState(true);
  const [nodesLoading, setNL]        = useState(false);
  const [error,      setError]       = useState<string | null>(null);
  const [tab,        setTab]         = useState<Tab>("tree");
  const [showCreate, setShowCreate]  = useState(false);
  const [showImport, setShowImport]  = useState(false);

  async function loadList() {
    setLoading(true); setError(null);
    try {
      const [list, parts] = await Promise.all([
        asmGet<Assembly[]>("assemblies"),
        asmGet<typeof partsList>("parts_list"),
      ]);
      setAssemblies(list);
      setPartsList(parts);
      if (list.length > 0 && !selected) {
        await selectAssembly(list[0]);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }

  async function selectAssembly(asm: Assembly) {
    setSelected(asm);
    setNL(true);
    try {
      const [ns, st] = await Promise.all([
        asmGet<AssemblyNode[]>("nodes", { assembly_id: asm.id }),
        asmGet<StatsT>("stats",  { assembly_id: asm.id }),
      ]);
      setNodes(ns);
      setStats(st);
    } finally { setNL(false); }
  }

  async function refreshNodes() {
    if (!selected) return;
    const [ns, st] = await Promise.all([
      asmGet<AssemblyNode[]>("nodes", { assembly_id: selected.id }),
      asmGet<StatsT>("stats",  { assembly_id: selected.id }),
    ]);
    setNodes(ns);
    setStats(st);
  }

  async function advanceStage(asm: Assembly) {
    const idx = STAGE_ORDER.indexOf(asm.stage);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return;
    const next = STAGE_ORDER[idx + 1];
    await asmPut("assemblies", asm.id, { stage: next });
    await loadList();
  }

  useEffect(() => { loadList(); }, []);

  const NEXT_STAGE: Partial<Record<AsmStage, string>> = {
    draft: "В разработку", design: "На проверку", review: "Согласовать",
    approved: "В производство",
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* ── Шапка ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Состав изделия</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">
            Сборочные единицы · Дерево состава · Спецификация ГОСТ 2.106
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selected && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary/60 transition-colors text-foreground">
              <Icon name="FileSpreadsheet" size={15} />
              <span className="hidden sm:inline">Импорт Excel</span>
            </button>
          )}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Icon name="Plus" size={16} />
            <span className="hidden sm:inline">Новая сборка</span><span className="sm:hidden">Сборка</span>
          </button>
        </div>
      </div>

      {loading && !selected ? (
        <div className="py-20 text-center text-muted-foreground text-sm">
          <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 text-sm">
          <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error}
          <button onClick={loadList} className="mt-2 block mx-auto text-xs underline">Повторить</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">

          {/* ── Левая колонка: список сборок ── */}
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/40">
                <span className="text-sm font-semibold">Сборочные единицы</span>
                <span className="ml-2 text-xs text-muted-foreground">({assemblies.length})</span>
              </div>
              {assemblies.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Icon name="Package" size={32} className="mx-auto mb-2 opacity-20" />
                  Нет сборок. Создайте первую.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {assemblies.map(asm => {
                    const stageCfg = ASM_STAGE_CFG[asm.stage] ?? ASM_STAGE_CFG.draft;
                    const isActive = selected?.id === asm.id;
                    return (
                      <button
                        key={asm.id}
                        onClick={() => selectAssembly(asm)}
                        className={`w-full text-left px-4 py-3 hover:bg-secondary/30 transition-colors ${
                          isActive ? "bg-primary/8 border-l-2 border-primary" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-foreground truncate">{asm.name}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{asm.code}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${stageCfg.color}`}>
                              {stageCfg.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Rev.{asm.revision}</span>
                          </div>
                        </div>
                        {(asm.node_count !== undefined) && (
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon name="Layers" size={9} />{asm.node_count} узлов
                            </span>
                            {asm.calc_weight_kg != null && Number(asm.calc_weight_kg) > 0 && (
                              <span className="flex items-center gap-1">
                                <Icon name="Scale" size={9} />{Number(asm.calc_weight_kg).toFixed(1)} кг
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Статистика выбранной сборки */}
            {stats && <AssemblyStats stats={stats} />}
          </div>

          {/* ── Правая колонка: дерево / BOM / AI ── */}
          <div className="min-w-0 space-y-4">
            {selected ? (
              <>
                {/* Карточка сборки */}
                <div className="bg-white rounded-xl border border-border shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-foreground text-lg leading-tight">{selected.name}</h2>
                        <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{selected.code}</span>
                      </div>
                      {selected.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selected.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
                        <span>{ASM_TYPE_LABELS[selected.asm_type]}</span>
                        {selected.standard && <span>· {selected.standard}</span>}
                        {selected.notes && <span className="text-[11px]">· {selected.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ASM_STAGE_CFG[selected.stage].color}`}>
                        {ASM_STAGE_CFG[selected.stage].label}
                      </span>
                      {NEXT_STAGE[selected.stage] && (
                        <button
                          onClick={() => advanceStage(selected)}
                          className="flex items-center gap-1 text-xs px-3 py-1 border border-primary text-primary rounded-full hover:bg-primary/5 transition-colors"
                        >
                          <Icon name="ChevronRight" size={12} />
                          {NEXT_STAGE[selected.stage]}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Вкладки */}
                <div className="flex gap-0.5 bg-secondary/50 p-1 rounded-xl w-fit">
                  {([
                    { id: "tree" as Tab, label: "Дерево состава", icon: "GitBranch" },
                    { id: "bom"  as Tab, label: "Спецификация",   icon: "FileText" },
                    { id: "ai"   as Tab, label: "ИИ-помощник",    icon: "Sparkles" },
                  ] as const).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        tab === t.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Контент вкладки */}
                {nodesLoading ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">
                    <Icon name="Loader" size={24} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка дерева…
                  </div>
                ) : tab === "tree" ? (
                  <AssemblyTree
                    assemblyId={selected.id}
                    nodes={nodes}
                    onRefresh={refreshNodes}
                    onNavigateToPart={onNavigateToPart}
                    partsList={partsList}
                  />
                ) : tab === "bom" ? (
                  <AssemblyBOM
                    assemblyId={selected.id}
                    assemblyName={selected.name}
                    assemblyCode={selected.code}
                    assemblyRevision={selected.revision}
                  />
                ) : (
                  <AiAssistant system={AI_SYSTEM} suggestions={AI_SUGGESTIONS} />
                )}
              </>
            ) : (
              <div className="py-20 text-center text-muted-foreground text-sm bg-white rounded-xl border border-border">
                <Icon name="Package" size={40} className="mx-auto mb-3 opacity-20" />
                Выберите сборку из списка
              </div>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <AssemblyForm
          onSave={async (asm) => {
            setShowCreate(false);
            await loadList();
            await selectAssembly(asm);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showImport && selected && (
        <AssemblyImport
          assemblyId={selected.id}
          assemblyName={selected.name}
          onImported={refreshNodes}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}