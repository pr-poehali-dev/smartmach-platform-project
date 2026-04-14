import Icon from "@/components/ui/icon";
import { PRIORITY_CFG, OPERATION_TYPES, POSTPROCESSORS, MATERIALS, EMPTY_FORM } from "@/components/smartmach/cam.data";
import { type Part, type Machine, type User } from "@/lib/manufacture";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground block">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  form: typeof EMPTY_FORM;
  saving: boolean;
  parts: Part[];
  machines: Machine[];
  users: User[];
  onField: (k: keyof typeof EMPTY_FORM, v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function CamProgramForm({ form, saving, parts, machines, users, onField, onSubmit, onClose }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <style>{`.form-input { width: 100%; border: 1px solid hsl(var(--border)); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; background: white; } .form-input:focus { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2); }`}</style>

      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold">Новая управляющая программа</span>
        <button onClick={onClose}><Icon name="X" size={18} className="text-muted-foreground" /></button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Basic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Название *">
            <input required value={form.name} onChange={(e) => onField("name", e.target.value)}
              placeholder="Фрезеровка корпуса А-01" className="form-input" />
          </FormField>
          <FormField label="Тип операции">
            <select value={form.operation_type} onChange={(e) => onField("operation_type", e.target.value)} className="form-input">
              <option value="">— выберите —</option>
              {OPERATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Приоритет">
            <select value={form.priority} onChange={(e) => onField("priority", e.target.value)} className="form-input">
              {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FormField>
          <FormField label="Оценка времени">
            <input value={form.est_time} onChange={(e) => onField("est_time", e.target.value)}
              placeholder="2ч 30м" className="form-input" />
          </FormField>
          <FormField label="Деталь">
            <select value={form.part_id} onChange={(e) => onField("part_id", e.target.value)} className="form-input">
              <option value="">— не выбрана —</option>
              {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
          </FormField>
          <FormField label="Станок">
            <select value={form.machine_id} onChange={(e) => onField("machine_id", e.target.value)} className="form-input">
              <option value="">— не выбран —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </FormField>
          <FormField label="Автор">
            <select value={form.author_id} onChange={(e) => onField("author_id", e.target.value)} className="form-input">
              <option value="">— не выбран —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
          <FormField label="Постпроцессор">
            <select value={form.postprocessor} onChange={(e) => onField("postprocessor", e.target.value)} className="form-input">
              <option value="">— выберите —</option>
              {POSTPROCESSORS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
        </div>

        {/* Cutting parameters */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 border-t border-border pt-3">Режимы резания</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FormField label="Материал">
              <select value={form.material} onChange={(e) => onField("material", e.target.value)} className="form-input">
                <option value="">—</option>
                {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Инструмент">
              <input value={form.tool_name} onChange={(e) => onField("tool_name", e.target.value)}
                placeholder="Фреза Ø16 Z4" className="form-input" />
            </FormField>
            <FormField label="Диаметр, мм">
              <input type="number" value={form.tool_diameter} onChange={(e) => onField("tool_diameter", e.target.value)}
                placeholder="16" className="form-input" />
            </FormField>
            <FormField label="Скорость шпинделя, об/мин">
              <input type="number" value={form.spindle_speed} onChange={(e) => onField("spindle_speed", e.target.value)}
                placeholder="6000" className="form-input" />
            </FormField>
            <FormField label="Подача, мм/мин">
              <input type="number" value={form.feed_rate} onChange={(e) => onField("feed_rate", e.target.value)}
                placeholder="800" className="form-input" />
            </FormField>
            <FormField label="Глубина резания, мм">
              <input type="number" value={form.depth_of_cut} onChange={(e) => onField("depth_of_cut", e.target.value)}
                placeholder="3" className="form-input" />
            </FormField>
          </div>
        </div>

        {/* G-code & notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="G-код программы">
            <textarea value={form.code} onChange={(e) => onField("code", e.target.value)}
              placeholder={"G21 G90 G54\nT01 M06\nS6000 M03\n..."}
              rows={4} className="form-input font-mono text-xs resize-none" />
          </FormField>
          <FormField label="Примечания">
            <textarea value={form.notes} onChange={(e) => onField("notes", e.target.value)}
              placeholder="Особенности обработки, допуски, требования к качеству поверхности..."
              rows={4} className="form-input resize-none" />
          </FormField>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? "Сохранение…" : "Создать программу"}
          </button>
        </div>
      </form>
    </div>
  );
}
