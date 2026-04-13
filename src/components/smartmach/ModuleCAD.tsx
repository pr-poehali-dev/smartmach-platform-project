import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mPost, mPut, Part, User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";
import { PartCard, DetailPanel } from "@/components/smartmach/CadPartCard";
import CadForm from "@/components/smartmach/CadForm";
import {
  CATEGORIES, EMPTY, catIcon, catColor,
  AI_SYSTEM, AI_SUGGESTIONS,
} from "@/components/smartmach/cad.data";

type Tab = "templates" | "mine";

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

  const grouped = useMemo(() => {
    const map: Record<string, Part[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [filtered]);

  async function handleUseAsBase(tmpl: Part) {
    setSaving(true);
    try {
      await mPost("parts", {
        code: `${tmpl.code}-КОПИЯ`, name: tmpl.name, category: tmpl.category,
        material: tmpl.material, version: "v1.0", status: "ok",
        dimensions: tmpl.dimensions, weight_kg: tmpl.weight_kg,
        standard: tmpl.standard,
        notes: `На основе шаблона: ${tmpl.name} (${tmpl.code})`,
        collisions: 0, is_template: false,
      });
      await load(); setTab("mine"); setSelected(null);
    } catch { alert("Ошибка при создании копии"); }
    finally { setSaving(false); }
  }

  async function handleStatus(part: Part, status: string) {
    try {
      await mPut("parts", part.id, { status });
      await load();
      setSelected((p) => p?.id === part.id ? { ...p, status } : p);
    } catch { alert("Ошибка при обновлении статуса"); }
  }

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

  const availableCats = useMemo(() => {
    const cats = new Set(list.map((p) => p.category));
    return ["Все", ...CATEGORIES.filter((c) => cats.has(c))];
  }, [list]);

  return (
    <div className="p-6 space-y-5">

      {/* шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Проектирование — Библиотека деталей</h1>
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
        <CadForm
          form={form}
          saving={saving}
          users={users}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          onField={f}
        />
      )}

      {/* поиск + фильтр */}
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

          {/* список */}
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

          {/* карточка */}
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

      <AiAssistant
        title="Помощник конструктора"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}
