import Icon from "@/components/ui/icon";
import { AssemblyNode, NODE_TYPE_CFG, NODE_STATUS_CFG } from "@/lib/assembly";

interface Props {
  node: AssemblyNode;
  onEdit: () => void;
  onClose: () => void;
  onNavigateToPart?: (partId: number) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground flex-shrink-0 w-32">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export default function AssemblyNodeDetail({ node, onEdit, onClose, onNavigateToPart }: Props) {
  const typeCfg   = NODE_TYPE_CFG[node.node_type]   ?? NODE_TYPE_CFG.part;
  const statusCfg = NODE_STATUS_CFG[node.status]    ?? NODE_STATUS_CFG.draft;

  const hasTech    = node.surface_finish || node.heat_treatment || node.tolerance_class || node.standard_ref || node.dimensions;
  const hasSupply  = node.supplier || node.supplier_code || node.lead_time_days;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Шапка */}
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon name={typeCfg.icon as Parameters<typeof Icon>[0]["name"]} size={17} className={typeCfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground truncate">{node.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">{node.code}</span>
            {node.path && <span className="text-[10px] text-muted-foreground">поз. {node.path}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
            node.status === "approved" || node.status === "production"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : node.status === "issue"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}>{statusCfg.label}</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/60 transition-colors">
            <Icon name="X" size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Issue предупреждение */}
        {node.issue_flag && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <Icon name="AlertTriangle" size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">Замечание</div>
              <div>{node.issue_note || "Отмечено как проблемная позиция"}</div>
            </div>
          </div>
        )}

        {/* Основные параметры */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Параметры</div>
          <Row label="Тип"          value={typeCfg.label} />
          <Row label="Кол-во"       value={`${node.qty} ${node.unit}`} />
          <Row label="Ревизия"      value={node.revision} />
          {node.material && <Row label="Материал" value={node.material} />}
          {node.weight_kg && <Row label="Масса ед., кг" value={Number(node.weight_kg).toFixed(3)} />}
          {node.total_weight_kg && <Row label="Масса всего, кг" value={Number(node.total_weight_kg).toFixed(3)} />}
          {node.dimensions && <Row label="Габариты" value={node.dimensions} />}
        </div>

        {/* Технические требования */}
        {hasTech && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Технические требования</div>
            <Row label="Шероховатость"  value={node.surface_finish} />
            <Row label="Термообработка" value={node.heat_treatment} />
            <Row label="Посадка/допуск" value={node.tolerance_class} />
            <Row label="ГОСТ / ОСТ"    value={node.standard_ref} />
          </div>
        )}

        {/* Поставщик */}
        {hasSupply && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Поставка</div>
            <Row label="Поставщик"     value={node.supplier} />
            <Row label="Артикул"       value={node.supplier_code} />
            <Row label="Срок, дн."     value={node.lead_time_days} />
          </div>
        )}

        {/* Связи */}
        {(node.part_id || node.child_assembly_id) && (
          <div className="flex flex-col gap-1.5">
            {node.part_id && onNavigateToPart && (
              <button
                onClick={() => onNavigateToPart(node.part_id!)}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                <Icon name="Box" size={12} />
                Открыть деталь в CAD: {node.part_name || node.part_code}
              </button>
            )}
          </div>
        )}

        {/* Примечания */}
        {node.notes && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Примечание</div>
            <p className="text-xs text-muted-foreground leading-relaxed">{node.notes}</p>
          </div>
        )}

        {/* Редактировать */}
        <button
          onClick={onEdit}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border hover:bg-secondary/60 transition-colors text-sm font-medium text-foreground"
        >
          <Icon name="Pencil" size={14} />
          Редактировать
        </button>
      </div>
    </div>
  );
}
