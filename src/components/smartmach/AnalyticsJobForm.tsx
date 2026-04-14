import Icon from "@/components/ui/icon";
import { EMPTY_JOB } from "@/components/smartmach/analytics.types";

type FormState = typeof EMPTY_JOB;

interface Props {
  form: FormState;
  saving: boolean;
  products: { id: number; name: string; code: string }[];
  parts: { id: number; name: string; code: string }[];
  machines: { id: number; name: string }[];
  onField: (k: keyof FormState, v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function AnalyticsJobForm({
  form, saving, products, parts, machines,
  onField, onSubmit, onClose,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold">Новое производственное задание</span>
        <button onClick={onClose}><Icon name="X" size={18} className="text-muted-foreground" /></button>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Изделие</label>
          <select value={form.product_id} onChange={(e) => onField("product_id", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">— не выбрано —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Деталь</label>
          <select value={form.part_id} onChange={(e) => onField("part_id", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">— не выбрана —</option>
            {parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Станок</label>
          <select value={form.machine_id} onChange={(e) => onField("machine_id", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">— не выбран —</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Количество</label>
          <input type="number" min="1" value={form.qty} onChange={(e) => onField("qty", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Приоритет</label>
          <select value={form.priority} onChange={(e) => onField("priority", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="low">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="high">Высокий</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Срок сдачи</label>
          <input type="date" value={form.due_date} onChange={(e) => onField("due_date", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Примечания</label>
          <input value={form.notes} onChange={(e) => onField("notes", e.target.value)} placeholder="Необязательно"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? "Сохранение…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
