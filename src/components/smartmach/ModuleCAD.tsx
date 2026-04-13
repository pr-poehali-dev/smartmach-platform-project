import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Part, User } from "@/lib/manufacture";

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  ok:    { label: "ОК",       color: "text-green-600  bg-green-50  border-green-200",  icon: "CheckCircle" },
  warn:  { label: "Предупр.", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: "AlertTriangle" },
  error: { label: "Ошибка",  color: "text-red-600    bg-red-50    border-red-200",    icon: "XCircle" },
};

const EMPTY = { code: "", name: "", material: "", version: "v1.0", status: "ok", collisions: "0", notes: "", author_id: "" };

export default function ModuleCAD() {
  const [parts, setParts] = useState<Part[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Part | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [p, u] = await Promise.all([mGet<Part[]>("parts"), mGet<User[]>("users")]);
      setParts(p); setUsers(u);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await mPost("parts", {
        code: form.code, name: form.name, version: form.version,
        material: form.material || null, notes: form.notes || null,
        status: form.status, collisions: Number(form.collisions),
        author_id: form.author_id ? Number(form.author_id) : null,
      });
      setForm(EMPTY); setShowForm(false); await load();
    } catch { alert("Ошибка при создании"); }
    finally { setSaving(false); }
  }

  async function handleStatus(part: Part, status: string) {
    try { await mPut("parts", part.id, { status }); await load(); setSelected((p) => p?.id === part.id ? { ...p, status } : p); }
    catch { alert("Ошибка при обновлении"); }
  }

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CAD — 3D-моделирование</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Библиотека деталей и проверка коллизий</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Новая деталь
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-foreground">Новая деталь</span>
            <button onClick={() => setShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([["code","Код *","КРД-001",true],["name","Название *","Корпус редуктора",true],["material","Материал","Сталь 45",false],["version","Версия","v1.0",false]] as const).map(([key,label,ph,req]) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input required={req} value={form[key]} onChange={(e) => f(key, e.target.value)} placeholder={ph}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
              <select value={form.status} onChange={(e) => f("status", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="ok">ОК</option><option value="warn">Предупреждение</option><option value="error">Ошибка</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Коллизии</label>
              <input type="number" min="0" value={form.collisions} onChange={(e) => f("collisions", e.target.value)}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold">Библиотека деталей</span>
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
          ) : parts.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Icon name="Box" size={36} className="mx-auto mb-2 opacity-20" />Деталей пока нет. Добавьте первую.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {parts.map((p) => {
                const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.ok;
                return (
                  <div key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors ${selected?.id === p.id ? "bg-primary/5" : ""}`}>
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon name="Box" size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.code} · {p.version}{p.material ? ` · ${p.material}` : ""}{p.author_name ? ` · ${p.author_name}` : ""}</div>
                    </div>
                    {p.collisions > 0 && (
                      <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex-shrink-0">{p.collisions} колл.</span>
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

        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold">Детали</span>
          </div>
          {selected ? (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-base font-bold">{selected.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{selected.code}</div>
              </div>
              <div className="space-y-2 text-sm">
                {[["Версия", selected.version], selected.material && ["Материал", selected.material], ["Коллизии", selected.collisions > 0 ? `${selected.collisions} обнаружено` : "Нет"], selected.author_name && ["Автор", selected.author_name]].filter(Boolean).map((r) => (
                  <div key={(r as string[])[0]} className="flex justify-between">
                    <span className="text-muted-foreground">{(r as string[])[0]}</span>
                    <span className="font-medium">{(r as string[])[1]}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Сменить статус</div>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                    <button key={key} onClick={() => handleStatus(selected, key)} disabled={selected.status === key}
                      className={`text-xs border px-2 py-1 rounded-full transition-opacity ${cfg.color} ${selected.status === key ? "font-semibold" : "opacity-50 hover:opacity-80"}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              {selected.notes && <p className="text-xs text-muted-foreground border-t border-border pt-3">{selected.notes}</p>}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="MousePointerClick" size={32} className="mx-auto mb-2 opacity-30" />Выберите деталь
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
