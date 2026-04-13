import { useState } from "react";
import Icon from "@/components/ui/icon";

const MACHINES = [
  { id: 1, name: "DMG Mori NLX 2500",  type: "Токарный",    status: "running", load: 78, program: "shaft_v3.nc",   remaining: "1ч 22м" },
  { id: 2, name: "Haas VF-2",           type: "Фрезерный",   status: "idle",    load: 0,  program: "—",             remaining: "—" },
  { id: 3, name: "Mazak Integrex 300",  type: "Токарно-фрез.",status: "running", load: 55, program: "flange_v1.nc",  remaining: "38м" },
  { id: 4, name: "Okuma LB3000",        type: "Токарный",    status: "alarm",   load: 0,  program: "gear_v4.nc",    remaining: "—" },
];

const STATUS = {
  running: { label: "Работает", color: "text-green-600",  bg: "bg-green-50 border-green-200",  dot: "bg-green-500" },
  idle:    { label: "Простой",  color: "text-gray-500",   bg: "bg-gray-50 border-gray-200",    dot: "bg-gray-400" },
  alarm:   { label: "Авария",   color: "text-red-600",    bg: "bg-red-50 border-red-200",      dot: "bg-red-500" },
};

export default function ModuleCNC() {
  const [selected, setSelected] = useState<number | null>(null);
  const machine = MACHINES.find((m) => m.id === selected);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CNC — Мониторинг станков</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Состояние оборудования</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Всего станков", value: MACHINES.length, icon: "Cpu",          color: "text-blue-600",  bg: "bg-blue-50" },
          { label: "В работе",      value: 2,               icon: "Activity",     color: "text-green-600", bg: "bg-green-50" },
          { label: "Аварии",        value: 1,               icon: "AlertTriangle",color: "text-red-500",   bg: "bg-red-50" },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold text-foreground">Оборудование</span>
          </div>
          <div className="divide-y divide-border">
            {MACHINES.map((m) => {
              const cfg = STATUS[m.status];
              return (
                <div
                  key={m.id}
                  onClick={() => setSelected(m.id === selected ? null : m.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors ${selected === m.id ? "bg-primary/5" : ""}`}
                >
                  <div className="relative w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Cpu" size={16} className="text-blue-600" />
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${cfg.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.type}{m.program !== "—" ? ` · ${m.program}` : ""}</div>
                  </div>
                  {m.load > 0 && (
                    <div className="w-16 hidden sm:block">
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.load}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 text-right">{m.load}%</div>
                    </div>
                  )}
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold text-foreground">Детали</span>
          </div>
          {machine ? (
            <div className="p-4 space-y-3">
              <div className="text-base font-bold text-foreground">{machine.name}</div>
              {[
                { k: "Тип",          v: machine.type },
                { k: "Статус",       v: STATUS[machine.status].label },
                { k: "Программа",    v: machine.program },
                { k: "Осталось",     v: machine.remaining },
                { k: "Загрузка",     v: machine.load > 0 ? `${machine.load}%` : "—" },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-foreground">{v}</span>
                </div>
              ))}
              {machine.status === "alarm" && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-1.5">
                  <Icon name="AlertTriangle" size={13} />
                  Требуется вмешательство оператора
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="MousePointerClick" size={32} className="mx-auto mb-2 opacity-30" />
              Выберите станок
            </div>
          )}
        </div>
      </div>
    </div>
  );
}