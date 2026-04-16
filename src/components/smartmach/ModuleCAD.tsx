import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";
import { mGetParts, mGet, mPost, mPut, type Part, type User } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";
import CadForm from "@/components/smartmach/CadForm";
import {
  CATEGORIES, EMPTY, partInfoFromPart,
  AI_SYSTEM, AI_SUGGESTIONS,
} from "@/components/smartmach/cad.data";
import CadLibraryFilters from "@/components/smartmach/CadLibraryFilters";
import CadLibraryGrid    from "@/components/smartmach/CadLibraryGrid";
import CadEditorTabs     from "@/components/smartmach/CadEditorTabs";

const PAGE_SIZE = 24;

type MainTab = "library" | "2d" | "3d";
type LibTab  = "templates" | "mine";

interface Props {
  onNavigateToCam?: (partId: number) => void;
}

export default function ModuleCAD({ onNavigateToCam }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("library");
  const [parts, setParts]     = useState<Part[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [tab, setTab]               = useState<LibTab>("templates");
  const [catFilter, setCatFilter]   = useState<string>("Все");
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selected, setSelected] = useState<Part | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY);

  const loadParts = useCallback(async (opts: { tab: LibTab; search: string; page: number }) => {
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

  useEffect(() => { mGet<User[]>("users").then(setUsers).catch(() => {}); }, []);
  useEffect(() => { loadParts({ tab, search, page }); }, [tab, search, page, loadParts]);

  function handleSearchInput(val: string) {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(0); setSearch(val); }, 400);
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
  const selectedPartInfo = selected ? partInfoFromPart(selected as Parameters<typeof partInfoFromPart>[0], form) : null;

  return (
    <div className="p-6 space-y-5">

      {/* Шапка */}
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
          ["library", "FolderOpen", "Библиотека деталей"],
          ["2d",      "PenLine",    "2D Чертёж"],
          ["3d",      "Box",        "3D Модель"],
        ] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mainTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon name={icon} size={15} />{label}
          </button>
        ))}
      </div>

      {/* Редакторы */}
      {(mainTab === "2d" || mainTab === "3d") && (
        <CadEditorTabs mode={mainTab} part={selectedPartInfo} />
      )}

      {/* Библиотека */}
      {mainTab === "library" && (
        <>
          {showForm && (
            <CadForm form={form} saving={saving} users={users}
              onClose={() => setShowForm(false)} onSubmit={handleCreate} onField={f} />
          )}

          <CadLibraryFilters
            tab={tab}
            catFilter={catFilter}
            searchInput={searchInput}
            availableCats={availableCats}
            total={total}
            onTabChange={handleTabChange}
            onCatFilter={setCatFilter}
            onSearchInput={handleSearchInput}
          />

          <CadLibraryGrid
            grouped={grouped}
            selected={selected}
            tab={tab}
            loading={loading}
            error={error}
            page={page}
            totalPages={totalPages}
            saving={saving}
            selectedPartInfo={selectedPartInfo}
            onSelect={(p) => setSelected(p)}
            onRetry={reload}
            onPageChange={setPage}
            onOpenEditor={(t) => setMainTab(t)}
            onUseAsBase={handleUseAsBase}
            onStatusChange={handleStatus}
            onNavigateToCam={onNavigateToCam}
          />
        </>
      )}

      <AiAssistant
        title="Помощник конструктора"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}