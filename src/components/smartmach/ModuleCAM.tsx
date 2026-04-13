import Icon from "@/components/ui/icon";

const PROGRAMS = [
  { id: 1, name: "Фрезеровка корпуса",    machine: "DMG Mori",    time: "2ч 14м", status: "running" },
  { id: 2, name: "Токарная обработка вала", machine: "Haas ST-20",  time: "45м",    status: "done" },
  { id: 3, name: "Сверловка фланца",       machine: "Mazak VTC",   time: "30м",    status: "queue" },
  { id: 4, name: "Финишная шлифовка",      machine: "DMG Mori",    time: "1ч 05м", status: "queue" },
];

const STATUS = {
  running: { label: "В работе",  color: "text-blue-600",  bg: "bg-blue-50 border-blue-200" },
  done:    { label: "Готово",    color: "text-green-600", bg: "bg-green-50 border-green-200" },
  queue:   { label: "Очередь",   color: "text-yellow-600",bg: "bg-yellow-50 border-yellow-200" },
};

export default function ModuleCAM() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CAM — Управление обработкой</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Программы ЧПУ и загрузка станков</p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold text-foreground">Очередь программ</span>
        </div>
        <div className="divide-y divide-border">
          {PROGRAMS.map((p) => {
            const cfg = STATUS[p.status];
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="FileCode" size={16} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.machine} · {p.time}</div>
                </div>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
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