import { useEffect } from "react";
import Icon from "@/components/ui/icon";
import { User } from "@/lib/manufacture";
import {
  EMPTY, CATEGORIES, MATERIALS, STANDARDS, ROUGHNESS_VALUES, FIT_TYPES,
  MATERIAL_DENSITY, calcMass, formatDimensions,
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
  // ── Авторасчёт при изменении L, W, H или материала ──────────────
  useEffect(() => {
    const L = parseFloat(form.dim_length);
    const W = parseFloat(form.dim_width);
    const H = parseFloat(form.dim_height);
    const density = MATERIAL_DENSITY[form.material] ?? 0;

    // Автозаполнение габаритов
    if (L > 0 || W > 0 || H > 0) {
      const dims = formatDimensions(form.dim_length, form.dim_width, form.dim_height);
      if (dims !== form.dimensions) f("dimensions", dims);
    }

    // Автоматический расчёт массы (только если все три размера заданы)
    if (L > 0 && W > 0 && H > 0 && density > 0) {
      const mass = calcMass(L, W, H, density);
      if (mass > 0 && String(mass) !== form.weight_kg) {
        f("weight_kg", String(mass));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.dim_length, form.dim_width, form.dim_height, form.material]);

  const density = MATERIAL_DENSITY[form.material];
  const L = parseFloat(form.dim_length);
  const W = parseFloat(form.dim_width);
  const H = parseFloat(form.dim_height);
  const hasAllDims = L > 0 && W > 0 && H > 0;
  const autoMassAvailable = hasAllDims && !!density;

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

          {/* Линейные размеры */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
              Линейные размеры (мм)
              <span className="ml-1.5 text-[10px] font-normal text-primary/70">→ автозаполняют Габариты и Массу</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "dim_length" as const, label: "Длина L", placeholder: "200" },
                { key: "dim_width"  as const, label: "Ширина W", placeholder: "80" },
                { key: "dim_height" as const, label: "Высота H", placeholder: "40" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] text-muted-foreground mb-1 block">{label}</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.1" value={form[key]}
                      onChange={(e) => f(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">мм</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Габариты — автозаполняется из L×W×H */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                Габариты
                {hasAllDims && (
                  <span className="text-[10px] text-green-600 font-medium">авто</span>
                )}
              </label>
              <input
                value={form.dimensions}
                onChange={(e) => f("dimensions", e.target.value)}
                placeholder="200 × 80 × 40 мм"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30
                  ${hasAllDims ? "border-green-300 bg-green-50/30 text-green-900" : "border-border"}`}
              />
            </div>

            {/* Масса — автоматически или вручную */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                Масса (кг)
                {autoMassAvailable
                  ? <span className="text-[10px] text-green-600 font-medium">расчётная · {density} кг/м³</span>
                  : !density && form.material
                    ? <span className="text-[10px] text-amber-500">плотность неизвестна</span>
                    : !hasAllDims && <span className="text-[10px] text-muted-foreground">укажите L×W×H</span>
                }
              </label>
              <div className="relative">
                <input type="number" step="0.001" value={form.weight_kg}
                  onChange={(e) => f("weight_kg", e.target.value)}
                  placeholder="1.250"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8
                    ${autoMassAvailable ? "border-green-300 bg-green-50/30 text-green-900" : "border-border"}`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">кг</span>
              </div>
              {autoMassAvailable && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  V = {(L * W * H / 1e6).toFixed(2)} см³ · ρ = {density} кг/м³
                </p>
              )}
            </div>

            {/* Номер чертежа */}
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