import Icon from "@/components/ui/icon";
import { STAGES, type User } from "@/components/smartmach/plm.types";

interface FormState {
  code: string; name: string; description: string; stage: string; owner_id: string;
}

interface Props {
  form: FormState;
  saving: boolean;
  users: User[];
  onChange: (form: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function PlmProductForm({ form, saving, users, onChange, onSubmit, onClose }: Props) {
  const set = (key: keyof FormState, value: string) => onChange({ ...form, [key]: value });

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-foreground">Новое изделие</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <Icon name="X" size={18} />
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Код *</label>
          <input
            required value={form.code} onChange={(e) => set("code", e.target.value)}
            placeholder="РЦ-001"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
          <input
            required value={form.name} onChange={(e) => set("name", e.target.value)}
            placeholder="Редуктор цилиндрический"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
          <input
            value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Необязательно"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Стадия</label>
          <select
            value={form.stage} onChange={(e) => set("stage", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Ответственный</label>
          <select
            value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">— не выбран —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">
            Отмена
          </button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? "Сохранение…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
