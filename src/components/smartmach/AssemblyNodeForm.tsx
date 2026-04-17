import { useState } from "react";
import Icon from "@/components/ui/icon";
import {
  AssemblyNode, NodeType, NodeStatus,
  NODE_TYPE_CFG, NODE_STATUS_CFG,
  asmPost, asmPut,
} from "@/lib/assembly";

interface PartOption { id: number; code: string; name: string; material: string | null }

interface Props {
  assemblyId: number;
  parentId?: number | null;
  node?: AssemblyNode | null;
  partsList: PartOption[];
  onSave: (node: AssemblyNode) => void;
  onClose: () => void;
}

const UNIT_QUICK = ["шт", "сб.ед.", "кг", "л", "м", "м²", "компл."];
const TYPE_OPTS: { value: NodeType; label: string }[] = [
  { value: "assembly",  label: "Сборочная единица" },
  { value: "part",      label: "Деталь" },
  { value: "standard",  label: "Стандартное изделие" },
  { value: "fastener",  label: "Крепёж / Метизы" },
  { value: "material",  label: "Материал" },
  { value: "purchased", label: "Покупное изделие" },
];
const STATUS_OPTS: { value: NodeStatus; label: string }[] = Object.entries(NODE_STATUS_CFG)
  .map(([v, c]) => ({ value: v as NodeStatus, label: c.label }));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground block">{label}</label>
      {children}
    </div>
  );
}
const inp = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white";

