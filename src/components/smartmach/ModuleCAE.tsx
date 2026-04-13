import Icon from "@/components/ui/icon";

const SIMULATIONS = [
  { id: 1, name: "Нагрузка корпуса редуктора", type: "МКЭ",        status: "done",    result: "Запас 2.4x",  stress: 87 },
  { id: 2, name: "Тепловой анализ вала",        type: "Тепловой",   status: "running", result: "—",           stress: 0 },
  { id: 3, name: "Динамика шестерни Z=32",       type: "Динамика",  status: "error",   result: "Резонанс!",   stress: 0 },
  { id: 4, name: "Деформация фланца",            type: "МКЭ",       status: "done",    result: "Запас 1.9x",  stress: 62 },
];

const STATUS = {
  done:    { label: "Готово",    color: "text-green-600",  bg: "bg-green-50 border-green-200",  icon: "CheckCircle" },
  running: { label: "Расчёт…",  color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",    icon: "Loader" },
  error:   { label: "Проблема", color: "text-red-600",    bg: "bg-red-50 border-red-200",      icon: "AlertTriangle" },
};

export default function ModuleCAE() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CAE — Инженерный анализ</h1>
        <p className="text-muted-foreground text-sm mt-0.5">МКЭ, тепловые и динамические симуляции</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Расчётов",       value: SIMULATIONS.length, icon: "FlaskConical", color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Выполнено",      value: 2,                  icon: "CheckCircle",  color: "text-green-600",  bg: "bg-green-50" },
          { label: "Требуют внимания",value: 1,                 icon: "AlertTriangle",color: "text-red-500",    bg: "bg-red-50" },
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
          <span className="text-sm font-semibold text-foreground">Симуляции</span>
        </div>
        <div className="divide-y divide-border">
          {SIMULATIONS.map((s) => {
            const cfg = STATUS[s.status];
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="FlaskConical" size={16} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.type}{s.result !== "—" ? ` · ${s.result}` : ""}</div>
                </div>
                {s.stress > 0 && (
                  <div className="w-20 hidden sm:block">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.stress > 80 ? "bg-red-400" : "bg-green-400"}`}
                        style={{ width: `${s.stress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 text-right">{s.stress}%</div>
                  </div>
                )}
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                  <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={11} />
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}