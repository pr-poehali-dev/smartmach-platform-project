import { useEffect, useState, useMemo, lazy, Suspense, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { mGetParts, mGet, mPost, mPut, Part, User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";
import { PartCard, DetailPanel } from "@/components/smartmach/CadPartCard";
import CadForm from "@/components/smartmach/CadForm";
import {
  CATEGORIES, EMPTY, catIcon, catColor,
  AI_SYSTEM, AI_SUGGESTIONS, type PartInfo,
} from "@/components/smartmach/cad.data";

const CadEditor2D = lazy(() => import("@/components/smartmach/CadEditor2D"));
const CadEditor3D = lazy(() => import("@/components/smartmach/CadEditor3D"));

const PAGE_SIZE = 24;

type MainTab = "library" | "2d" | "3d";
type LibTab  = "templates" | "mine";

export default function ModuleCAD() {
  const [mainTab, setMainTab] = useState<MainTab>("library");
  const [parts, setParts]     = useState<Part[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [tab, setTab]           = useState<LibTab>("templates");
  const [catFilter, setCatFilter] = useState<string>("Все");
  const [search, setSearch]     = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selected, setSelected] = useState<Part | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY);

  const loadParts = useCallback(async (opts: {
    tab: LibTab; search: string; page: number;
  }) => {
    setLoading(true); setError(null);
    try {
      const result = await mGetParts({
        templates: opts.tab === "templates",
        search: opts.search,
        limit: PAGE_SIZE,
        offset: opts.page * PAGE_SIZE,
      });
      setParts(result.items);
      setTotal(result.total);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    mGet<User[]>("users").then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    loadParts({ tab, search, page });
  }, [tab, search, page, loadParts]);

  // debounce поиска
  function handleSearchInput(val: string) {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      setSearch(val);
    }, 400);
  }

  function handleTabChange(t: LibTab) {
    setTab(t); setSelected(null); setCatFilter("Все"); setPage(0);
  }

  const filtered = useMemo(() => {
    if (catFilter === "Все") return parts;
    return parts.filter((p) => p.category === catFilter);
  }, [parts, catFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Part[]> = {};
    for (const p of filtered) {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    }
    return map;
  }, [filtered]);

  const availableCats = useMemo(() => {
    const cats = new Set(parts.map((p) => p.category));
    return ["Все", ...CATEGORIES.filter((c) => cats.has(c))];
  }, [parts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  async function reload() { await loadParts({ tab, search, page }); }

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
      handleTabChange("mine");
    } catch { alert("Ошибка при создании копии"); }
    finally { setSaving(false); }
  }

  async function handleStatus(part: Part, status: string) {
    try {
      await mPut("parts", part.id, { status });
      await reload();
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
      setForm(EMPTY); setShowForm(false); handleTabChange("mine");
    } catch { alert("Ошибка при создании"); }
    finally { setSaving(false); }
  }

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const openInEditor = (t: "2d" | "3d") => { setMainTab(t); };

  return (
    <div className="p-6 space-y-5">

      {/* шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Проектирование — CAD</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Библиотека деталей · 2D-чертежи · 3D-моделирование</p>
        </div>
        {mainTab === "library" && (
          <button onClick={() => { setShowForm(true); handleTabChange("mine"); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            <Icon name="Plus" size={16} />Новая деталь
          </button>
        )}
      </div>

      {/* Главные вкладки */}
      <div className="flex gap-1 border-b border-border">
        {([
          ["library", "FolderOpen",  "Библиотека деталей"],
          ["2d",      "PenLine",     "2D Чертёж"],
          ["3d",      "Box",         "3D Модель"],
        ] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mainTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon name={icon} size={15} />{label}
          </button>
        ))}
      </div>

      {/* 2D редактор */}
      {mainTab === "2d" && (
        <div style={{ height: 660 }}>
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground"><Icon name="Loader2" size={22} className="animate-spin mr-2" />Загрузка редактора…</div>}>
            <CadEditor2D part={selected ? partInfoFromPart(selected, form) : null} />
          </Suspense>
        </div>
      )}

      {/* 3D редактор */}
      {mainTab === "3d" && (
        <div style={{ height: 660 }}>
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground"><Icon name="Loader2" size={22} className="animate-spin mr-2" />Загрузка 3D…</div>}>
            <CadEditor3D part={selected ? partInfoFromPart(selected, form) : null} />
          </Suspense>
        </div>
      )}

      {/* форма */}
      {mainTab === "library" && showForm && (
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
      {mainTab === "library" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchInput} onChange={(e) => handleSearchInput(e.target.value)}
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
      )}

      {/* внутренние вкладки библиотеки */}
      {mainTab === "library" && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
            {([["templates", "Библиотека шаблонов", "Library"], ["mine", "Мои детали", "FolderOpen"]] as const).map(([id, label, icon]) => (
              <button key={id} onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon name={icon} size={15} />{label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {total}
                </span>
              </button>
            ))}
          </div>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {total} {total === 1 ? "деталь" : total < 5 ? "детали" : "деталей"}
            </span>
          )}
        </div>
      )}

      {/* основной контент библиотеки */}
      {mainTab === "library" && (loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Icon name="Loader" size={32} className="mx-auto mb-3 opacity-30 animate-spin" />Загрузка…
        </div>
      ) : error ? (
        <div className="py-16 text-center text-red-500 text-sm">
          <Icon name="AlertTriangle" size={32} className="mx-auto mb-3" />{error}
          <button onClick={reload} className="mt-2 block mx-auto text-xs underline text-muted-foreground">Повторить</button>
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

            {/* пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed">
                  <Icon name="ChevronLeft" size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                  <button key={i} onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${
                      i === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary text-muted-foreground"
                    }`}>
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed">
                  <Icon name="ChevronRight" size={16} />
                </button>
              </div>
            )}
          </div>

          {/* карточка */}
          <div className="xl:col-span-1">
            <div className="sticky top-4 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {selected ? selected.name : "Карточка детали"}
                  </span>
                  {selected && (
                    <div className="flex gap-1">
                      <button onClick={() => openInEditor("2d")} title="Открыть в 2D чертёж"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium">
                        <Icon name="PenLine" size={12} />2D
                      </button>
                      <button onClick={() => openInEditor("3d")} title="Открыть в 3D модель"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium">
                        <Icon name="Box" size={12} />3D
                      </button>
                    </div>
                  )}
                </div>
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
      ))}

      <AiAssistant
        title="Помощник конструктора"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}

function partInfoFromPart(part: Part, form: typeof EMPTY): PartInfo {
  const extra = part as Part & {
    dim_length?: string | number; dim_width?: string | number; dim_height?: string | number;
    roughness?: string; fit_type?: string; tolerance?: string; drawing_number?: string;
  };
  return {
    id: part.id,
    code: part.code,
    name: part.name,
    material: part.material,
    dimensions: part.dimensions,
    dim_length: extra.dim_length ? Number(extra.dim_length) : (form.dim_length ? Number(form.dim_length) : null),
    dim_width:  extra.dim_width  ? Number(extra.dim_width)  : (form.dim_width  ? Number(form.dim_width)  : null),
    dim_height: extra.dim_height ? Number(extra.dim_height) : (form.dim_height ? Number(form.dim_height) : null),
    standard: part.standard,
    drawing_number: extra.drawing_number ?? null,
    tolerance: extra.tolerance ?? null,
    roughness: extra.roughness ?? null,
    weight_kg: part.weight_kg ?? null,
    category: part.category,
  };
}
