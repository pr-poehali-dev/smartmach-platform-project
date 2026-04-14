import Icon from "@/components/ui/icon";
import { stageColor, stageLabel, type Product } from "@/components/smartmach/plm.types";

interface Props {
  products: Product[];
  loading: boolean;
  error: string | null;
  selected: Product | null;
  onSelect: (p: Product) => void;
  onRetry: () => void;
}

export default function PlmProductList({ products, loading, error, selected, onSelect, onRetry }: Props) {
  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/40">
        <span className="text-sm font-semibold text-foreground">Изделия</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 text-sm">
          <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error}
          <button onClick={onRetry} className="mt-3 block mx-auto text-xs underline text-muted-foreground">Повторить</button>
        </div>
      ) : products.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <Icon name="PackageOpen" size={32} className="mx-auto mb-2 opacity-30" />Изделий пока нет. Добавьте первое.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {products.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors ${selected?.id === p.id ? "bg-primary/5" : ""}`}
            >
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name="Layers" size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.code}{p.latest_revision ? ` · ${p.latest_revision}` : ""}{p.owner_name ? ` · ${p.owner_name}` : ""}
                </div>
              </div>
              <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${stageColor(p.stage)}`}>
                {stageLabel(p.stage)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
