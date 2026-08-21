import Icon from '@/components/ui/icon';
import { CutJobInput, EconomicsComparison } from '@/lib/steelCutting';

interface EconomicsPanelProps {
  economics: EconomicsComparison;
  job: CutJobInput;
  onJobChange: (job: CutJobInput) => void;
  baselineDefectPct: number;
  expectedDefectPct: number;
}

/**
 * Экономика задания: сравнение ручного подбора и работы с комплексом.
 * Эти цифры — основной аргумент и для цеха, и для заявки на грант.
 */
export default function EconomicsPanel({
  economics,
  job,
  onJobChange,
  baselineDefectPct,
  expectedDefectPct,
}: EconomicsPanelProps) {
  const { manual, adaptive } = economics;
  const positive = economics.savingRub > 0;

  const rows: [string, string, string][] = [
    ['Время резки, мин', `${manual.cutTimeMin}`, `${adaptive.cutTimeMin}`],
    ['Режущий газ, м³', `${manual.gasM3}`, `${adaptive.gasM3}`],
    ['Газ на метр реза, л', `${manual.gasPerMeterL}`, `${adaptive.gasPerMeterL}`],
    ['Газ, ₽', `${manual.gasCost}`, `${adaptive.gasCost}`],
    ['Расходники, ₽', `${manual.consumableCost}`, `${adaptive.consumableCost}`],
    ['Машинное время, ₽', `${manual.machineCost}`, `${adaptive.machineCost}`],
    ['Оператор, ₽', `${manual.operatorCost}`, `${adaptive.operatorCost}`],
    ['Потери от брака, ₽', `${manual.defectLossCost}`, `${adaptive.defectLossCost}`],
    ['Доля брака, %', `${baselineDefectPct}`, `${expectedDefectPct}`],
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name="Calculator" size={16} />
        Экономика задания
      </h2>

      {/* Параметры задания */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Длина реза, м
          </span>
          <input
            type="number"
            min={1}
            value={job.cutLengthM}
            onChange={(e) =>
              onJobChange({ ...job, cutLengthM: Math.max(1, +e.target.value || 1) })
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Пробивок</span>
          <input
            type="number"
            min={0}
            value={job.pierceCount}
            onChange={(e) =>
              onJobChange({ ...job, pierceCount: Math.max(0, +e.target.value || 0) })
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
          />
        </label>
      </div>

      {/* Итог */}
      <div
        className={`mt-3 rounded-lg border p-3 ${
          positive ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-muted/40'
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Себестоимость метра реза</span>
          <span className="text-xs text-muted-foreground">экономия</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg text-muted-foreground line-through">
              {manual.costPerMeter} ₽
            </span>
            <Icon name="ArrowRight" size={14} className="text-muted-foreground" />
            <span
              className={`font-mono text-2xl font-bold ${
                positive ? 'text-emerald-700' : 'text-foreground'
              }`}
            >
              {adaptive.costPerMeter} ₽
            </span>
          </div>
          <span
            className={`font-mono text-xl font-bold ${
              positive ? 'text-emerald-700' : 'text-muted-foreground'
            }`}
          >
            {economics.savingPct > 0 ? '−' : ''}
            {Math.abs(economics.savingPct)}%
          </span>
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground">
          На задании {job.cutLengthM} м:{' '}
          <span className="font-semibold text-foreground">
            {economics.savingRub.toLocaleString('ru-RU')} ₽
          </span>{' '}
          разницы
        </div>
      </div>

      {/* Честная оговорка: без изменения режима разница держится только
          на разной доле брака, а не на оптимизации параметров. */}
      {economics.sameMode && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-border bg-muted/50 p-2 text-[11px] leading-snug text-muted-foreground">
          <Icon name="Info" size={12} className="mt-0.5 shrink-0" />
          <span>
            Режим совпадает с табличным: разница объясняется только прогнозной
            долей брака ({expectedDefectPct}% против норматива {baselineDefectPct}%).
            Измените параметры режима, чтобы увидеть вклад оптимизации.
          </span>
        </p>
      )}

      {/* KPI */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ['Брак', `−${economics.defectReductionPp} п.п.`, economics.defectReductionPp > 0],
          ['Потери от брака', `−${Math.max(0, manual.defectLossCost - adaptive.defectLossCost).toLocaleString('ru-RU')} ₽`, manual.defectLossCost > adaptive.defectLossCost],
          ['Ресурс сопла', `${adaptive.nozzleWearPct}%`, false],
        ].map(([label, value, good]) => (
          <div key={label as string} className="rounded-lg bg-muted/40 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div
              className={`font-mono text-sm font-bold ${
                good ? 'text-emerald-600' : 'text-foreground'
              }`}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Детализация */}
      <table className="mt-3 w-full text-xs">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="pb-1.5 text-left font-medium">Статья</th>
            <th className="pb-1.5 text-right font-medium">Вручную</th>
            <th className="pb-1.5 text-right font-medium">С комплексом</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b]) => (
            <tr key={label} className="border-b border-border/50 last:border-0">
              <td className="py-1 text-muted-foreground">{label}</td>
              <td className="py-1 text-right font-mono text-muted-foreground">{a}</td>
              <td className="py-1 text-right font-mono font-medium text-foreground">
                {b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {economics.gasSavingPct < 0 && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] leading-snug text-amber-800">
          <Icon name="TriangleAlert" size={12} className="mt-0.5 shrink-0" />
          <span>
            Расход газа вырос на {Math.abs(economics.gasSavingPct)}%: режим замедлен ради
            качества кромки. Затраты перекрываются снижением потерь от брака.
          </span>
        </p>
      )}

      <p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-[11px] leading-snug text-muted-foreground">
        <Icon name="Info" size={12} className="mt-0.5 shrink-0" />
        <span>
          Нормативы затрат ориентировочные и калибруются под предприятие
          на этапе пилотного внедрения.
        </span>
      </p>
    </div>
  );
}