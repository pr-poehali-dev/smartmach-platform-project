import Icon from "@/components/ui/icon";

type LibTab = "templates" | "mine";

interface Props {
  tab: LibTab;
  catFilter: string;
  searchInput: string;
  availableCats: string[];
  total: number;
  onTabChange: (t: LibTab) => void;
  onCatFilter: (c: string) => void;
  onSearchInput: (v: string) => void;
}

export default function CadLibraryFilters({
  tab, catFilter, searchInput, availableCats, total,
  onTabChange, onCatFilter, onSearchInput,
}: Props) {
  return (
    <>
      {/* Поиск + фильтр категорий */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput} onChange={(e) => onSearchInput(e.target.value)}
            placeholder="Поиск по названию, коду, материалу…"
            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {availableCats.map((c) => (
            <button key={c} onClick={() => onCatFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                catFilter === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-border text-muted-foreground hover:border-primary/50"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Внутренние вкладки (шаблоны / мои) */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-fit">
          {([
            ["templates", "Библиотека шаблонов", "Library"],
            ["mine",      "Мои детали",          "FolderOpen"],
          ] as const).map(([id, label, icon]) => (
            <button key={id} onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon name={icon} size={15} />{label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
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
    </>
  );
}
