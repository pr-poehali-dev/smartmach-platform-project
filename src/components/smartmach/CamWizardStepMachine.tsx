import { type Machine } from "@/lib/manufacture";

interface Props {
  machines: Machine[];
  machineId: string;
  manualPower: string;
  manualSpindle: string;
  onMachineId: (id: string) => void;
  onManualPower: (v: string) => void;
  onManualSpindle: (v: string) => void;
}

export default function CamWizardStepMachine({
  machines, machineId, manualPower, manualSpindle,
  onMachineId, onManualPower, onManualSpindle,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">Выберите станок и укажите его характеристики:</p>

      {machines.length > 0 ? (
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Станок из справочника</label>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
            {machines.map((m) => (
              <button key={m.id} onClick={() => onMachineId(String(m.id))}
                className={`text-left p-3 rounded-xl border-2 transition-all ${machineId === String(m.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                    ${m.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {m.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => onMachineId("")}
            className="text-xs text-muted-foreground mt-1 hover:text-foreground underline-offset-2 hover:underline">
            Без привязки к станку
          </button>
        </div>
      ) : (
        <div className="bg-secondary/40 rounded-xl p-3 text-sm text-muted-foreground">
          Станки не найдены в справочнике — введите параметры вручную.
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Характеристики станка
          <span className="ml-1 normal-case font-normal">(для проверки режимов)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Мощность шпинделя, кВт</label>
            <input
              type="number" min="0" step="0.5" value={manualPower}
              onChange={(e) => onManualPower(e.target.value)}
              placeholder="18"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Макс. обороты, об/мин</label>
            <input
              type="number" min="0" step="100" value={manualSpindle}
              onChange={(e) => onManualSpindle(e.target.value)}
              placeholder="8000"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Характеристики не обязательны — без них режимы будут рассчитаны без проверки ограничений станка.
      </p>
    </div>
  );
}
