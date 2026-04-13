import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Machine, User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";

const AI_SYSTEM = `Ты — специалист по ЧПУ-оборудованию и его обслуживанию в системе SmartMach. 
Помогаешь с диагностикой аварий и ошибок станков, настройкой параметров, плановым обслуживанием, 
интерпретацией кодов ошибок (Fanuc, Siemens, Heidenhain), оптимизацией загрузки оборудования.
Отвечай конкретно, с кодами ошибок и шагами диагностики.`;

const AI_SUGGESTIONS = [
  "Что означает alarm 300 на стойке Fanuc?",
  "Как настроить нулевую точку детали на станке?",
  "Почему станок уходит в E-stop — основные причины?",
  "Как проверить люфт ШВП на токарном станке?",
  "Какое плановое обслуживание нужно раз в месяц?",
];

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  running: { label: "Работает", color: "text-green-600 bg-green-50 border-green-200", dot: "bg-green-500" },
  idle:    { label: "Простой",  color: "text-gray-500  bg-gray-50  border-gray-200",  dot: "bg-gray-400" },
  alarm:   { label: "Авария",   color: "text-red-600   bg-red-50   border-red-200",   dot: "bg-red-500" },
};

const MACHINE_TYPES = ["Токарный", "Фрезерный", "Токарно-фрезерный", "Сверлильный", "Шлифовальный"];
const EMPTY = { name: "", type: "Токарный", status: "idle", load_pct: "0", program: "", operator_id: "", notes: "" };

export default function ModuleCNC() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Machine | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [m, u] = await Promise.all([mGet<Machine[]>("machines"), mGet<User[]>("users")]);
      setMachines(m); setUsers(u);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await mPost("machines", {
        name: form.name, type: form.type, status: form.status,
        load_pct: Number(form.load_pct),
        program: form.program || null, notes: form.notes || null,
        operator_id: form.operator_id ? Number(form.operator_id) : null,
      });
      setForm(EMPTY); setShowForm(false); await load();
    } catch { alert("Ошибка при создании"); }
    finally { setSaving(false); }
  }

  async function setStatus(machine: Machine, status: string) {
    try {
      await mPut("machines", machine.id, { status, load_pct: status === "idle" || status === "alarm" ? 0 : machine.load_pct });
      await load();
      setSelected((p) => p?.id === machine.id ? { ...p, status } : p);
    } catch { alert("Ошибка обновления"); }
  }

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CNC — Мониторинг станков</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Состояние и управление оборудованием</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Добавить станок
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Новый станок</span>
            <button onClick={() => setShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input required value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="DMG Mori NLX 2500"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <select value={form.type} onChange={(e) => f("type", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {MACHINE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
              <select value={form.status} onChange={(e) => f("status", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="idle">Простой</option>
                <option value="running">Работает</option>
                <option value="alarm">Авария</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Загрузка (%)</label>
              <input type="number" min="0" max="100" value={form.load_pct} onChange={(e) => f("load_pct", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Программа</label>
              <input value={form.program} onChange={(e) => f("program", e.target.value)} placeholder="shaft_v3.nc"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Оператор</label>
              <select value={form.operator_id} onChange={(e) => f("operator_id", e.target.value)}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold">Оборудование</span>
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
          ) : machines.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Icon name="Radio" size={36} className="mx-auto mb-2 opacity-20" />Станков пока нет. Добавьте первый.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {machines.map((m) => {
                const cfg = STATUS_CFG[m.status] ?? STATUS_CFG.idle;
                return (
                  <div key={m.id} onClick={() => setSelected(selected?.id === m.id ? null : m)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors ${selected?.id === m.id ? "bg-primary/5" : ""}`}>
                    <div className="relative w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="Cpu" size={16} className="text-blue-600" />
                      <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${cfg.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.type}{m.program ? ` · ${m.program}` : ""}{m.operator_name ? ` · ${m.operator_name}` : ""}</div>
                    </div>
                    {m.load_pct > 0 && (
                      <div className="w-16 hidden sm:block flex-shrink-0">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.load_pct}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 text-right">{m.load_pct}%</div>
                      </div>
                    )}
                    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold">Детали</span>
          </div>
          {selected ? (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-base font-bold">{selected.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{selected.type}</div>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["Статус", STATUS_CFG[selected.status]?.label ?? selected.status],
                  selected.program && ["Программа", selected.program],
                  selected.load_pct > 0 && ["Загрузка", `${selected.load_pct}%`],
                  selected.operator_name && ["Оператор", selected.operator_name],
                ].filter(Boolean).map((r) => (
                  <div key={(r as string[])[0]} className="flex justify-between">
                    <span className="text-muted-foreground">{(r as string[])[0]}</span>
                    <span className="font-medium">{(r as string[])[1]}</span>
                  </div>
                ))}
              </div>
              {selected.status === "alarm" && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
                  <Icon name="AlertTriangle" size={13} />Требуется вмешательство оператора
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Сменить статус</div>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setStatus(selected, key)} disabled={selected.status === key}
                      className={`text-xs border px-2 py-1 rounded-full transition-opacity ${cfg.color} ${selected.status === key ? "font-semibold" : "opacity-50 hover:opacity-80"}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="MousePointerClick" size={32} className="mx-auto mb-2 opacity-30" />Выберите станок
            </div>
          )}
        </div>
      </div>

      <AiAssistant
        title="CNC-помощник"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}