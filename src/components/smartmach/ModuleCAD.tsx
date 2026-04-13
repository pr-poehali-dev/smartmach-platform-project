import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Part, User } from "@/lib/manufacture";

/* ─── конфиги ────────────────────────────────────────────────────── */

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  ok:    { label: "ОК",         color: "text-green-600  bg-green-50  border-green-200",  icon: "CheckCircle" },
  warn:  { label: "Предупр.",   color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: "AlertTriangle" },
  error: { label: "Ошибка",     color: "text-red-600    bg-red-50    border-red-200",    icon: "XCircle" },
};

const CAT_ICONS: Record<string, string> = {
  "Валы и оси":           "Minus",
  "Зубчатые колёса":      "Settings",
  "Корпуса":              "Package",
  "Крепёж":               "Link",
  "Подшипниковые узлы":   "CircleDot",
  "Уплотнения":           "Disc",
  "Фланцы":               "Circle",
  "Пружины":              "Codesandbox",
  "Прочее":               "Box",
};

const CAT_COLORS: Record<string, string> = {
  "Валы и оси":           "bg-blue-50   text-blue-600",
  "Зубчатые колёса":      "bg-purple-50 text-purple-600",
  "Корпуса":              "bg-orange-50 text-orange-600",
  "Крепёж":               "bg-gray-50   text-gray-600",
  "Подшипниковые узлы":   "bg-indigo-50 text-indigo-600",
  "Уплотнения":           "bg-green-50  text-green-600",
  "Фланцы":               "bg-cyan-50   text-cyan-600",
  "Пружины":              "bg-pink-50   text-pink-600",
  "Прочее":               "bg-gray-50   text-gray-500",
};

const CATEGORIES = Object.keys(CAT_ICONS);
const EMPTY = { code: "", name: "", category: "Прочее", material: "", version: "v1.0",
                dimensions: "", weight_kg: "", standard: "", notes: "", author_id: "" };

type Tab = "templates" | "mine";

/* ─── вспомогалки ────────────────────────────────────────────────── */

function catIcon(cat: string) { return (CAT_ICONS[cat] ?? "Box") as Parameters<typeof Icon>[0]["name"]; }
function catColor(cat: string) { return CAT_COLORS[cat] ?? "bg-gray-50 text-gray-500"; }

/* ─── компонент карточки детали ─────────────────────────────────── */

function PartCard({
  part, active, onClick,
}: { part: Part; active: boolean; onClick: () => void }) {
  const cfg = STATUS_CFG[part.status] ?? STATUS_CFG.ok;
  return (
    <div onClick={onClick}
      className={`group flex gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm
        ${active ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border bg-white hover:border-primary/30"}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${catColor(part.category)}`}>
        <Icon name={catIcon(part.category)} size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground leading-tight truncate">{part.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">
          {part.code}{part.material ? ` · ${part.material}` : ""}{part.dimensions ? ` · ${part.dimensions}` : ""}
        </div>
        {part.standard && (
          <div className="text-xs text-muted-foreground/70 mt-0.5">{part.standard}</div>
        )}
      </div>
      {part.collisions > 0 && (
        <span className="self-start mt-0.5 text-xs text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
          {part.collisions}к
        </span>
      )}
      <span className={`self-start mt-0.5 text-xs font-medium border px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0 ${cfg.color}`}>
        <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={10} />
      </span>
    </div>
  );
}

/* ─── панель деталей ─────────────────────────────────────────────── */

