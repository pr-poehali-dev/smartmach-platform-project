import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import {
  WIZARD_MATERIALS, WIZARD_TOOLS, OPERATION_LABELS, calcCuttingParams,
  type OperationType, type ToolType, type CuttingResult,
} from "@/components/smartmach/cam.wizard.data";
import { type Machine } from "@/lib/manufacture";

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
  const selectedMat = WIZARD_MATERIALS[material];
  const selectedMachine = machines.find((m) => String(m.id) === machineId) ?? null;

  const availableOps = useMemo(() => selectedTool?.operations ?? [], [toolIdx]);

  // Мощность и обороты станка (из данных или ручной ввод)
  const machinePowerKw = parsePowerKw(manualPower) ?? null;
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

  function handleApply() {
    if (!result) return;
    onApply?.({
      material,
      tool_name: `${selectedTool.label} Ø${diameter} Z${flutes}`,
      tool_diameter: String(diameter),
      spindle_speed: String(effectiveN ?? result.n),
      feed_rate: String(effectiveVf ?? result.vf),
      depth_of_cut: String(result.ap),
      code: buildGcode(),
      machine_id: machineId || undefined,
    });
    onClose();
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildGcode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Проверка ограничений станка
  const spindleWarning = result && machineSpindleMax && result.n > machineSpindleMax
    ? { type: "error" as const, n: Math.round(machineSpindleMax), vf: Math.round(result.vf * (machineSpindleMax / result.n)) }
    : null;
  const powerWarning = result && machinePowerKw && result.powerKw > machinePowerKw * 0.8
    ? { type: result.powerKw > machinePowerKw ? "error" : "warn" } as const
    : null;

  const effectiveN = spindleWarning ? spindleWarning.n : result?.n ?? null;
  const effectiveVf = spindleWarning ? spindleWarning.vf : result?.vf ?? null;

  function buildGcode(): string {
    if (!result) return "";
    const n = effectiveN ?? result.n;
    const vf = effectiveVf ?? result.vf;
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

          {/* Step 0: Материал */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground mb-3">Выберите обрабатываемый материал:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(WIZARD_MATERIALS).map(([key, mat]) => (
                  <button key={key} onClick={() => setMaterial(key)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${material === key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-secondary/40"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{mat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${mat.color}`}>
                        {mat.group === "steel_soft" ? "Сталь" : mat.group === "steel_hard" ? "Сталь+" :
                          mat.group === "stainless" ? "Нерж." : mat.group === "aluminum" ? "Al" :
                          mat.group === "titanium" ? "Ti" : mat.group === "cast_iron" ? "Чугун" :
                          mat.group === "copper" ? "Cu" : "Пл."}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[11px] text-muted-foreground">{mat.hardness}</span>
                      <span className="text-[11px] text-muted-foreground">Vc≈{mat.vcBase}–{Math.round(mat.vcBase * mat.carbideK)} м/мин</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">СОЖ: {mat.coolant}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Инструмент */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Параметры инструмента:</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Тип инструмента</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WIZARD_TOOLS.map((t, i) => (
                    <button key={t.type} onClick={() => { setToolIdx(i); setDiameter(0); }}
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
                    <button key={d} onClick={() => setDiameter(d)}
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
                      <button key={z} onClick={() => setFlutes(z)}
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
                      { label: "HSS / быстрорез", value: false },
                    ].map(({ label, value }) => (
                      <button key={String(value)} onClick={() => setIsCarbide(value)}
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
          )}

          {/* Step 2: Операция */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Тип операции:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableOps.map((op) => {
                  const descriptions: Record<string, string> = {
                    roughing:       "Максимальный съём, черновой припуск 0.5–2 мм",
                    semi_finishing: "Подготовка под чистовую, припуск 0.2–0.5 мм",
                    finishing:      "Финишная обработка по размеру, Rz 3.2–6.3",
                    drilling:       "Сверление отверстий по диаметру",
                    threading:      "Нарезание резьбы фрезой",
                  };
                  return (
                    <button key={op} onClick={() => setOperation(op as OperationType)}
                      className={`text-left p-3.5 rounded-xl border-2 transition-all ${operation === op
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"}`}>
                      <p className="text-sm font-semibold">{OPERATION_LABELS[op as OperationType]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{descriptions[op]}</p>
                    </button>
                  );
                })}
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
          )}

          {/* Step 3: Станок */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Выберите станок и укажите его характеристики:</p>

              {/* Machine list */}
              {machines.length > 0 ? (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Станок из справочника</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                    {machines.map((m) => (
                      <button key={m.id} onClick={() => setMachineId(String(m.id))}
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
                  <button onClick={() => setMachineId("")}
                    className="text-xs text-muted-foreground mt-1 hover:text-foreground underline-offset-2 hover:underline">
                    Без привязки к станку
                  </button>
                </div>
              ) : (
                <div className="bg-secondary/40 rounded-xl p-3 text-sm text-muted-foreground">
                  Станки не найдены в справочнике — введите параметры вручную.
                </div>
              )}

              {/* Manual specs */}
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
                      onChange={(e) => setManualPower(e.target.value)}
                      placeholder="18"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Макс. обороты, об/мин</label>
                    <input
                      type="number" min="0" step="100" value={manualSpindle}
                      onChange={(e) => setManualSpindle(e.target.value)}
                      placeholder="8000"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* Skip hint */}
              <p className="text-xs text-muted-foreground">
                Характеристики не обязательны — без них режимы будут рассчитаны без проверки ограничений станка.
              </p>
            </div>
          )}

          {/* Step 4: Результат */}
          {step === 4 && result && (
            <div className="space-y-4">

              {/* Machine warnings */}
              {spindleWarning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <Icon name="AlertTriangle" size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">Обороты превышают лимит станка</p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Расчётные {result.n} об/мин &gt; {machineSpindleMax} об/мин.
                      Режимы автоматически снижены: n={spindleWarning.n} об/мин, Vf={spindleWarning.vf} мм/мин.
                    </p>
                  </div>
                </div>
              )}
              {powerWarning && (
                <div className={`flex items-start gap-2 rounded-xl p-3 border ${powerWarning.type === "error"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"}`}>
                  <Icon name={powerWarning.type === "error" ? "XCircle" : "AlertTriangle"} size={16}
                    className={`${powerWarning.type === "error" ? "text-red-600" : "text-amber-600"} mt-0.5 shrink-0`} />
                  <div className="text-sm">
                    <p className={`font-semibold ${powerWarning.type === "error" ? "text-red-800" : "text-amber-800"}`}>
                      {powerWarning.type === "error" ? "Мощность резания превышает мощность станка" : "Режимы близки к пределу мощности станка"}
                    </p>
                    <p className={`text-xs mt-0.5 ${powerWarning.type === "error" ? "text-red-700" : "text-amber-700"}`}>
                      Требуется {result.powerKw} кВт, доступно {machinePowerKw} кВт.
                      {powerWarning.type === "error" && " Рекомендуется уменьшить ширину или глубину резания."}
                    </p>
                  </div>
                </div>
              )}
              {selectedMachine && !spindleWarning && !powerWarning && (machinePowerKw || machineSpindleMax) && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                  <Icon name="CheckCircle" size={16} className="text-green-600 shrink-0" />
                  <p className="text-sm text-green-800">
                    Режимы соответствуют возможностям станка <b>{selectedMachine.name}</b>
                  </p>
                </div>
              )}

              {/* Params grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Скорость резания", value: `${result.vc} м/мин`,          icon: "Gauge",     color: "text-blue-600" },
                  { label: "Обороты шпинделя", value: `${effectiveN} об/мин`,         icon: "RefreshCw", color: "text-purple-600", capped: !!spindleWarning },
                  { label: "Скорость подачи",  value: `${effectiveVf} мм/мин`,        icon: "MoveRight", color: "text-green-600",  capped: !!spindleWarning },
                  { label: "Глубина резания",  value: `${result.ap} мм`,             icon: "ArrowDown", color: "text-orange-600" },
                  { label: "Ширина резания",   value: `${result.ae} мм`,             icon: "ArrowRight", color: "text-amber-600" },
                  { label: "Подача на зуб",    value: `${result.fz} мм/зуб`,        icon: "Settings",  color: "text-gray-600" },
                ].map(({ label, value, icon, color, capped }) => (
                  <div key={label} className={`rounded-xl p-3 ${capped ? "bg-amber-50 border border-amber-200" : "bg-secondary/30"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name={icon as "Gauge"} size={14} className={color} />
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      {capped && <Icon name="ArrowDown" size={11} className="text-amber-500" />}
                    </div>
                    <p className="text-lg font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {/* MRR + Power + Tool life */}
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-700 mb-0.5">Производительность</p>
                  <p className="text-xl font-bold text-green-800">{result.mrr} см³/мин</p>
                  <p className="text-[10px] text-green-600">Material Removal Rate</p>
                </div>
                <div className={`flex-1 rounded-xl p-3 text-center border ${result.powerKw > (machinePowerKw ?? Infinity)
                  ? "bg-red-50 border-red-200"
                  : result.powerKw > (machinePowerKw ?? Infinity) * 0.8
                    ? "bg-amber-50 border-amber-200"
                    : "bg-blue-50 border-blue-200"}`}>
                  <p className="text-xs text-blue-700 mb-0.5">
                    Мощность резания
                    {machinePowerKw && <span className="ml-1 opacity-70">/ {machinePowerKw} кВт</span>}
                  </p>
                  <p className="text-xl font-bold text-blue-800">{result.powerKw} кВт</p>
                  <p className="text-[10px] text-blue-600">Ориентировочно</p>
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-700 mb-0.5">Стойкость</p>
                  <p className="text-base font-bold text-amber-800 leading-tight mt-1">{result.toolLife}</p>
                  <p className="text-[10px] text-amber-600">Инструмент</p>
                </div>
              </div>

              {/* G-code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Готовый G-код</p>
                  <button onClick={handleCopy}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg border border-border hover:bg-secondary transition-colors">
                    <Icon name={copied ? "Check" : "Copy"} size={12} className={copied ? "text-green-600" : ""} />
                    {copied ? "Скопировано!" : "Копировать"}
                  </button>
                </div>
                <pre className="bg-gray-950 text-green-400 text-xs rounded-xl p-4 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                  {buildGcode()}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
            <Icon name="ChevronLeft" size={16} />
            {step === 0 ? "Отмена" : "Назад"}
          </button>

          <div className="flex gap-2">
            {step === 4 && onApply && (
              <button onClick={handleApply}
                className="flex items-center gap-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">
                <Icon name="Download" size={16} />
                Применить в программу
              </button>
            )}
            {step < 4 && (
              <button
                onClick={() => {
                  if (step === 0 && material) setStep(1);
                  else if (step === 1) handleNextFromTool();
                  else if (step === 2) setStep(3);
                  else if (step === 3) handleCalculate();
                }}
                disabled={(step === 0 && !material) || (step === 1 && !diameter)}
                className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 font-medium transition-opacity">
                {step === 3 ? (
                  <><Icon name="Zap" size={16} />Рассчитать</>
                ) : (
                  <>Далее<Icon name="ChevronRight" size={16} /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
