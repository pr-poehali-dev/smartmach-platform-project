import Icon from "@/components/ui/icon";
import { Part, User } from "@/lib/manufacture";
import { EMPTY, SIM_TYPES, MATERIALS, BC_TYPES, LOAD_TYPES } from "@/components/smartmach/cae.data";

interface Props {
  form: typeof EMPTY;
  saving: boolean;
  parts: Part[];
  users: User[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onField: (k: keyof typeof EMPTY, v: string) => void;
}

export default function CaeForm({ form, saving, parts, users, onClose, onSubmit, onField: f }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold">Новый расчёт</span>
        <button onClick={onClose}><Icon name="X" size={18} className="text-muted-foreground" /></button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Basic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
            <input required value={form.name} onChange={(e) => f("name", e.target.value)}
              placeholder="Прочностной расчёт корпуса редуктора"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Тип анализа</label>
            <select value={form.sim_type} onChange={(e) => f("sim_type", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {SIM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Деталь</label>
            <select value={form.part_id} onChange={(e) => f("part_id", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— не выбрана —</option>
              {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
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
            <label className="text-xs text-muted-foreground mb-1 block">Автор</label>
            <select value={form.author_id} onChange={(e) => f("author_id", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— не выбран —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Boundary conditions & loads */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border pt-3 mb-2">
            Граничные условия и нагрузки
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Граничное условие</label>
              <select value={form.bc_type} onChange={(e) => f("bc_type", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— выберите —</option>
                {BC_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип нагрузки</label>
              <select value={form.load_type} onChange={(e) => f("load_type", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— выберите —</option>
                {LOAD_TYPES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Значение нагрузки</label>
              <div className="flex gap-2">
                <input type="number" value={form.load_value} onChange={(e) => f("load_value", e.target.value)}
                  placeholder="5000"
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <select value={form.load_unit} onChange={(e) => f("load_unit", e.target.value)}
                  className="w-16 border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option>Н</option>
                  <option>кН</option>
                  <option>МПа</option>
                  <option>°C</option>
                  <option>Нм</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mesh & results */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border pt-3 mb-2">
            Сетка и результаты
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Размер элемента сетки, мм</label>
              <input type="number" value={form.mesh_size} onChange={(e) => f("mesh_size", e.target.value)}
                placeholder="2.5"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Уровень нагрузки, %</label>
              <input type="number" min="0" max="100" value={form.stress_pct} onChange={(e) => f("stress_pct", e.target.value)}
                placeholder="65"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Коэффициент запаса прочности</label>
              <input type="number" step="0.1" value={form.safety_factor} onChange={(e) => f("safety_factor", e.target.value)}
                placeholder="2.4"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Заключение по результату</label>
              <input value={form.result} onChange={(e) => f("result", e.target.value)}
                placeholder="Конструкция выдерживает нагрузку. Максимальные напряжения по Мизесу — 180 МПа."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Примечания</label>
              <input value={form.notes} onChange={(e) => f("notes", e.target.value)}
                placeholder="Учесть усталость при циклической нагрузке"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
            {saving ? "Сохранение…" : "Создать расчёт"}
          </button>
        </div>
      </form>
    </div>
  );
}