function DetailPanel({
  part, onUseAsBase, onStatusChange,
}: { part: Part; onUseAsBase: (p: Part) => void; onStatusChange: (p: Part, s: string) => void }) {
  const cfg = STATUS_CFG[part.status] ?? STATUS_CFG.ok;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catColor(part.category)}`}>
          <Icon name={catIcon(part.category)} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground leading-tight">{part.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{part.code} · {part.version}</div>
        </div>
        <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${cfg.color}`}>
          <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={11} />{cfg.label}
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        {[
          ["Категория",   part.category],
          part.material   && ["Материал",   part.material],
          part.dimensions && ["Габариты",   part.dimensions],
          part.weight_kg  && ["Масса",      `${part.weight_kg} кг`],
          part.standard   && ["Стандарт",   part.standard],
          part.author_name&& ["Автор",      part.author_name],
        ].filter(Boolean).map((r) => {
          const [k, v] = r as [string, string];
          return (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-muted-foreground whitespace-nowrap">{k}</span>
              <span className="font-medium text-foreground text-right">{v}</span>
            </div>
          );
        })}
      </div>

      {part.notes && (
        <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2.5 leading-relaxed">{part.notes}</p>
      )}

      {part.is_template && (
        <button onClick={() => onUseAsBase(part)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Copy" size={15} />Взять за основу
        </button>
      )}

      {!part.is_template && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Сменить статус</div>
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(STATUS_CFG).map(([key, c]) => (
              <button key={key} onClick={() => onStatusChange(part, key)} disabled={part.status === key}
                className={`text-xs border px-2 py-0.5 rounded-full ${c.color} ${part.status === key ? "font-semibold" : "opacity-50 hover:opacity-80"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── главный компонент ─────────────────────────────────────────── */

export default function ModuleCAD() {
  const [templates, setTemplates] = useState<Part[]>([]);
  const [mine, setMine] = useState<Part[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("templates");
  const [catFilter, setCatFilter] = useState<string>("Все");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Part | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  /* загрузка */
  async function load() {
    setLoading(true); setError(null);
    try {
      const [t, m, u] = await Promise.all([
        mGet<Part[]>("parts", "templates=1"),
        mGet<Part[]>("parts", "templates=0"),
        mGet<User[]>("users"),
      ]);
      setTemplates(t); setMine(m); setUsers(u);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  /* фильтрация */
  const list = tab === "templates" ? templates : mine;
  const filtered = useMemo(() => {
    let res = list;
    if (catFilter !== "Все") res = res.filter((p) => p.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((p) =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q)
      );
    }
    return res;
  }, [list, catFilter, search]);

  /* группировка по категории */
  const grouped = useMemo(() => {
    const map: Record<string, Part[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [filtered]);

  /* взять за основу */
  async function handleUseAsBase(tmpl: Part) {
    setSaving(true);
    try {
      const code = `${tmpl.code}-КОПИЯ`;
      await mPost("parts", {
        code, name: tmpl.name, category: tmpl.category,
        material: tmpl.material, version: "v1.0", status: "ok",
        dimensions: tmpl.dimensions, weight_kg: tmpl.weight_kg,
        standard: tmpl.standard,
        notes: `На основе шаблона: ${tmpl.name} (${tmpl.code})`,
        collisions: 0, is_template: false,
      });
      await load();
      setTab("mine");
      setSelected(null);
    } catch { alert("Ошибка при создании копии"); }
    finally { setSaving(false); }
  }

  /* статус */
  async function handleStatus(part: Part, status: string) {
    try {
      await mPut("parts", part.id, { status });
      await load();
      setSelected((p) => p?.id === part.id ? { ...p, status } : p);
    } catch { alert("Ошибка при обновлении статуса"); }
  }

  /* форма создания */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await mPost("parts", {
        code: form.code, name: form.name, category: form.category,
        material: form.material || null, version: form.version,
        dimensions: form.dimensions || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        standard: form.standard || null,
        notes: form.notes || null,
        author_id: form.author_id ? Number(form.author_id) : null,
        status: "ok", collisions: 0, is_template: false,
      });
      setForm(EMPTY); setShowForm(false); setTab("mine"); await load();
    } catch { alert("Ошибка при создании"); }
    finally { setSaving(false); }
  }

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  /* уникальные категории для фильтра */
  const availableCats = useMemo(() => {
    const cats = new Set(list.map((p) => p.category));
    return ["Все", ...CATEGORIES.filter((c) => cats.has(c))];
  }, [list]);

  return (
    <div className="p-6 space-y-5">

      {/* шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CAD — Библиотека деталей</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Типовые детали и рабочие проекты</p>
        </div>
        <button onClick={() => { setShowForm(true); setTab("mine"); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Новая деталь
        </button>
      </div>

      {/* вкладки */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
        {([["templates", "Библиотека шаблонов", "Library"], ["mine", "Мои детали", "FolderOpen"]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => { setTab(id); setSelected(null); setCatFilter("Все"); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon name={icon} size={15} />{label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
              {id === "templates" ? templates.length : mine.length}
            </span>
          </button>
        ))}
      </div>

      {/* форма */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-foreground">Новая деталь</span>
            <button onClick={() => setShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Код *</label>
              <input required value={form.code} onChange={(e) => f("code", e.target.value)} placeholder="КРД-001"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input required value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Корпус редуктора"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
              <select value={form.category} onChange={(e) => f("category", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Материал</label>
              <input value={form.material} onChange={(e) => f("material", e.target.value)} placeholder="Сталь 45"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Версия</label>
              <input value={form.version} onChange={(e) => f("version", e.target.value)} placeholder="v1.0"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Габариты</label>
              <input value={form.dimensions} onChange={(e) => f("dimensions", e.target.value)} placeholder="Ø40×200 мм"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Масса (кг)</label>
              <input type="number" step="0.001" value={form.weight_kg} onChange={(e) => f("weight_kg", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Стандарт</label>
              <input value={form.standard} onChange={(e) => f("standard", e.target.value)} placeholder="ГОСТ 2590-2006"
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
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Примечания</label>
              <input value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Необязательно"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-1">
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

      {/* поиск + фильтр по категории */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, коду, материалу…"
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {availableCats.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${catFilter === c ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground hover:border-primary/50"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* основной контент */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Icon name="Loader" size={32} className="mx-auto mb-3 opacity-30 animate-spin" />Загрузка…
        </div>
      ) : error ? (
        <div className="py-16 text-center text-red-500 text-sm">
          <Icon name="AlertTriangle" size={32} className="mx-auto mb-3" />{error}
          <button onClick={load} className="mt-2 block mx-auto text-xs underline text-muted-foreground">Повторить</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* список деталей */}
          <div className="xl:col-span-2 space-y-5">
            {Object.keys(grouped).length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm bg-white rounded-xl border border-border">
                <Icon name="PackageOpen" size={36} className="mx-auto mb-2 opacity-20" />
                {tab === "mine" ? "Деталей пока нет. Добавьте свою или возьмите за основу из шаблонов." : "Нет деталей по выбранным фильтрам."}
              </div>
            ) : Object.entries(grouped).map(([cat, catParts]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${catColor(cat)}`}>
                    <Icon name={catIcon(cat)} size={13} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{cat}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{catParts.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catParts.map((p) => (
                    <PartCard key={p.id} part={p} active={selected?.id === p.id}
                      onClick={() => setSelected(selected?.id === p.id ? null : p)} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* панель деталей */}
          <div className="xl:col-span-1">
            <div className="sticky top-4 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/40">
                <span className="text-sm font-semibold text-foreground">
                  {selected ? selected.name : "Карточка детали"}
                </span>
              </div>
              <div className="p-4">
                {selected ? (
                  <DetailPanel part={selected} onUseAsBase={handleUseAsBase} onStatusChange={handleStatus} />
                ) : (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    <Icon name="MousePointerClick" size={32} className="mx-auto mb-2 opacity-25" />
                    Выберите деталь, чтобы увидеть характеристики
                    {tab === "templates" && (
                      <p className="mt-2 text-xs">Нажмите «Взять за основу» чтобы создать копию для работы</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
