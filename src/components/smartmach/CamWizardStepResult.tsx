import Icon from "@/components/ui/icon";
import { type CuttingResult } from "@/components/smartmach/cam.wizard.data";
import { type Machine } from "@/lib/manufacture";

interface Props {
  result: CuttingResult;
  effectiveN: number;
  effectiveVf: number;
  machinePowerKw: number | null;
  machineSpindleMax: number | null;
  selectedMachine: Machine | null;
  spindleWarning: { type: "error"; n: number; vf: number } | null;
  powerWarning: { type: "error" | "warn" } | null;
  gcode: string;
  copied: boolean;
  onCopy: () => void;
  onApply?: () => void;
}

export default function CamWizardStepResult({
  result, effectiveN, effectiveVf,
  machinePowerKw, machineSpindleMax,
  selectedMachine, spindleWarning, powerWarning,
  gcode, copied, onCopy, onApply,
}: Props) {
  return (
    <div className="space-y-4">

      {/* Spindle warning */}
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

      {/* Power warning */}
      {powerWarning && (
        <div className={`flex items-start gap-2 rounded-xl p-3 border ${powerWarning.type === "error"
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"}`}>
          <Icon name={powerWarning.type === "error" ? "XCircle" : "AlertTriangle"} size={16}
            className={`${powerWarning.type === "error" ? "text-red-600" : "text-amber-600"} mt-0.5 shrink-0`} />
          <div className="text-sm">
            <p className={`font-semibold ${powerWarning.type === "error" ? "text-red-800" : "text-amber-800"}`}>
              {powerWarning.type === "error"
                ? "Мощность резания превышает мощность станка"
                : "Режимы близки к пределу мощности станка"}
            </p>
            <p className={`text-xs mt-0.5 ${powerWarning.type === "error" ? "text-red-700" : "text-amber-700"}`}>
              Требуется {result.powerKw} кВт, доступно {machinePowerKw} кВт.
              {powerWarning.type === "error" && " Рекомендуется уменьшить ширину или глубину резания."}
            </p>
          </div>
        </div>
      )}

      {/* All-ok banner */}
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
          { label: "Скорость резания", value: `${result.vc} м/мин`,   icon: "Gauge",     color: "text-blue-600",   capped: false },
          { label: "Обороты шпинделя", value: `${effectiveN} об/мин`, icon: "RefreshCw", color: "text-purple-600", capped: !!spindleWarning },
          { label: "Скорость подачи",  value: `${effectiveVf} мм/мин`,icon: "MoveRight", color: "text-green-600",  capped: !!spindleWarning },
          { label: "Глубина резания",  value: `${result.ap} мм`,      icon: "ArrowDown", color: "text-orange-600", capped: false },
          { label: "Ширина резания",   value: `${result.ae} мм`,      icon: "ArrowRight",color: "text-amber-600",  capped: false },
          { label: "Подача на зуб",    value: `${result.fz} мм/зуб`,  icon: "Settings",  color: "text-gray-600",   capped: false },
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
          <button onClick={onCopy}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg border border-border hover:bg-secondary transition-colors">
            <Icon name={copied ? "Check" : "Copy"} size={12} className={copied ? "text-green-600" : ""} />
            {copied ? "Скопировано!" : "Копировать"}
          </button>
        </div>
        <pre className="bg-gray-950 text-green-400 text-xs rounded-xl p-4 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
          {gcode}
        </pre>
      </div>

      {/* Apply button (inside content area for convenience, footer also has it) */}
      {onApply && (
        <button onClick={onApply}
          className="w-full flex items-center justify-center gap-2 text-sm bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors font-medium">
          <Icon name="Download" size={16} />
          Применить в программу
        </button>
      )}
    </div>
  );
}
