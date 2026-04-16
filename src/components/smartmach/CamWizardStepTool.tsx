import Icon from "@/components/ui/icon";
import {
  WIZARD_MATERIALS, WIZARD_TOOLS, OPERATION_LABELS,
  type OperationType,
} from "@/components/smartmach/cam.wizard.data";

interface Props {
  // step 1 – tool
  toolIdx: number;
  diameter: number;
  flutes: number;
  isCarbide: boolean;
  onToolIdx: (i: number) => void;
  onDiameter: (d: number) => void;
  onFlutes: (z: number) => void;
  onIsCarbide: (v: boolean) => void;
  // step 2 – operation
  operation: OperationType;
  availableOps: OperationType[];
  onOperation: (op: OperationType) => void;
  // preview data (step 2)
  material: string;
  // which sub-step to show
  subStep: 1 | 2;
}

export default function CamWizardStepTool({
  toolIdx, diameter, flutes, isCarbide,
  onToolIdx, onDiameter, onFlutes, onIsCarbide,
  operation, availableOps, onOperation,
  material, subStep,
}: Props) {
  const selectedTool = WIZARD_TOOLS[toolIdx];
  const selectedMat = WIZARD_MATERIALS[material];

  if (subStep === 1) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">Параметры инструмента:</p>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Тип инструмента</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {WIZARD_TOOLS.map((t, i) => (
              <button key={t.type} onClick={() => { onToolIdx(i); onDiameter(0); }}
                className={`p-2.5 rounded-lg border-2 text-left transition-all ${toolIdx === i
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"}`}>
                <div className="flex items-center gap-2">
                  <Icon name={t.icon as "Drill"} size={16} className={toolIdx === i ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-xs font-medium leading-tight">{t.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Диаметр инструмента, мм</label>
          <div className="flex flex-wrap gap-2">
            {selectedTool.diameters.map((d) => (
              <button key={d} onClick={() => onDiameter(d)}
                className={`w-12 h-10 rounded-lg border-2 text-sm font-medium transition-all ${diameter === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/40"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Количество зубьев</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((z) => (
                <button key={z} onClick={() => onFlutes(z)}
                  className={`w-9 h-9 rounded-lg border-2 text-sm font-medium transition-all ${flutes === z
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40"}`}>
                  {z}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Материал инструмента</label>
            <div className="flex gap-2">
              {[
                { label: "Твёрдый сплав (HM)", value: true },
                { label: "HSS / быстрорез",    value: false },
              ].map(({ label, value }) => (
                <button key={String(value)} onClick={() => onIsCarbide(value)}
                  className={`flex-1 py-2 px-2 rounded-lg border-2 text-xs font-medium transition-all ${isCarbide === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/30 text-muted-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // subStep === 2 — operation
  const descriptions: Record<string, string> = {
    roughing:       "Максимальный съём, черновой припуск 0.5–2 мм",
    semi_finishing: "Подготовка под чистовую, припуск 0.2–0.5 мм",
    finishing:      "Финишная обработка по размеру, Rz 3.2–6.3",
    drilling:       "Сверление отверстий по диаметру",
    threading:      "Нарезание резьбы фрезой",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">Тип операции:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {availableOps.map((op) => (
          <button key={op} onClick={() => onOperation(op)}
            className={`text-left p-3.5 rounded-xl border-2 transition-all ${operation === op
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30"}`}>
            <p className="text-sm font-semibold">{OPERATION_LABELS[op]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{descriptions[op]}</p>
          </button>
        ))}
      </div>

      {selectedMat && diameter > 0 && (
        <div className="bg-secondary/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">Предварительный расчёт:</p>
          <p>Материал: <b>{material}</b> · {selectedMat.hardness}</p>
          <p>Инструмент: <b>{selectedTool.label} Ø{diameter} мм</b>, {flutes} зуб., {isCarbide ? "HM" : "HSS"}</p>
          <p>Ожидаемая Vc ≈ <b>{isCarbide ? Math.round(selectedMat.vcBase * selectedMat.carbideK) : selectedMat.vcBase} м/мин</b></p>
        </div>
      )}
    </div>
  );
}
