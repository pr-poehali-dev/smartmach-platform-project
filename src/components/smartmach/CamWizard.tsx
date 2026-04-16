import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import {
  WIZARD_TOOLS, OPERATION_LABELS, calcCuttingParams,
  type OperationType, type ToolType, type CuttingResult,
} from "@/components/smartmach/cam.wizard.data";
import { type Machine } from "@/lib/manufacture";
import CamWizardStepMaterial from "@/components/smartmach/CamWizardStepMaterial";
import CamWizardStepTool     from "@/components/smartmach/CamWizardStepTool";
import CamWizardStepMachine  from "@/components/smartmach/CamWizardStepMachine";
import CamWizardStepResult   from "@/components/smartmach/CamWizardStepResult";

interface Props {
  machines: Machine[];
  onClose: () => void;
  onApply?: (params: {
    material: string;
    tool_name: string;
    tool_diameter: string;
    spindle_speed: string;
    feed_rate: string;
    depth_of_cut: string;
    code: string;
    machine_id?: string;
  }) => void;
}

const STEPS = ["Материал", "Инструмент", "Операция", "Станок", "Результат"] as const;

/** Извлекает число кВт из строки вида "18 кВт", "18.5кВт", "18" */
function parsePowerKw(s: string): number | null {
  const m = s.replace(",", ".").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

/** Извлекает макс. обороты из строки вида "18 000 об/мин", "8000", "6 000 rpm" */
function parseSpindleSpeed(s: string): number | null {
  const clean = s.replace(/\s/g, "").replace(",", ".");
  const m = clean.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export default function CamWizard({ machines, onClose, onApply }: Props) {
  const [step, setStep] = useState(0);

  // Step 0 – Material
  const [material, setMaterial] = useState("");

  // Step 1 – Tool
  const [toolIdx, setToolIdx] = useState(0);
  const [diameter, setDiameter] = useState(0);
  const [flutes, setFlutes] = useState(4);
  const [isCarbide, setIsCarbide] = useState(true);

  // Step 2 – Operation
  const [operation, setOperation] = useState<OperationType>("roughing");

  // Step 3 – Machine
  const [machineId, setMachineId] = useState<string>("");
  const [manualPower, setManualPower] = useState("");
  const [manualSpindle, setManualSpindle] = useState("");

  // Step 4 – Result
  const [result, setResult] = useState<CuttingResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedTool = WIZARD_TOOLS[toolIdx];
  const selectedMachine = machines.find((m) => String(m.id) === machineId) ?? null;

  const availableOps = useMemo(() => selectedTool?.operations ?? [], [toolIdx]);

  const machinePowerKw   = parsePowerKw(manualPower) ?? null;
  const machineSpindleMax = parseSpindleSpeed(manualSpindle) ?? null;

  function handleNextFromTool() {
    if (!diameter) return;
    setFlutes(selectedTool.defaultFlutes);
    setOperation(availableOps[0] as OperationType);
    setStep(2);
  }

  function handleCalculate() {
    try {
      const r = calcCuttingParams(material, selectedTool.type as ToolType, diameter, flutes, operation, isCarbide);
      setResult(r);
      setStep(4);
    } catch {
      alert("Ошибка расчёта. Проверьте параметры.");
    }
  }

  // Проверка ограничений станка
  const spindleWarning = result && machineSpindleMax && result.n > machineSpindleMax
    ? { type: "error" as const, n: Math.round(machineSpindleMax), vf: Math.round(result.vf * (machineSpindleMax / result.n)) }
    : null;
  const powerWarning = result && machinePowerKw && result.powerKw > machinePowerKw * 0.8
    ? { type: result.powerKw > machinePowerKw ? "error" : "warn" } as const
    : null;

  const effectiveN  = spindleWarning ? spindleWarning.n  : result?.n  ?? 0;
  const effectiveVf = spindleWarning ? spindleWarning.vf : result?.vf ?? 0;

  function buildGcode(): string {
    if (!result) return "";
    const n  = effectiveN;
    const vf = effectiveVf;
    const machineLine = selectedMachine ? `; Станок: ${selectedMachine.name}` : "";
    return [
      `; === Режимы резания (${OPERATION_LABELS[operation]}) ===`,
      `; Материал: ${material} | Инструмент: Ø${diameter} мм (${flutes} зуб.)`,
      machineLine,
      `; Vc=${result.vc} м/мин | n=${n} об/мин | Vf=${vf} мм/мин`,
      `; ap=${result.ap} мм | ae=${result.ae} мм | MRR=${result.mrr} см³/мин`,
      ``,
      `G21 G90 G54`,
      `T01 M06  ; ${isCarbide ? "Твёрдосплавная" : "HSS"} фреза Ø${diameter}`,
      `S${n} M03  ; Обороты шпинделя`,
      `G00 Z5.0`,
      `G00 X0 Y0`,
      `G01 Z-${result.ap} F${Math.round(vf * 0.3)}  ; Врезание`,
      `G01 X100 F${vf}  ; Рабочий ход`,
      `G00 Z50.0`,
      `M05 M09`,
      `M30`,
    ].filter(Boolean).join("\n");
  }

  function handleApply() {
    if (!result) return;
    onApply?.({
      material,
      tool_name:     `${selectedTool.label} Ø${diameter} Z${flutes}`,
      tool_diameter: String(diameter),
      spindle_speed: String(effectiveN),
      feed_rate:     String(effectiveVf),
      depth_of_cut:  String(result.ap),
      code:          buildGcode(),
      machine_id:    machineId || undefined,
    });
    onClose();
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildGcode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleNext() {
    if (step === 0 && material)  { setStep(1); return; }
    if (step === 1)              { handleNextFromTool(); return; }
    if (step === 2)              { setStep(3); return; }
    if (step === 3)              { handleCalculate(); return; }
  }

  const nextDisabled = (step === 0 && !material) || (step === 1 && !diameter);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Icon name="Zap" size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Мастер режимов резания</p>
              <p className="text-xs text-muted-foreground">Автоматический подбор режимов по ГОСТ 25762</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                  ${i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {i < step ? <Icon name="Check" size={14} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 0 && (
            <CamWizardStepMaterial material={material} onSelect={setMaterial} />
          )}
          {step === 1 && (
            <CamWizardStepTool
              subStep={1}
              toolIdx={toolIdx} diameter={diameter} flutes={flutes} isCarbide={isCarbide}
              onToolIdx={setToolIdx} onDiameter={setDiameter} onFlutes={setFlutes} onIsCarbide={setIsCarbide}
              operation={operation} availableOps={availableOps as OperationType[]}
              onOperation={setOperation} material={material}
            />
          )}
          {step === 2 && (
            <CamWizardStepTool
              subStep={2}
              toolIdx={toolIdx} diameter={diameter} flutes={flutes} isCarbide={isCarbide}
              onToolIdx={setToolIdx} onDiameter={setDiameter} onFlutes={setFlutes} onIsCarbide={setIsCarbide}
              operation={operation} availableOps={availableOps as OperationType[]}
              onOperation={setOperation} material={material}
            />
          )}
          {step === 3 && (
            <CamWizardStepMachine
              machines={machines}
              machineId={machineId} manualPower={manualPower} manualSpindle={manualSpindle}
              onMachineId={setMachineId} onManualPower={setManualPower} onManualSpindle={setManualSpindle}
            />
          )}
          {step === 4 && result && (
            <CamWizardStepResult
              result={result}
              effectiveN={effectiveN} effectiveVf={effectiveVf}
              machinePowerKw={machinePowerKw} machineSpindleMax={machineSpindleMax}
              selectedMachine={selectedMachine}
              spindleWarning={spindleWarning} powerWarning={powerWarning}
              gcode={buildGcode()} copied={copied}
              onCopy={handleCopy}
              onApply={onApply ? handleApply : undefined}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
            <Icon name="ChevronLeft" size={16} />
            {step === 0 ? "Отмена" : "Назад"}
          </button>

          {step < 4 && (
            <button onClick={handleNext} disabled={nextDisabled}
              className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 font-medium transition-opacity">
              {step === 3
                ? <><Icon name="Zap" size={16} />Рассчитать</>
                : <>Далее<Icon name="ChevronRight" size={16} /></>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
