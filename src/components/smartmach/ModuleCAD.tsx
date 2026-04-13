import { useState } from "react";
import Icon from "@/components/ui/icon";

const PARTS = [
  { id: 1, name: "Корпус редуктора", status: "ok",      updated: "сегодня 08:14", version: "v3.2", collisions: 0 },
  { id: 2, name: "Вал промежуточный", status: "warn",   updated: "вчера 17:40",   version: "v1.8", collisions: 2 },
  { id: 3, name: "Крышка подшипника", status: "ok",     updated: "сегодня 06:55", version: "v2.0", collisions: 0 },
  { id: 4, name: "Шестерня Z=32",     status: "error",  updated: "2 дня назад",   version: "v4.1", collisions: 5 },
  { id: 5, name: "Фланец входной",    status: "ok",     updated: "сегодня 09:22", version: "v1.3", collisions: 0 },
];

const STATUS_CONFIG = {
  ok:    { label: "ОК",      color: "text-green-600",  bg: "bg-green-50  border-green-200",  icon: "CheckCircle" },
  warn:  { label: "Предупр.",color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: "AlertTriangle" },
  error: { label: "Ошибка",  color: "text-red-600",    bg: "bg-red-50    border-red-200",    icon: "XCircle" },
};

export default function ModuleCAD() {
  const [selected, setSelected] = useState<number | null>(null);
  const part = PARTS.find((p) => p.id === selected);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CAD — 3D-моделирование</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Управление деталями и проверка коллизий</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} />
          Новая деталь
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Всего деталей",    value: PARTS.length,                                               icon: "Box",          color: "text-blue-600",  bg: "bg-blue-50" },
          { label: "Коллизии",         value: PARTS.reduce((a, p) => a + p.collisions, 0),               icon: "AlertTriangle", color: "text-red-500",   bg: "bg-red-50" },
          { label: "Деталей без ошибок",value: PARTS.filter((p) => p.status === "ok").length,            icon: "CheckCircle",  color: "text-green-600", bg: "bg-green-50" },
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
        {/* Parts list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold text-foreground">Библиотека деталей</span>
          </div>
          <div className="divide-y divide-border">
            {PARTS.map((p) => {
              const cfg = STATUS_CONFIG[p.status];
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p.id === selected ? null : p.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary/40 ${selected === p.id ? "bg-primary/5" : ""}`}
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Box" size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.version} · {p.updated}</div>
                  </div>
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                    <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={11} />
                    {p.collisions > 0 ? `${p.collisions} колл.` : cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <span className="text-sm font-semibold text-foreground">Детали</span>
          </div>
          {part ? (
            <div className="p-4 space-y-4">
              <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center">
                <Icon name="Box" size={56} className="text-blue-300" />
              </div>
              <div className="space-y-2">
                <div className="text-base font-bold text-foreground">{part.name}</div>
                {[
                  { k: "Версия",   v: part.version },
                  { k: "Обновлено", v: part.updated },
                  { k: "Коллизии", v: part.collisions > 0 ? `${part.collisions} обнаружено` : "Нет" },
                  { k: "Статус",   v: STATUS_CONFIG[part.status].label },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-primary text-primary-foreground text-xs py-2 rounded-lg hover:opacity-90 transition-opacity">Открыть</button>
                <button className="flex-1 border border-border text-xs py-2 rounded-lg hover:bg-secondary/60 transition-colors">Экспорт</button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Icon name="MousePointerClick" size={32} className="mx-auto mb-2 opacity-30" />
              Выберите деталь из списка
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
