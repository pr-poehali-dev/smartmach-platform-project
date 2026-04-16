import Icon from "@/components/ui/icon";
import { type Machine as EquipmentMachine } from "@/components/smartmach/equipment.types";

interface Props {
  machines: EquipmentMachine[];
  machineId: string;
  onMachineId: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  active:          "Работает",
  maintenance:     "Обслуживание",
  idle:            "Простой",
  decommissioned:  "Списан",
};

export default function CamWizardStepMachine({ machines, machineId, onMachineId }: Props) {
  const selected = machines.find((m) => String(m.id) === machineId) ?? null;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">Выберите станок для обработки:</p>

      {machines.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
          {machines.map((m) => (
            <button key={m.id} onClick={() => onMachineId(String(m.id))}
              className={`text-left p-3 rounded-xl border-2 transition-all ${machineId === String(m.id)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{m.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                  ${m.status === "active" ? "bg-green-100 text-green-700"
                  : m.status === "maintenance" ? "bg-amber-100 text-amber-700"
                  : m.status === "idle" ? "bg-gray-100 text-gray-500"
                  : "bg-red-100 text-red-600"}`}>
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{m.model} · {m.manufacturer}</p>
              <div className="flex gap-3 mt-1.5">
                {m.power && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Icon name="Zap" size={10} className="text-amber-500" />
                    {m.power}
                  </span>
                )}
                {m.spindleSpeed && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Icon name="RefreshCw" size={10} className="text-blue-500" />
                    {m.spindleSpeed}
                  </span>
                )}
                {m.axes > 0 && (
                  <span className="text-[11px] text-muted-foreground">{m.axes} ос.</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-secondary/40 rounded-xl p-3 text-sm text-muted-foreground">
          Станки не найдены в справочнике оборудования.
        </div>
      )}

      {machineId && (
        <button onClick={() => onMachineId("")}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
          Без привязки к станку
        </button>
      )}

      {/* Карточка выбранного станка */}
      {selected && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Параметры станка</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { label: "Мощность",          value: selected.power,        icon: "Zap" },
              { label: "Макс. обороты",      value: selected.spindleSpeed, icon: "RefreshCw" },
              { label: "Система ЧПУ",        value: selected.controlSystem,icon: "Cpu" },
              { label: "Количество осей",    value: selected.axes ? `${selected.axes} оси` : null, icon: "Move3d" },
              { label: "Ход X / Y / Z",      value: [selected.travelX, selected.travelY, selected.travelZ].filter(Boolean).join(" / ") || null, icon: "Maximize" },
              { label: "Ёмкость инструмента",value: selected.toolCapacity ? `${selected.toolCapacity} инстр.` : null, icon: "Wrench" },
            ].filter(({ value }) => value).map(({ label, value, icon }) => (
              <div key={label} className="flex items-start gap-1.5">
                <Icon name={icon as "Zap"} size={12} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-primary/70">
            Мощность и обороты будут использованы для проверки режимов резания
          </p>
        </div>
      )}

      {!machineId && (
        <p className="text-xs text-muted-foreground">
          Выбор станка не обязателен — без него режимы рассчитаются без проверки ограничений.
        </p>
      )}
    </div>
  );
}
