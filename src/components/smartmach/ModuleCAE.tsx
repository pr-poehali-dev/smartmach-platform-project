import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Simulation, Part, User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";

const AI_SYSTEM = `Ты — инженер-расчётчик (МКЭ) в системе СмартМаш. 
Помогаешь с интерпретацией результатов прочностных, тепловых и динамических расчётов, 
выбором граничных условий, анализом запасов прочности, усталостным анализом. 
Отвечай с конкретными формулами, коэффициентами запаса и рекомендациями по улучшению конструкции.`;

const AI_SUGGESTIONS = [
  "Как трактовать карту напряжений по Мизесу?",
  "Какой коэффициент запаса прочности считается нормой?",
  "Как выбрать граничные условия для расчёта вала?",
  "Что такое усталостное разрушение и как его предотвратить?",
  "Как интерпретировать тепловой расчёт подшипника?",
  "Как задать нагрузки при модальном анализе?",
  "Какая плотность сетки нужна для точного МКЭ-расчёта?",
];

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  queue:   { label: "Ожидает",    color: "text-gray-500   bg-gray-50   border-gray-200",  icon: "Clock" },
  running: { label: "Расчёт…",   color: "text-blue-600   bg-blue-50   border-blue-200",  icon: "Loader" },
  done:    { label: "Готово",     color: "text-green-600  bg-green-50  border-green-200", icon: "CheckCircle" },
  review:  { label: "На проверке",color: "text-purple-600 bg-purple-50 border-purple-200",icon: "Eye" },
  error:   { label: "Проблема",   color: "text-red-600    bg-red-50    border-red-200",   icon: "AlertTriangle" },
};

// Типы анализа — взято из ANSYS, ЛОГОС, APM FEM, midas NFX
const SIM_TYPES = [
  "Статический (линейный)",
  "Статический (нелинейный)",
  "Прочностной МКЭ",
  "Модальный (собственные частоты)",
  "Динамический переходный",
  "Частотный отклик",
  "Спектральный анализ",
  "Тепловой (стационарный)",
  "Тепловой (нестационарный)",
  "Термоупругость",
  "Усталостный анализ",
  "Анализ устойчивости (потеря)",
  "Топологическая оптимизация",
  "Контактный анализ",
];

// Материалы из БД машиностроения
const MATERIALS = [
  "Сталь 45",
  "Сталь 40Х",
  "Сталь 12Х18Н10Т",
  "Сталь 20",
  "Алюминий АМГ6",
  "Алюминий Д16Т",
  "Титан ВТ6",
  "Чугун СЧ20",
  "Бронза БрАЖ9-4",
];

// Граничные условия — ключевые для МКЭ (из ANSYS / APM FEM)
const BC_TYPES = [
  "Жёсткая заделка",
  "Шарнирное закрепление",
  "Симметрия",
  "Скользящая опора",
  "Свободный торец",
  "Периодическое условие",
];

// Типы нагрузок
const LOAD_TYPES = [
  "Сосредоточенная сила",
  "Распределённое давление",
  "Момент",
  "Температура",
  "Ускорение (инерция)",
  "Центробежная нагрузка",
  "Вибрационная нагрузка",
];

const NEXT: Record<string, string> = { queue: "running", running: "review", review: "done" };
const NEXT_LABEL: Record<string, string> = { queue: "Запустить", running: "На проверку", review: "Принять" };