export default function AssemblyNodeForm({ assemblyId, parentId, node, partsList, onSave, onClose }: Props) {
  const isEdit = !!node;

  const [form, setForm] = useState({
    node_type:     (node?.node_type      ?? "part") as NodeType,
    code:          node?.code            ?? "",
    name:          node?.name            ?? "",
    revision:      node?.revision        ?? "A",
    qty:           String(node?.qty      ?? "1"),
    unit:          node?.unit            ?? "шт",
    material:      node?.material        ?? "",
    weight_kg:     String(node?.weight_kg ?? ""),
    dimensions:    node?.dimensions      ?? "",
    surface_finish:node?.surface_finish  ?? "",
    heat_treatment:node?.heat_treatment  ?? "",
    tolerance_class:node?.tolerance_class ?? "",
    standard_ref:  node?.standard_ref    ?? "",
    status:        (node?.status         ?? "draft") as NodeStatus,
    notes:         node?.notes           ?? "",
    part_id:       String(node?.part_id  ?? ""),
    supplier:      node?.supplier        ?? "",
    supplier_code: node?.supplier_code   ?? "",
    lead_time_days:String(node?.lead_time_days ?? ""),
    issue_flag:    node?.issue_flag      ?? false,
    issue_note:    node?.issue_note      ?? "",
  });
  const [saving, setSaving] = useState(false);

  const f = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      assembly_id:    assemblyId,
      parent_id:      parentId ?? null,
      node_type:      form.node_type,
      code:           form.code,
      name:           form.name,
      revision:       form.revision,
      qty:            Number(form.qty) || 1,
      unit:           form.unit,
      material:       form.material || null,
      weight_kg:      form.weight_kg ? Number(form.weight_kg) : null,
      total_weight_kg:(form.weight_kg && form.qty) ? Number(form.weight_kg) * Number(form.qty) : null,
      dimensions:     form.dimensions    || null,
      surface_finish: form.surface_finish || null,
      heat_treatment: form.heat_treatment || null,
      tolerance_class:form.tolerance_class || null,
      standard_ref:   form.standard_ref  || null,
      status:         form.status,
      notes:          form.notes         || null,
      part_id:        form.part_id       ? Number(form.part_id) : null,
      supplier:       form.supplier      || null,
      supplier_code:  form.supplier_code || null,
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
      issue_flag:     form.issue_flag,
      issue_note:     form.issue_note    || null,
    };
    try {
      let saved: AssemblyNode;
      if (isEdit && node) {
        saved = await asmPut("nodes", node.id, payload) as AssemblyNode;
      } else {
        saved = await asmPost<AssemblyNode>("nodes", payload);
      }
      onSave(saved);
    } finally {
      setSaving(false);
    }
  }

  const showPart     = form.node_type === "part";
  const showSupply   = form.node_type === "purchased" || form.node_type === "material";
  const showTech     = form.node_type === "part" || form.node_type === "assembly";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {isEdit ? "Редактировать узел" : parentId ? "Добавить дочерний узел" : "Добавить узел"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Тип */}
          <Field label="Тип узла *">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTS.map(t => (
                <button type="button" key={t.value}
                  onClick={() => f("node_type", t.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                    form.node_type === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Основные поля */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Обозначение / Код *">
              <input required value={form.code} onChange={e => f("code", e.target.value)}
                placeholder="РЦ-250-201" className={inp} />
            </Field>
            <Field label="Ревизия">
              <input value={form.revision} onChange={e => f("revision", e.target.value)}
                placeholder="A" className={inp} />
            </Field>
            <Field label="Наименование *">
              <input required value={form.name} onChange={e => f("name", e.target.value)}
                placeholder="Вал быстроходный" className={`${inp} sm:col-span-2`} />
            </Field>
          </div>

          {/* Количество */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Количество *">
              <input type="number" min="0" step="any" required value={form.qty}
                onChange={e => f("qty", e.target.value)} className={inp} />
            </Field>
            <Field label="Единица измерения">
              <input value={form.unit} onChange={e => f("unit", e.target.value)} className={inp} />
              <div className="flex flex-wrap gap-1 mt-1">
                {UNIT_QUICK.map(u => (
                  <button type="button" key={u} onClick={() => f("unit", u)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      form.unit === u ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"
                    }`}>
                    {u}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Материал и масса */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Материал / марка">
              <input value={form.material} onChange={e => f("material", e.target.value)}
                placeholder="40Х, СЧ25, АМг6" className={inp} />
            </Field>
            <Field label="Масса ед., кг">
              <input type="number" step="any" min="0" value={form.weight_kg}
                onChange={e => f("weight_kg", e.target.value)} placeholder="0.000" className={inp} />
            </Field>
            <Field label="Габариты">
              <input value={form.dimensions} onChange={e => f("dimensions", e.target.value)}
                placeholder="Ø65×380" className={inp} />
            </Field>
          </div>

          {/* Технические требования */}
          {showTech && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Шероховатость">
                <input value={form.surface_finish} onChange={e => f("surface_finish", e.target.value)}
                  placeholder="Ra 1.6" className={inp} />
              </Field>
              <Field label="Термообработка">
                <input value={form.heat_treatment} onChange={e => f("heat_treatment", e.target.value)}
                  placeholder="ТВЧ HRC 50-55" className={inp} />
              </Field>
              <Field label="Допуск / посадка">
                <input value={form.tolerance_class} onChange={e => f("tolerance_class", e.target.value)}
                  placeholder="6g, Н7/r6" className={inp} />
              </Field>
              <Field label="ГОСТ / ОСТ">
                <input value={form.standard_ref} onChange={e => f("standard_ref", e.target.value)}
                  placeholder="ГОСТ 8732-78" className={inp} />
              </Field>
            </div>
          )}

          {/* Связь с CAD-деталью */}
          {showPart && partsList.length > 0 && (
            <Field label="Связать с деталью из CAD">
              <select value={form.part_id} onChange={e => f("part_id", e.target.value)} className={inp}>
                <option value="">— не связана —</option>
                {partsList.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}{p.material ? ` (${p.material})` : ""}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Поставщик */}
          {showSupply && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Поставщик">
                <input value={form.supplier} onChange={e => f("supplier", e.target.value)}
                  placeholder="ООО Металлопрокат" className={inp} />
              </Field>
              <Field label="Артикул поставщика">
                <input value={form.supplier_code} onChange={e => f("supplier_code", e.target.value)} className={inp} />
              </Field>
              <Field label="Срок поставки, дн.">
                <input type="number" min="0" value={form.lead_time_days}
                  onChange={e => f("lead_time_days", e.target.value)} className={inp} />
              </Field>
            </div>
          )}

          {/* Статус */}
          <Field label="Статус">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTS.map(s => (
                <button type="button" key={s.value}
                  onClick={() => f("status", s.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    form.status === s.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Примечание */}
          <Field label="Примечание">
            <textarea value={form.notes} onChange={e => f("notes", e.target.value)}
              rows={2} className={`${inp} resize-none`} />
          </Field>

          {/* Замечание */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.issue_flag}
                onChange={e => f("issue_flag", e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-foreground font-medium">Отметить замечание</span>
            </label>
            {form.issue_flag && (
              <textarea value={form.issue_note} onChange={e => f("issue_note", e.target.value)}
                rows={2} placeholder="Описание проблемы..."
                className={`${inp} resize-none border-red-300 focus:ring-red-300`} />
            )}
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium">
              {saving ? "Сохранение…" : isEdit ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
