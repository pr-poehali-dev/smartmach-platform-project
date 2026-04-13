import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Simulation, Part, User } from "@/lib/manufacture";

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  queue:   { label: "Ожидает",  color: "text-gray-500   bg-gray-50   border-gray-200",  icon: "Clock" },
  running: { label: "Расчёт…",  color: "text-blue-600   bg-blue-50   border-blue-200",  icon: "Loader" },
  done:    { label: "Готово",   color: "text-green-600  bg-green-50  border-green-200", icon: "CheckCircle" },
  error:   { label: "Проблема", color: "text-red-600    bg-red-50    border-red-200",   icon: "AlertTriangle" },
};

const SIM_TYPES = ["МКЭ", "Тепловой", "Динамика", "Усталость", "Вибрация"];
const NEXT: Record<string, string> = { queue: "running", running: "done" };
const NEXT_LABEL: Record<string, string> = { queue: "Запустить", running: "Завершить" };

const EMPTY = { name: "", sim_type: "МКЭ", status: "queue", result: "", stress_pct: "", part_id: "", author_id: "" };

export default function ModuleCAE() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [s, p, u] = await Promise.all([mGet<Simulation[]>("simulations"), mGet<Part[]>("parts"), mGet<User[]>("users")]);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CAE — Инженерный анализ</h1>
          <p className="text-muted-foreground text-sm mt-0.5">МКЭ, тепловые и динамические симуляции</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Новый расчёт
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Новый расчёт</span>
            <button onClick={() => setShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input required value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Нагрузка корпуса редуктора"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип расчёта</label>
              <select value={form.sim_type} onChange={(e) => f("sim_type", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {SIM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Деталь</label>
              <select value={form.part_id} onChange={(e) => f("part_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбрана —</option>
                {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Результат</label>
              <input value={form.result} onChange={(e) => f("result", e.target.value)} placeholder="Запас 2.4x"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Уровень стресса (%)</label>
              <input type="number" min="0" max="100" value={form.stress_pct} onChange={(e) => f("stress_pct", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Автор</label>
              <select value={form.author_id} onChange={(e) => f("author_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбран —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
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
          <span className="text-sm font-semibold">Симуляции</span>
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
        ) : sims.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="FlaskConical" size={36} className="mx-auto mb-2 opacity-20" />Расчётов пока нет. Добавьте первый.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sims.map((s) => {
              const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.queue;
              const nextAction = NEXT_LABEL[s.status];
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="FlaskConical" size={16} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.sim_type}{s.part_name ? ` · ${s.part_name}` : ""}{s.result ? ` · ${s.result}` : ""}</div>
                  </div>
                  {s.stress_pct != null && s.stress_pct > 0 && (
                    <div className="w-20 hidden sm:block flex-shrink-0">
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.stress_pct > 80 ? "bg-red-400" : "bg-green-400"}`}
                          style={{ width: `${s.stress_pct}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 text-right">{s.stress_pct}%</div>
                    </div>
                  )}
                  {nextAction && (
                    <button onClick={() => advance(s)}
                      className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90 flex-shrink-0">
                      {nextAction}
                    </button>
                  )}
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${cfg.color}`}>
                    <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={11} />{cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
