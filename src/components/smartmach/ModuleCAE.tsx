import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Simulation, Part, User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";
import CaeKpi from "@/components/smartmach/CaeKpi";
import CaeForm from "@/components/smartmach/CaeForm";
import CaeList from "@/components/smartmach/CaeList";
import { EMPTY, NEXT, AI_SYSTEM, AI_SUGGESTIONS } from "@/components/smartmach/cae.data";

export default function ModuleCAE() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  async function load() {
    setLoading(true); setError(null);
    try {
      const [s, p, u] = await Promise.all([
        mGet<Simulation[]>("simulations"), mGet<Part[]>("parts"), mGet<User[]>("users"),
      ]);
      setSims(s); setParts(p); setUsers(u);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await mPost("simulations", {
        name: form.name, sim_type: form.sim_type, status: form.status,
        result: form.result || null,
        stress_pct: form.stress_pct ? Number(form.stress_pct) : null,
        part_id: form.part_id ? Number(form.part_id) : null,
        author_id: form.author_id ? Number(form.author_id) : null,
      });
      setForm(EMPTY); setShowForm(false); await load();
    } catch { alert("Ошибка при создании"); }
    finally { setSaving(false); }
  }

  async function advance(sim: Simulation) {
    const next = NEXT[sim.status];
    if (!next) return;
    try { await mPut("simulations", sim.id, { status: next }); await load(); }
    catch { alert("Ошибка обновления"); }
  }

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const simTypeGroups = [...new Set(sims.map((s) => s.sim_type))];

  const filtered = sims.filter((s) => {
    const matchType = filterType === "all" || s.sim_type === filterType;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchType && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Расчёты — Инженерный анализ</h1>
          <p className="text-muted-foreground text-sm mt-0.5">МКЭ-расчёты: прочность, тепло, динамика, усталость</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Новый расчёт
        </button>
      </div>

      <CaeKpi sims={sims} />

      {showForm && (
        <CaeForm
          form={form}
          saving={saving}
          parts={parts}
          users={users}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          onField={f}
        />
      )}

      <CaeList
        sims={sims}
        filtered={filtered}
        loading={loading}
        error={error}
        filterStatus={filterStatus}
        filterType={filterType}
        simTypeGroups={simTypeGroups}
        onFilterStatus={setFilterStatus}
        onFilterType={setFilterType}
        onAdvance={advance}
        onRetry={load}
      />

      <AiAssistant
        title="Помощник расчётчика"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}
