/**
 * CadDetailPanelCard — карточка выбранной детали в библиотеке CAD.
 * Мобильный вариант (снизу при выборе) и xl-вариант (sticky справа).
 * Извлечено 1:1 из CadLibraryGrid без изменения логики.
 */
import Icon from "@/components/ui/icon";
import { DetailPanel } from "@/components/smartmach/CadPartCard";
import CadDetailActions from "@/components/smartmach/CadDetailActions";
import { type Part } from "@/lib/manufacture";

type LibTab = "templates" | "mine";

interface Props {
  selected: Part | null;
  tab: LibTab;
  onSelect: (p: Part | null) => void;
  onOpenEditor: (t: "2d" | "3d") => void;
  onUseAsBase: (p: Part) => void;
  onStatusChange: (p: Part, status: string) => void;
  onNavigateToCam?: (partId: number) => void;
}

export default function CadDetailPanelCard({
  selected, tab, onSelect, onOpenEditor, onUseAsBase, onStatusChange, onNavigateToCam,
}: Props) {
  return (
    <>
      {/* Карточка детали — на мобиле появляется снизу при выборе, на xl — sticky сбоку */}
      {selected && (
        <div className="xl:hidden bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground truncate mr-2">{selected.name}</span>
              <div className="flex gap-1 shrink-0">
                <CadDetailActions part={selected} onOpenEditor={onOpenEditor} onNavigateToCam={onNavigateToCam} />
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
                  <CadDetailActions part={selected} onOpenEditor={onOpenEditor} onNavigateToCam={onNavigateToCam} />
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
    </>
  );
}
