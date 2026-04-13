import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Program, Part, Machine, User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";
import CamPrograms from "@/components/smartmach/CamPrograms";
import { EMPTY_FORM, NEXT, AI_SYSTEM, AI_SUGGESTIONS } from "@/components/smartmach/cam.data";

export default function ModuleCAM() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [pr, pa, m, u] = await Promise.all([
        mGet<Program[]>("programs"), mGet<Part[]>("parts"),
        mGet<Machine[]>("machines"), mGet<User[]>("users"),
      ]);
      setPrograms(pr); setParts(pa); setMachines(m); setUsers(u);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await mPost("programs", {
        name: form.name,
        code: form.code || null,
        est_time: form.est_time || null,
        status: form.status,
        part_id: form.part_id ? Number(form.part_id) : null,
        machine_id: form.machine_id ? Number(form.machine_id) : null,
        author_id: form.author_id ? Number(form.author_id) : null,
      });
      setForm(EMPTY_FORM); setShowForm(false); await load();
    } catch { alert("Ошибка при создании"); }
    finally { setSaving(false); }
  }

  async function advance(prog: Program) {
    const next = NEXT[prog.status];
    if (!next) return;
    try { await mPut("programs", prog.id, { status: next }); await load(); }
    catch { alert("Ошибка обновления"); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Программы ЧПУ</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Управляющие программы, режимы резания и очередь обработки</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Новая программа
        </button>
      </div>

      <CamPrograms
        programs={programs}
        parts={parts}
        machines={machines}
        users={users}
        loading={loading}
        error={error}
        showForm={showForm}
        saving={saving}
        form={form}
        onSetShowForm={setShowForm}
        onSetForm={setForm}
        onSubmit={handleCreate}
        onAdvance={advance}
        onRetry={load}
      />

      <AiAssistant
        title="Помощник технолога"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}
