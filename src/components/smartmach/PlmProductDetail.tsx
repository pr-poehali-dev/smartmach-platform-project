import Icon from "@/components/ui/icon";
import { STAGES, type Product } from "@/components/smartmach/plm.types";

interface Props {
  selected: Product | null;
  onStageChange: (productId: number, newStage: string) => void;
}

export default function PlmProductDetail({ selected, onStageChange }: Props) {
  return (
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
                  onClick={() => onStageChange(selected.id, s.value)}
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
  );
}
