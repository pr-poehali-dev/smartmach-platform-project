import Icon from "@/components/ui/icon";

const PRODUCTS = [
  { id: 1, name: "Редуктор РЦ-250",     revision: "Rev D", stage: "Производство",  owner: "Иванов А.",  updated: "сегодня" },
  { id: 2, name: "Мотор-редуктор МР-4", revision: "Rev B", stage: "Разработка",    owner: "Петрова М.", updated: "вчера" },
  { id: 3, name: "Планетарная ПГ-1",   revision: "Rev A", stage: "Согласование",  owner: "Сидоров К.", updated: "3 дня назад" },
  { id: 4, name: "Цилиндрический ЦГ-2",revision: "Rev C", stage: "Архив",         owner: "Кузнецов Д.",updated: "нед. назад" },
];

const STAGE_COLORS: Record<string, string> = {
  "Производство":  "text-green-600  bg-green-50  border-green-200",
  "Разработка":    "text-blue-600   bg-blue-50   border-blue-200",
  "Согласование":  "text-yellow-600 bg-yellow-50 border-yellow-200",
  "Архив":         "text-gray-500   bg-gray-50   border-gray-200",
};

export default function ModulePLM() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PLM — Жизненный цикл изделий</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Управление версиями, согласование, архив</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} />
          Новое изделие
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Всего изделий",  value: PRODUCTS.length, icon: "Layers",      color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "В производстве", value: 1,               icon: "Factory",     color: "text-green-600",  bg: "bg-green-50" },
          { label: "В разработке",   value: 1,               icon: "Pencil",      color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "На согласовании",value: 1,               icon: "Clock",       color: "text-yellow-600", bg: "bg-yellow-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={18} className={s.color} />
            </div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold text-foreground">Изделия</span>
        </div>
        <div className="divide-y divide-border">
          {PRODUCTS.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon name="Layers" size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.revision} · {p.owner} · {p.updated}</div>
              </div>
              <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${STAGE_COLORS[p.stage]}`}>
                {p.stage}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
