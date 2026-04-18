import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { NODE_TYPE_CFG, NodeType } from "@/lib/assembly";

export interface ParsedRow {
  path: string;
  code: string;
  name: string;
  qty: number;
  unit: string;
  material: string | null;
  weight_kg: number | null;
  total_weight_kg: number | null;
  dimensions: string | null;
  node_type: NodeType;
  notes: string | null;
  standard_ref: string | null;
  heat_treatment: string | null;
  supplier: string | null;
  status: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  warnings: string[];
  total: number;
}

const NODE_TYPE_RU: Record<string, string> = {
  assembly:  "Сб. ед.",
  part:      "Деталь",
  standard:  "Стандарт",
  fastener:  "Крепёж",
  material:  "Материал",
  purchased: "Покупное",
};

interface Props {
  parsed: ParseResult;
  file: File | null;
  replace: boolean;
  importing: boolean;
  error: string | null;
  onReplace: (val: boolean) => void;
  onUpdateRow: (idx: number, field: keyof ParsedRow, value: string) => void;
  onRemoveRow: (idx: number) => void;
  onImport: () => void;
  onCancel: () => void;
}

export default function AssemblyImportPreview({
  parsed, file, replace, importing, error,
  onReplace, onUpdateRow, onRemoveRow, onImport, onCancel,
}: Props) {
  return (
    <>
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Итоги парсинга */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Icon name="CheckCircle" size={16} className="text-emerald-500" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{parsed.rows.length}</div>
                <div className="text-[10px] text-muted-foreground">строк распознано</div>
              </div>
            </div>
            {parsed.warnings.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Icon name="AlertTriangle" size={16} className="text-amber-500" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{parsed.warnings.length}</div>
                  <div className="text-[10px] text-muted-foreground">предупреждений</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon name="FileText" size={13} />
              {file?.name}
            </div>
          </div>

          {/* Опция замены */}
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={replace} onChange={e => onReplace(e.target.checked)}
              className="w-4 h-4 rounded" />
            <span className="text-foreground font-medium">Очистить дерево перед импортом</span>
          </label>
        </div>

        {/* Предупреждения */}
        {parsed.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 mb-1">
              <Icon name="AlertTriangle" size={13} />Предупреждения парсера
            </div>
            {parsed.warnings.slice(0, 5).map((w, i) => (
              <div key={i} className="text-xs text-amber-700">· {w}</div>
            ))}
            {parsed.warnings.length > 5 && (
              <div className="text-xs text-amber-600">…ещё {parsed.warnings.length - 5}</div>
            )}
          </div>
        )}

        {/* Таблица строк */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[70px_110px_1fr_60px_60px_90px_70px_80px_32px] gap-0 bg-secondary/60 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {["Поз.","Код","Наименование","Кол","Ед","Материал","Масса","Тип",""].map((h, i) => (
              <div key={i} className="px-2 py-2">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-border/50 max-h-[45vh] overflow-y-auto">
            {parsed.rows.map((row, idx) => {
              const typeCfg = NODE_TYPE_CFG[row.node_type] ?? NODE_TYPE_CFG.part;
              return (
                <div key={idx}
                  className={cn(
                    "grid grid-cols-[70px_110px_1fr_60px_60px_90px_70px_80px_32px] gap-0 text-xs hover:bg-secondary/20 transition-colors",
                    idx % 2 === 1 && "bg-secondary/10"
                  )}
                >
                  {/* Поз. */}
                  <div className="px-2 py-1.5">
                    <input value={row.path || ""} onChange={e => onUpdateRow(idx, "path", e.target.value)}
                      className="w-full text-xs font-mono bg-transparent border-b border-transparent focus:border-primary/50 outline-none" />
                  </div>
                  {/* Код */}
                  <div className="px-2 py-1.5">
                    <input value={row.code || ""} onChange={e => onUpdateRow(idx, "code", e.target.value)}
                      className="w-full text-[10px] font-mono bg-transparent border-b border-transparent focus:border-primary/50 outline-none truncate" />
                  </div>
                  {/* Наименование */}
                  <div className="px-2 py-1.5">
                    <input value={row.name || ""} onChange={e => onUpdateRow(idx, "name", e.target.value)}
                      className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary/50 outline-none font-medium" />
                  </div>
                  {/* Кол */}
                  <div className="px-2 py-1.5">
                    <input type="number" value={row.qty ?? ""} onChange={e => onUpdateRow(idx, "qty", e.target.value)}
                      className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary/50 outline-none text-center" />
                  </div>
                  {/* Ед */}
                  <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center">{row.unit}</div>
                  {/* Материал */}
                  <div className="px-2 py-1.5">
                    <input value={row.material || ""} onChange={e => onUpdateRow(idx, "material", e.target.value)}
                      className="w-full text-[10px] bg-transparent border-b border-transparent focus:border-primary/50 outline-none text-muted-foreground" />
                  </div>
                  {/* Масса */}
                  <div className="px-2 py-1.5 text-[10px] text-muted-foreground flex items-center">
                    {row.weight_kg != null ? Number(row.weight_kg).toFixed(3) : "—"}
                  </div>
                  {/* Тип */}
                  <div className="px-2 py-1.5 flex items-center">
                    <span className={`text-[10px] font-medium ${typeCfg.color}`}>
                      {NODE_TYPE_RU[row.node_type] ?? row.node_type}
                    </span>
                  </div>
                  {/* Удалить */}
                  <div className="px-1 py-1.5 flex items-center justify-center">
                    <button onClick={() => onRemoveRow(idx)}
                      className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                      <Icon name="X" size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <Icon name="AlertTriangle" size={15} />{error}
          </div>
        )}
      </div>

      {/* Нижняя панель действий */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0 bg-secondary/20">
        <p className="text-xs text-muted-foreground">
          Данные можно редактировать прямо в таблице перед импортом
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60 transition-colors">
            Отмена
          </button>
          <button
            onClick={onImport}
            disabled={importing || parsed.rows.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50 font-medium transition-opacity"
          >
            {importing ? (
              <><Icon name="Loader" size={14} className="animate-spin" />Импортируем…</>
            ) : (
              <><Icon name="Upload" size={14} />Импортировать {parsed.rows.length} строк</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
