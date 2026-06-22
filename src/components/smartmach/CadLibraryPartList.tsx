/**
 * CadLibraryPartList — левая колонка библиотеки CAD:
 * сгруппированные по категориям карточки деталей и пагинация.
 * Извлечено 1:1 из CadLibraryGrid без изменения логики.
 */
import Icon from "@/components/ui/icon";
import { catIcon, catColor } from "@/components/smartmach/cad.data";
import { PartCard } from "@/components/smartmach/CadPartCard";
import { type Part } from "@/lib/manufacture";

type LibTab = "templates" | "mine";

interface Props {
  grouped: Record<string, Part[]>;
  selected: Part | null;
  tab: LibTab;
  page: number;
  totalPages: number;
  onSelect: (p: Part | null) => void;
  onPageChange: (p: number) => void;
}

export default function CadLibraryPartList({
  grouped, selected, tab, page, totalPages, onSelect, onPageChange,
}: Props) {
  return (
    <div className="xl:col-span-2 space-y-4 md:space-y-5">
      {Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm bg-white rounded-xl border border-border">
          <Icon name="PackageOpen" size={36} className="mx-auto mb-2 opacity-20" />
          {tab === "mine"
            ? "Деталей пока нет. Добавьте свою или возьмите за основу из шаблонов."
            : "Нет деталей по выбранным фильтрам."}
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
                onClick={() => onSelect(selected?.id === p.id ? null : p)} />
            ))}
          </div>
        </div>
      ))}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page === 0} onClick={() => onPageChange(page - 1)}
            className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed">
            <Icon name="ChevronLeft" size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
            <button key={i} onClick={() => onPageChange(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${
                i === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary text-muted-foreground"
              }`}>
              {i + 1}
            </button>
          ))}
          <button disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}
            className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed">
            <Icon name="ChevronRight" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