const EMPTY = {
  name: "", sim_type: "Статический (линейный)", status: "queue",
  result: "", stress_pct: "",
  part_id: "", author_id: "",
  material: "", load_type: "", load_value: "", load_unit: "Н",
  bc_type: "", mesh_size: "", safety_factor: "", notes: "",
};

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
  const [selected, setSelected] = useState<Simulation | null>(null);

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

  // Группировка по типу анализа
  const simTypeGroups = [...new Set(sims.map((s) => s.sim_type))];

  const filtered = sims.filter((s) => {
    const matchType = filterType === "all" || s.sim_type === filterType;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchType && matchStatus;
  });

  // Метрики
  const done = sims.filter((s) => s.status === "done").length;
  const running = sims.filter((s) => s.status === "running").length;
  const problems = sims.filter((s) => s.status === "error").length;
  const avgStress = sims.filter((s) => s.stress_pct != null).length > 0
    ? Math.round(sims.filter((s) => s.stress_pct != null).reduce((a, s) => a + (s.stress_pct ?? 0), 0) / sims.filter((s) => s.stress_pct != null).length)
    : null;

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

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Всего расчётов", value: sims.length, icon: "FlaskConical", color: "text-purple-600 bg-purple-50" },
          { label: "В работе",       value: running,     icon: "Loader",       color: "text-blue-600 bg-blue-50" },
          { label: "Завершено",      value: done,        icon: "CheckCircle",  color: "text-green-600 bg-green-50" },
          { label: "Проблемы",       value: problems,    icon: "AlertTriangle",color: "text-red-600 bg-red-50" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
              <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Avg stress indicator */}
      {avgStress != null && (
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">Средний уровень нагрузки по расчётам</p>
            <p className="text-2xl font-bold mt-0.5">{avgStress}%</p>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${avgStress > 80 ? "bg-red-400" : avgStress > 60 ? "bg-yellow-400" : "bg-green-400"}`}
                style={{ width: `${avgStress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>0% — норма</span>
              <span>60% — внимание</span>
              <span>80% — критично</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {(["all", "queue", "running", "review", "done", "error"] as const).map((s) => {
            const cfg = s === "all" ? { label: "Все", color: "" } : STATUS_CFG[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterStatus === s ? (s === "all" ? "bg-primary text-white border-primary" : `${cfg.color} border-current`) : "border-border text-muted-foreground hover:border-primary/40"
                }`}>
                {cfg.label}
              </button>
            );
          })}
        </div>
        {simTypeGroups.length > 1 && (
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">Все типы анализа</option>
            {simTypeGroups.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Новый расчёт</span>
            <button onClick={() => setShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Basic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
                <input required value={form.name} onChange={(e) => f("name", e.target.value)}
                  placeholder="Прочностной расчёт корпуса редуктора"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Тип анализа</label>
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
                <label className="text-xs text-muted-foreground mb-1 block">Материал</label>
                <select value={form.material} onChange={(e) => f("material", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">— выберите —</option>
                  {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Автор</label>
                <select value={form.author_id} onChange={(e) => f("author_id", e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">— не выбран —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            {/* Boundary conditions & loads */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border pt-3 mb-2">
                Граничные условия и нагрузки
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Граничное условие</label>
                  <select value={form.bc_type} onChange={(e) => f("bc_type", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">— выберите —</option>
                    {BC_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Тип нагрузки</label>
                  <select value={form.load_type} onChange={(e) => f("load_type", e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">— выберите —</option>
                    {LOAD_TYPES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Значение нагрузки</label>
                  <div className="flex gap-2">
                    <input type="number" value={form.load_value} onChange={(e) => f("load_value", e.target.value)}
                      placeholder="5000"
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <select value={form.load_unit} onChange={(e) => f("load_unit", e.target.value)}
                      className="w-16 border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option>Н</option>
                      <option>кН</option>
                      <option>МПа</option>
                      <option>°C</option>
                      <option>Нм</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Mesh & results */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border pt-3 mb-2">
                Сетка и результаты
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Размер элемента сетки, мм</label>
                  <input type="number" value={form.mesh_size} onChange={(e) => f("mesh_size", e.target.value)}
                    placeholder="2.5"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Уровень нагрузки, %</label>
                  <input type="number" min="0" max="100" value={form.stress_pct} onChange={(e) => f("stress_pct", e.target.value)}
                    placeholder="65"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Коэффициент запаса прочности</label>
                  <input type="number" step="0.1" value={form.safety_factor} onChange={(e) => f("safety_factor", e.target.value)}
                    placeholder="2.4"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Заключение по результату</label>
                  <input value={form.result} onChange={(e) => f("result", e.target.value)}
                    placeholder="Конструкция выдерживает нагрузку. Максимальные напряжения по Мизесу — 180 МПа."
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Примечания</label>
                  <input value={form.notes} onChange={(e) => f("notes", e.target.value)}
                    placeholder="Учесть усталость при циклической нагрузке"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? "Сохранение…" : "Создать расчёт"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Simulations list */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40 flex justify-between items-center">
          <span className="text-sm font-semibold">Расчёты</span>
          <span className="text-xs text-muted-foreground">{filtered.length} из {sims.length}</span>
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
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="FlaskConical" size={36} className="mx-auto mb-2 opacity-20" />
            {sims.length === 0 ? "Расчётов пока нет. Добавьте первый." : "Нет расчётов по выбранным фильтрам."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((s) => {
              const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.queue;
              const nextAction = NEXT_LABEL[s.status];
              const stressColor = (s.stress_pct ?? 0) > 80 ? "bg-red-400" : (s.stress_pct ?? 0) > 60 ? "bg-yellow-400" : "bg-green-400";
              return (
                <div key={s.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(s)}>
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                    <Icon name="FlaskConical" size={16} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Icon name="Layers" size={10} />{s.sim_type}</span>
                      {s.part_name && <span className="flex items-center gap-1"><Icon name="Box" size={10} />{s.part_name}</span>}
                      {s.result && <span className="truncate max-w-[180px]">{s.result}</span>}
                    </div>
                  </div>
                  {s.stress_pct != null && s.stress_pct > 0 && (
                    <div className="w-24 hidden sm:block shrink-0">
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stressColor}`} style={{ width: `${s.stress_pct}%` }} />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 text-right">{s.stress_pct}%</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {nextAction && (
                      <button onClick={(e) => { e.stopPropagation(); advance(s); }}
                        className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90">
                        {nextAction}
                      </button>
                    )}
                    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                      <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={11} />{cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{selected.sim_type}{selected.part_name ? ` · ${selected.part_name}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium border px-2.5 py-1 rounded-full flex items-center gap-1 ${STATUS_CFG[selected.status]?.color ?? ""}`}>
                  <Icon name={STATUS_CFG[selected.status]?.icon as Parameters<typeof Icon>[0]["name"]} size={11} />
                  {STATUS_CFG[selected.status]?.label}
                </span>
                <button onClick={() => setSelected(null)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Stress gauge */}
              {selected.stress_pct != null && selected.stress_pct > 0 && (
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Уровень нагрузки</span>
                    <span className={`text-lg font-bold ${selected.stress_pct > 80 ? "text-red-500" : selected.stress_pct > 60 ? "text-yellow-500" : "text-green-600"}`}>
                      {selected.stress_pct}%
                    </span>
                  </div>
                  <div className="h-3 bg-white rounded-full overflow-hidden border border-border">
                    <div
                      className={`h-full rounded-full transition-all ${selected.stress_pct > 80 ? "bg-red-400" : selected.stress_pct > 60 ? "bg-yellow-400" : "bg-green-400"}`}
                      style={{ width: `${selected.stress_pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                    <span>Безопасно</span>
                    <span>Внимание (&gt;60%)</span>
                    <span>Критично (&gt;80%)</span>
                  </div>
                </div>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Автор", value: selected.author_name },
                  { label: "Деталь", value: selected.part_name },
                  { label: "Создан", value: selected.created_at ? new Date(selected.created_at).toLocaleDateString("ru") : null },
                  { label: "Обновлён", value: selected.updated_at ? new Date(selected.updated_at).toLocaleDateString("ru") : null },
                ].filter((r) => r.value).map((r) => (
                  <div key={r.label} className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{r.label}</p>
                    <p className="text-sm font-medium">{r.value}</p>
                  </div>
                ))}
              </div>

              {/* Result conclusion */}
              {selected.result && (
                <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Заключение</p>
                  <p className="text-sm text-green-900">{selected.result}</p>
                </div>
              )}

              {/* Advance button */}
              {NEXT_LABEL[selected.status] && (
                <div className="flex justify-end">
                  <button onClick={() => { advance(selected); setSelected(null); }}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                    <Icon name="ArrowRight" size={15} />
                    {NEXT_LABEL[selected.status]}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AiAssistant
        title="Помощник расчётчика"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}
