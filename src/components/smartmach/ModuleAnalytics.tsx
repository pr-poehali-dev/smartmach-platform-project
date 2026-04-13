import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, Stats, Job } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";

const AI_SYSTEM = `Ты — производственный менеджер и аналитик в системе SmartMach. 
Помогаешь с управлением производственными заданиями, расстановкой приоритетов, 
анализом узких мест (бутылочное горлышко), расчётом OEE и производительности, 
планированием загрузки оборудования, снижением простоев. 
Отвечай с конкретными метриками и управленческими решениями.`;

const AI_SUGGESTIONS = [
  "Как расставить приоритеты производственных заданий?",
  "Что такое OEE и как его рассчитать?",
  "Как определить узкое место в производстве?",
  "Как снизить время переналадки оборудования?",
  "Какие KPI нужно отслеживать в цехе?",
];

const JOB_STATUS: Record<string, { label: string; color: string }> = {
  new:   { label: "Новое",       color: "text-gray-500   bg-gray-50   border-gray-200" },
  cad:   { label: "CAD",         color: "text-blue-600   bg-blue-50   border-blue-200" },
  cae:   { label: "CAE",         color: "text-purple-600 bg-purple-50 border-purple-200" },
  cam:   { label: "CAM",         color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  cnc:   { label: "CNC",         color: "text-orange-600 bg-orange-50 border-orange-200" },
  done:  { label: "Выполнено",   color: "text-green-600  bg-green-50  border-green-200" },
};

const PRIO: Record<string, { label: string; color: string }> = {
  high:   { label: "Высокий",   color: "text-red-600   bg-red-50   border-red-200" },
  normal: { label: "Обычный",   color: "text-gray-500  bg-gray-50  border-gray-200" },
  low:    { label: "Низкий",    color: "text-blue-400  bg-blue-50  border-blue-200" },
};

const CYCLE_STEPS = [
  { key: "cad", label: "CAD", icon: "Box", color: "bg-blue-500" },
  { key: "cae", label: "CAE", icon: "FlaskConical", color: "bg-purple-500" },
  { key: "cam", label: "CAM", icon: "Cpu", color: "bg-indigo-500" },
  { key: "cnc", label: "CNC", icon: "Radio", color: "bg-orange-500" },
  { key: "done", label: "Готово", icon: "CheckCircle", color: "bg-green-500" },
];

const EMPTY_JOB = { product_id: "", part_id: "", machine_id: "", status: "new", priority: "normal", qty: "1", due_date: "", notes: "" };

export default function ModuleAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_JOB);
  const [products, setProducts] = useState<{ id: number; name: string; code: string }[]>([]);
  const [parts, setParts] = useState<{ id: number; name: string; code: string }[]>([]);
  const [machines, setMachines] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [s, j, pr, pa, m, u] = await Promise.all([
        mGet<Stats>("stats"), mGet<Job[]>("jobs"),
        fetch("https://functions.poehali.dev/cefa07dc-7ab3-4dc3-9fc9-31d458b0af27/products").then((r) => r.json()),
        mGet<{ id: number; name: string; code: string }[]>("parts"),
        mGet<{ id: number; name: string }[]>("machines"),
        mGet<{ id: number; name: string }[]>("users"),
      ]);
      setStats(s); setJobs(j); setProducts(pr); setParts(pa); setMachines(m); setUsers(u);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const { mPost } = await import("@/lib/manufacture");
      await mPost("jobs", {
        product_id: form.product_id ? Number(form.product_id) : null,
        part_id: form.part_id ? Number(form.part_id) : null,
        machine_id: form.machine_id ? Number(form.machine_id) : null,
        status: form.status, priority: form.priority,
        qty: Number(form.qty),
        due_date: form.due_date || null,
        notes: form.notes || null,
      });
      setForm(EMPTY_JOB); setShowForm(false); await load();
    } catch { alert("Ошибка при создании задания"); }
    finally { setSaving(false); }
  }

  async function advanceJob(job: Job) {
    const order = ["new", "cad", "cae", "cam", "cnc", "done"];
    const idx = order.indexOf(job.status);
    if (idx < 0 || idx >= order.length - 1) return;
    try {
      const { mPut } = await import("@/lib/manufacture");
      await mPut("jobs", job.id, { status: order[idx + 1] });
      await load();
    } catch { alert("Ошибка обновления"); }
  }

  const f = (k: keyof typeof EMPTY_JOB, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Производственные задания</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Полный цикл: CAD → CAE → CAM → CNC → Готово</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Новое задание
        </button>
      </div>

      {/* Цикл производства */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="text-sm font-semibold text-foreground mb-3">Цикл производства</div>
        <div className="flex items-center gap-1 flex-wrap">
          {CYCLE_STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium ${step.color}`}>
                <Icon name={step.icon as Parameters<typeof Icon>[0]["name"]} size={13} />
                {step.label}
                {stats && (
                  <span className="ml-1 bg-white/20 rounded px-1">
                    {jobs.filter((j) => j.status === step.key).length}
                  </span>
                )}
              </div>
              {i < CYCLE_STEPS.length - 1 && <Icon name="ChevronRight" size={14} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Сводка */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Деталей", value: stats.parts_total, icon: "Box", color: "text-blue-600 bg-blue-50" },
            { label: "Станков", value: stats.machines_total, icon: "Cpu", color: "text-indigo-600 bg-indigo-50" },
            { label: "Заданий активных", value: stats.jobs_active, icon: "Layers", color: "text-orange-600 bg-orange-50" },
            { label: "Заданий выполнено", value: stats.jobs_done, icon: "CheckCircle", color: "text-green-600 bg-green-50" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${k.color}`}>
                <Icon name={k.icon as Parameters<typeof Icon>[0]["name"]} size={16} />
              </div>
              <div className="text-xl font-bold text-foreground">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Новое производственное задание</span>
            <button onClick={() => setShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Изделие</label>
              <select value={form.product_id} onChange={(e) => f("product_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбрано —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Деталь</label>
              <select value={form.part_id} onChange={(e) => f("part_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбрана —</option>
                {parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Станок</label>
              <select value={form.machine_id} onChange={(e) => f("machine_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбран —</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Количество</label>
              <input type="number" min="1" value={form.qty} onChange={(e) => f("qty", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Приоритет</label>
              <select value={form.priority} onChange={(e) => f("priority", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="low">Низкий</option>
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Срок сдачи</label>
              <input type="date" value={form.due_date} onChange={(e) => f("due_date", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Примечания</label>
              <input value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Необязательно"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? "Сохранение…" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold">Задания</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 text-sm">
            <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error}
            <button onClick={load} className="mt-2 block mx-auto text-xs underline">Повторить</button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="ClipboardList" size={36} className="mx-auto mb-2 opacity-20" />Заданий пока нет. Создайте первое.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {jobs.map((j) => {
              const scfg = JOB_STATUS[j.status] ?? JOB_STATUS.new;
              const pcfg = PRIO[j.priority] ?? PRIO.normal;
              const order = ["new", "cad", "cae", "cam", "cnc", "done"];
              const canAdvance = order.indexOf(j.status) < order.length - 1;
              return (
                <div key={j.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="ClipboardList" size={16} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {j.product_name ?? j.part_name ?? `Задание #${j.id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[j.part_name, j.machine_name, j.assignee_name, j.qty > 1 ? `${j.qty} шт.` : null, j.due_date ? `до ${j.due_date.slice(0, 10)}` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${pcfg.color}`}>{pcfg.label}</span>
                  {canAdvance && (
                    <button onClick={() => advanceJob(j)}
                      className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90 flex-shrink-0 flex items-center gap-1">
                      <Icon name="ChevronRight" size={12} />Далее
                    </button>
                  )}
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${scfg.color}`}>{scfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AiAssistant
        title="Помощник по заданиям"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}