import Icon from "@/components/ui/icon";
import { User } from "@/lib/manufacture";
import {
  EMPTY, CATEGORIES, MATERIALS, STANDARDS, ROUGHNESS_VALUES, FIT_TYPES,
} from "@/components/smartmach/cad.data";

interface Props {
  form: typeof EMPTY;
  saving: boolean;
  users: User[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onField: (k: keyof typeof EMPTY, v: string) => void;
}

export default function CadForm({ form, saving, users, onClose, onSubmit, onField: f }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold text-foreground">Новая деталь</span>
        <button onClick={onClose}><Icon name="X" size={18} className="text-muted-foreground" /></button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">

        {/* Основное */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Код *</label>
            <input required value={form.code} onChange={(e) => f("code", e.target.value)} placeholder="КРД-001"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
            <input required value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Корпус редуктора"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
            <select value={form.category} onChange={(e) => f("category", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Материал</label>
            <select value={form.material} onChange={(e) => f("material", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— выберите —</option>
              {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Версия</label>
            <input value={form.version} onChange={(e) => f("version", e.target.value)} placeholder="v1.0"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Автор</label>
            <select value={form.author_id} onChange={(e) => f("author_id", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— не выбран —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Геометрия и масса */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border pt-3 mb-2">
            Геометрия и масса
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Габариты</label>
              <input value={form.dimensions} onChange={(e) => f("dimensions", e.target.value)} placeholder="Ø40×200 мм"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Масса (кг)</label>
              <input type="number" step="0.001" value={form.weight_kg} onChange={(e) => f("weight_kg", e.target.value)}
                placeholder="1.250"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Номер чертежа</label>
              <input value={form.drawing_number} onChange={(e) => f("drawing_number", e.target.value)}
                placeholder="ДЧ-2024-001"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        {/* Допуски и ЕСКД */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border pt-3 mb-2">
            Допуски, посадки и стандарты (ЕСКД)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Шероховатость</label>
              <select value={form.roughness} onChange={(e) => f("roughness", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не указана —</option>
                {ROUGHNESS_VALUES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип посадки</label>
              <select value={form.fit_type} onChange={(e) => f("fit_type", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не указана —</option>
                {FIT_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Допуск</label>
              <input value={form.tolerance} onChange={(e) => f("tolerance", e.target.value)}
                placeholder="H7/h6"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Стандарт</label>
              <select value={form.standard} onChange={(e) => f("standard", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не указан —</option>
                {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Примечания */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Примечания</label>
          <input value={form.notes} onChange={(e) => f("notes", e.target.value)}
            placeholder="Необязательно"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? "Сохранение…" : "Создать деталь"}
          </button>
        </div>
      </form>
    </div>
  );
}
