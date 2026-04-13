import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import AiAssistant from "@/components/smartmach/AiAssistant";

const API = "https://functions.poehali.dev/cefa07dc-7ab3-4dc3-9fc9-31d458b0af27";

const AI_SYSTEM = `Ты — менеджер по управлению жизненным циклом изделий в системе СмартМаш. 
Помогаешь с процессами согласования конструкторской документации, управлением версиями изделий, 
переходами между стадиями (черновик → разработка → согласование → производство), 
управлением изменениями и извещениями об изменениях. Отвечай чётко, с указанием ответственных ролей.`;

const AI_SUGGESTIONS = [
  "Каковы критерии перевода изделия в стадию «Согласование»?",
  "Как правильно оформить извещение об изменении?",
  "Что входит в состав конструкторской документации?",
  "Как управлять версиями сборочного чертежа?",
  "В чём разница между системой управления жизненным циклом и системой планирования ресурсов?",
];

const STAGES = [
  { value: "draft",       label: "Черновик",      color: "text-gray-500   bg-gray-50   border-gray-200" },
  { value: "development", label: "Разработка",     color: "text-blue-600   bg-blue-50   border-blue-200" },
  { value: "review",      label: "Согласование",   color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "approved",    label: "Утверждено",     color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { value: "production",  label: "Производство",   color: "text-green-600  bg-green-50  border-green-200" },
  { value: "archive",     label: "Архив",          color: "text-gray-400   bg-gray-50   border-gray-200" },
];

function stageColor(stage: string) {
  return STAGES.find((s) => s.value === stage)?.color ?? "text-gray-500 bg-gray-50 border-gray-200";
}
function stageLabel(stage: string) {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

interface Product {
  id: number;
  code: string;
  name: string;
  description: string | null;
  stage: string;
  stage_label: string;
  owner_name: string | null;
  latest_revision: string | null;
  updated_at: string;
}

interface User {
  id: number;
  name: string;
  role: string;
}

export default function ModulePLM() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", stage: "draft", owner_id: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(`${API}?resource=products`),
        fetch(`${API}?resource=users`),
      ]);
      const pData = await pRes.json();
      const uData = await uRes.json();
      setProducts(pData);
      setUsers(uData);
    } catch {
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}?resource=products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description || null,
          stage: form.stage,
          owner_id: form.owner_id ? Number(form.owner_id) : null,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ code: "", name: "", description: "", stage: "draft", owner_id: "" });
      setShowForm(false);
      await load();
    } catch {
      alert("Ошибка при создании изделия");
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(productId: number, newStage: string) {
    try {
      await fetch(`${API}?resource=products&id=${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      await load();
      setSelected((prev) => prev ? { ...prev, stage: newStage, stage_label: stageLabel(newStage) } : null);
    } catch {
      alert("Ошибка при смене стадии");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Жизненный цикл изделий</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Управление версиями, согласование, архив</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Icon name="Plus" size={16} />
          Новое изделие
        </button>
      </div>

      {/* Форма добавления */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-foreground">Новое изделие</span>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Код *</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="РЦ-001"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Редуктор цилиндрический"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Необязательно"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Стадия</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ответственный</label>
              <select
                value={form.owner_id}
                onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— не выбран —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">
                Отмена
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? "Сохранение…" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Список изделий */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold text-foreground">Изделия</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />
              Загрузка…
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">
              <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />
              {error}
              <button onClick={load} className="mt-3 block mx-auto text-xs underline text-muted-foreground">Повторить</button>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="PackageOpen" size={32} className="mx-auto mb-2 opacity-30" />
              Изделий пока нет. Добавьте первое.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors ${selected?.id === p.id ? "bg-primary/5" : ""}`}
                >
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Layers" size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.code}{p.latest_revision ? ` · ${p.latest_revision}` : ""}{p.owner_name ? ` · ${p.owner_name}` : ""}
                    </div>
                  </div>
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${stageColor(p.stage)}`}>
                    {stageLabel(p.stage)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Панель деталей */}
        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold text-foreground">Детали</span>
          </div>
          {selected ? (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-base font-bold text-foreground">{selected.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{selected.code}</div>
              </div>
              {selected.description && (
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              )}
              <div className="space-y-2 text-sm">
                {selected.owner_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ответственный</span>
                    <span className="font-medium text-foreground">{selected.owner_name}</span>
                  </div>
                )}
                {selected.latest_revision && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Последняя ревизия</span>
                    <span className="font-medium text-foreground">{selected.latest_revision}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Обновлено</span>
                  <span className="font-medium text-foreground">
                    {new Date(selected.updated_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Сменить стадию</div>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleStageChange(selected.id, s.value)}
                      disabled={selected.stage === s.value}
                      className={`text-xs border px-2 py-1 rounded-full transition-opacity ${s.color} ${selected.stage === s.value ? "opacity-100 font-semibold" : "opacity-50 hover:opacity-80"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="MousePointerClick" size={32} className="mx-auto mb-2 opacity-30" />
              Выберите изделие
            </div>
          )}
        </div>
      </div>

      <AiAssistant
        title="Помощник по документации"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}