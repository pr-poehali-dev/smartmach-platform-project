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
      <div>
        <h1 className="text-2xl font-bold text-foreground">PLM — Жизненный цикл изделий</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Управление версиями, согласование, архив</p>
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