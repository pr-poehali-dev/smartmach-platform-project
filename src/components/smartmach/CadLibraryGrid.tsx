import Icon from "@/components/ui/icon";
import { catIcon, catColor, type PartInfo } from "@/components/smartmach/cad.data";
import { PartCard, DetailPanel } from "@/components/smartmach/CadPartCard";
import { type Part } from "@/lib/manufacture";

type LibTab = "templates" | "mine";

interface Props {
  grouped: Record<string, Part[]>;
  selected: Part | null;
  tab: LibTab;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  saving: boolean;
  selectedPartInfo: PartInfo | null;
  onSelect: (p: Part | null) => void;
  onRetry: () => void;
  onPageChange: (p: number) => void;
  onOpenEditor: (t: "2d" | "3d") => void;
  onUseAsBase: (p: Part) => void;
  onStatusChange: (p: Part, status: string) => void;
  onNavigateToCam?: (partId: number) => void;
}

export default function CadLibraryGrid({
  grouped, selected, tab, loading, error,
  page, totalPages, saving,
  selectedPartInfo,
  onSelect, onRetry, onPageChange, onOpenEditor,
  onUseAsBase, onStatusChange, onNavigateToCam,
}: Props) {
  if (loading) return (
    <div className="py-16 text-center text-muted-foreground text-sm">
      <Icon name="Loader" size={32} className="mx-auto mb-3 opacity-30 animate-spin" />Загрузка…
    </div>
  );

  if (error) return (
    <div className="py-16 text-center text-red-500 text-sm">
      <Icon name="AlertTriangle" size={32} className="mx-auto mb-3" />{error}
      <button onClick={onRetry} className="mt-2 block mx-auto text-xs underline text-muted-foreground">Повторить</button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">

      {/* Список */}
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

      {/* Карточка детали — на мобиле появляется снизу при выборе, на xl — sticky сбоку */}
      {selected && (
        <div className="xl:hidden bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground truncate mr-2">{selected.name}</span>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onOpenEditor("2d")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium">
                  <Icon name="PenLine" size={12} />2D
                </button>
                <button onClick={() => onOpenEditor("3d")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium">
                  <Icon name="Box" size={12} />3D
                </button>
                {onNavigateToCam && !selected.is_template && (
                  <button onClick={() => onNavigateToCam(selected.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium">
                    <Icon name="FileCode" size={12} />ЧПУ
                  </button>
                )}
                <button onClick={() => onSelect(null)} className="p-1 rounded-lg hover:bg-secondary/60 ml-1">
                  <Icon name="X" size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-4">
            <DetailPanel part={selected} onUseAsBase={onUseAsBase} onStatusChange={onStatusChange} />
          </div>
        </div>
      )}

      {/* Карточка детали — только xl, sticky справа */}
      <div className="hidden xl:block xl:col-span-1">
        <div className="sticky top-4 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {selected ? selected.name : "Карточка детали"}
              </span>
              {selected && (
                <div className="flex gap-1">
                  <button onClick={() => onOpenEditor("2d")} title="Открыть в 2D чертёж"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium">
                    <Icon name="PenLine" size={12} />2D
                  </button>
                  <button onClick={() => onOpenEditor("3d")} title="Открыть в 3D модель"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium">
                    <Icon name="Box" size={12} />3D
                  </button>
                  {onNavigateToCam && !selected.is_template && (
                    <button onClick={() => onNavigateToCam(selected.id)} title="Создать ЧПУ-программу для этой детали"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium">
                      <Icon name="FileCode" size={12} />ЧПУ
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="p-4">
            {selected ? (
              <DetailPanel part={selected} onUseAsBase={onUseAsBase} onStatusChange={onStatusChange} />
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
  );
}