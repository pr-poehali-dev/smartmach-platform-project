/**
 * Специализация под резку углеродистой стали 6–12 мм.
 *
 * Решает две задачи, которые в общем контуре адаптивного управления
 * не покрыты и составляют основную боль технолога:
 *
 * 1. Прогноз грата и окалины по косвенным признакам — почему появился
 *    дефект кромки и что именно крутить, чтобы его убрать.
 * 2. Учёт расхода газа, износа расходников и себестоимости метра реза —
 *    статья затрат, которую на предприятиях обычно не считают.
 */

import {
  Correction,
  DetectionResult,
  ProcessDef,
  Severity,
} from '@/lib/hybridControl';

/* ═════════════════ Прогноз качества кромки ═════════════════ */

export type EdgeDefectKind = 'dross' | 'scale' | 'taper' | 'undercut' | 'roughness';

export interface EdgeDefect {
  kind: EdgeDefectKind;
  title: string;
  /** Вероятность появления дефекта, 0–100 % */
  risk: number;
  severity: Severity;
  cause: string;
  /** Что конкретно изменить — формулировка для оператора у станка */
  action: string;
  param: string;
  /** Рекомендуемое относительное изменение параметра, % */
  suggestPct: number;
  /**
   * Целевое абсолютное значение параметра.
   * Нужно там, где относительный шаг бессмысленен: смещение фокуса
   * задаётся конкретной величиной для толщины, а не процентом от текущей
   * (тем более что оно отрицательное и знак процента вводит в заблуждение).
   */
  targetValue?: number;
}

export interface EdgeQualityResult {
  defects: EdgeDefect[];
  /** Интегральная оценка качества кромки, 0–100 */
  edgeQualityIndex: number;
  /** Ожидаемая доля брака по кромке, % */
  expectedDefectPct: number;
  grade: 'good' | 'acceptable' | 'poor';
  /** Отношение фактической скорости к оптимальной для данной толщины */
  speedRatio: number;
  /** Отношение фактического расхода газа к нормативному */
  gasRatio: number;
}

/**
 * Опорные точки скорости резки из технологической базы, мм/мин.
 * Степенная аппроксимация давала расхождение до 30 % на тонком листе,
 * поэтому используется интерполяция по фактическим режимам — она
 * согласована с базой и не создаёт ложных срабатываний на старте.
 */
const SPEED_TABLE: [number, number][] = [
  [6, 2800],
  [8, 2300],
  [10, 1900],
  [12, 1450],
];

/**
 * Номинальная мощность лазера для толщины, Вт.
 * Взята из тех же режимов базы, что и скорость: линейная формула давала
 * занижение на 10 % для 6 мм и создавала ложный дефект уже на старте.
 */
const POWER_TABLE: [number, number][] = [
  [6, 3000],
  [8, 3500],
  [10, 4000],
  [12, 4600],
];

function interpolate(table: [number, number][], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  if (x >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i += 1) {
    const [x1, y1] = table[i];
    const [x2, y2] = table[i + 1];
    if (x >= x1 && x <= x2) return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
  }
  return table[0][1];
}

function nominalPower(thicknessMm: number): number {
  return interpolate(POWER_TABLE, thicknessMm);
}

/** Оптимальная скорость резки, мм/мин, с поправкой на фактическую мощность. */
export function optimalSpeed(thicknessMm: number, laserPowerW: number): number {
  const base = interpolate(SPEED_TABLE, thicknessMm);
  // Недостаток мощности требует снижения скорости, избыток — позволяет поднять
  const powerFactor = Math.min(
    1.2,
    Math.max(0.8, laserPowerW / nominalPower(thicknessMm)),
  );
  return base * powerFactor;
}

/**
 * Нормативный расход режущего газа, л/мин.
 * Согласован со стартовыми режимами базы: 6 мм — 17, 10 мм — 22, 12 мм — 25.
 */
export function nominalGasFlow(thicknessMm: number): number {
  return 9.5 + thicknessMm * 1.28;
}

/**
 * Прогноз дефектов кромки по параметрам режима и признакам сигнала.
 *
 * Ключевая идея: грат на углеродистой стали возникает не случайно, а при
 * конкретных сочетаниях — скорость выше оптимальной (расплав не успевает
 * удаляться), недостаток газа (нечем выдувать), нестабильность дуги
 * (рваная кромка). Система показывает не факт брака, а его вероятную
 * причину и конкретное действие.
 */
export function predictEdgeQuality(
  proc: ProcessDef,
  params: Record<string, number>,
  detection?: DetectionResult,
): EdgeQualityResult {
  const t = proc.thicknessMm;
  const speed = params.speed_mm_min ?? 0;
  const gas = params.gas_flow_l_min ?? 0;
  const power = params.laser_power_w ?? 0;
  const focus = params.focus_offset_mm ?? 0;
  const current = params.plasma_current_a ?? 0;

  const optSpeed = optimalSpeed(t, power);
  const speedRatio = optSpeed ? speed / optSpeed : 1;
  const nomGas = nominalGasFlow(t);
  const gasRatio = nomGas ? gas / nomGas : 1;

  const defects: EdgeDefect[] = [];
  const f = detection?.features;

  /* ── Грат: избыточная скорость ── */
  if (speedRatio > 1.08) {
    const excess = (speedRatio - 1) * 100;
    defects.push({
      kind: 'dross',
      title: 'Грат на нижней кромке',
      risk: Math.min(95, Math.round(excess * 4.5)),
      severity: excess > 20 ? 'high' : 'medium',
      cause:
        `Скорость превышает оптимальную для толщины ${t} мм на ${excess.toFixed(0)}%: `
        + 'расплав не успевает удаляться из полости реза и застывает на нижней кромке',
      action: `Снизить скорость до ${Math.round(optSpeed)} мм/мин`,
      param: 'speed_mm_min',
      suggestPct: -Math.min(20, Math.round(excess)),
    });
  }

  /* ── Грат: недостаток газа ── */
  if (gasRatio < 0.9) {
    const deficit = (1 - gasRatio) * 100;
    defects.push({
      kind: 'dross',
      title: 'Грат из-за недостатка режущего газа',
      risk: Math.min(90, Math.round(deficit * 5)),
      severity: deficit > 20 ? 'high' : 'medium',
      cause:
        `Расход газа на ${deficit.toFixed(0)}% ниже нормативного (${nomGas.toFixed(0)} л/мин) — `
        + 'недостаточное давление для выдувания расплава из реза',
      action: `Увеличить расход газа до ${nomGas.toFixed(0)} л/мин`,
      param: 'gas_flow_l_min',
      suggestPct: Math.min(20, Math.round(deficit)),
    });
  }

  /* ── Окалина: избыточное тепловложение ── */
  const heatInput = current * 1.2 + power / 100;
  const nominalHeat = t * 22;
  if (heatInput > nominalHeat * 1.15) {
    const excess = (heatInput / nominalHeat - 1) * 100;
    defects.push({
      kind: 'scale',
      title: 'Окалина и цвета побежалости',
      risk: Math.min(85, Math.round(excess * 3)),
      severity: 'medium',
      cause:
        `Погонная энергия превышает норму для толщины ${t} мм на ${excess.toFixed(0)}%: `
        + 'перегрев кромки вызывает интенсивное окисление',
      action: 'Снизить ток плазмы либо увеличить скорость резки',
      param: 'plasma_current_a',
      suggestPct: -Math.min(15, Math.round(excess / 2)),
    });
  }

  /* ── Непрорез: недостаток энергии ── */
  if (speedRatio > 1.25 && heatInput < nominalHeat) {
    defects.push({
      kind: 'dross',
      title: 'Риск непрореза',
      risk: Math.min(95, Math.round((speedRatio - 1.25) * 200 + 40)),
      severity: 'high',
      cause:
        'Сочетание высокой скорости и недостаточного тепловложения — '
        + 'глубина проплавления может не достичь нижней кромки',
      action: 'Снизить скорость или повысить мощность лазера',
      param: 'speed_mm_min',
      suggestPct: -20,
    });
  }

  /* ── Конусность: положение фокуса ── */
  const optFocus = -t * 0.22;
  const focusDev = Math.abs(focus - optFocus);
  if (focusDev > t * 0.15) {
    defects.push({
      kind: 'taper',
      title: 'Конусность реза',
      risk: Math.min(80, Math.round((focusDev / t) * 220)),
      severity: 'medium',
      cause:
        `Фокус смещён на ${focus.toFixed(1)} мм при рекомендуемом ${optFocus.toFixed(1)} мм `
        + 'для данной толщины — ширина реза меняется по глубине',
      action: `Установить смещение фокуса ${optFocus.toFixed(1)} мм`,
      param: 'focus_offset_mm',
      suggestPct: 0,
      targetValue: Math.round(optFocus * 100) / 100,
    });
  }

  /* ── Шероховатость: нестабильность дуги ──
     Первопричина — состояние сопла и привязка дуги, её устраняет оператор.
     Но пока причина не устранена, снижение скорости уменьшает шаг борозд
     и вытягивает кромку в допуск, поэтому даётся и параметрическое действие. */
  if (f && f.currentStdPct >= 4) {
    defects.push({
      kind: 'roughness',
      title: 'Повышенная шероховатость кромки',
      risk: Math.min(90, Math.round(f.currentStdPct * 11)),
      severity: f.currentStdPct >= 6 ? 'high' : 'medium',
      cause:
        `Разброс тока ${f.currentStdPct.toFixed(1)}% — колебания дуги оставляют `
        + 'волнистость и борозды на поверхности реза',
      action:
        'Проверить сопло и привязку дуги; до устранения причины снизить '
        + 'скорость для уменьшения шага борозд',
      param: 'speed_mm_min',
      suggestPct: -Math.min(10, Math.round(f.currentStdPct)),
    });
  }

  /* ── Подрез: чрезмерная энергия при низкой скорости ── */
  if (speedRatio < 0.75 && heatInput > nominalHeat) {
    defects.push({
      kind: 'undercut',
      title: 'Подрез верхней кромки',
      risk: Math.min(75, Math.round((0.75 - speedRatio) * 180)),
      severity: 'medium',
      cause:
        'Скорость существенно ниже оптимальной при избыточной энергии — '
        + 'перегрев и оплавление верхней кромки',
      action: 'Повысить скорость либо снизить ток плазмы',
      param: 'speed_mm_min',
      suggestPct: 12,
    });
  }

  // Интегральный индекс: вклад дефекта пропорционален риску и значимости
  const weight: Record<Severity, number> = { critical: 1.0, high: 0.75, medium: 0.45, low: 0.2 };
  const penalty = defects.reduce((s, d) => s + d.risk * weight[d.severity], 0);
  const edgeQualityIndex = Math.max(0, Math.round(100 - penalty / 2));

  // Ожидаемая доля брака: базовый уровень плюс вклад выявленных рисков
  const expectedDefectPct = Math.min(
    45,
    Math.round((2 + penalty / 14) * 10) / 10,
  );

  return {
    defects: defects.sort((a, b) => b.risk - a.risk),
    edgeQualityIndex,
    expectedDefectPct,
    grade: edgeQualityIndex >= 80 ? 'good' : edgeQualityIndex >= 55 ? 'acceptable' : 'poor',
    speedRatio: Math.round(speedRatio * 100) / 100,
    gasRatio: Math.round(gasRatio * 100) / 100,
  };
}

/**
 * Преобразует прогноз дефектов в коррекции режима.
 * Ограничение шага то же, что в основном контуре — 10 % за приём.
 */
export function proposeEdgeCorrections(
  quality: EdgeQualityResult,
  params: Record<string, number>,
  limits: Record<string, [number, number]>,
  maxStepPct = 10,
): Correction[] {
  const out: Correction[] = [];
  const used = new Set<string>();

  for (const d of quality.defects) {
    if (used.has(d.param) || !(d.param in params)) continue;
    if (!d.suggestPct && d.targetValue === undefined) continue;

    const before = params[d.param];
    let next: number;

    if (d.targetValue !== undefined) {
      // Параметр выставляется в расчётное значение целиком: ограничение
      // шага в процентах к нему неприменимо (значение может быть
      // отрицательным или проходить через ноль).
      next = d.targetValue;
    } else {
      const step = Math.max(-maxStepPct, Math.min(maxStepPct, d.suggestPct));
      next = before * (1 + step / 100);
    }

    const lim = limits[d.param];
    if (lim) next = Math.max(lim[0], Math.min(lim[1], next));
    if (Math.abs(next - before) < 1e-9) continue;

    used.add(d.param);
    out.push({
      param: d.param,
      oldValue: Math.round(before * 100) / 100,
      newValue: Math.round(next * 100) / 100,
      // Знаменатель по модулю: смещение фокуса отрицательное, и деление
      // на само значение переворачивало бы знак процента.
      // Нулевое исходное значение процентом не описывается.
      changePct: before
        ? Math.round(((next - before) / Math.abs(before)) * 1000) / 10
        : 0,
      signature: d.title,
      severity: d.severity,
      requiresConfirm: false,
      reason: d.cause,
      absolute: d.targetValue !== undefined,
    });
  }

  return out;
}

export interface ConvergenceStep {
  step: number;
  params: Record<string, number>;
  edgeQualityIndex: number;
  expectedDefectPct: number;
  corrections: Correction[];
}

/**
 * Итеративный выход на оптимальный режим.
 *
 * Ограничение шага в 10 % за приём — требование безопасности, но за один
 * приём режим до оптимума не доводится. Функция показывает, за сколько
 * последовательных коррекций процесс приходит в допуск: это и есть
 * замена 3–5 пробным проходам технолога.
 */
export function convergeToOptimum(
  proc: ProcessDef,
  startParams: Record<string, number>,
  maxSteps = 5,
  targetIndex = 80,
): ConvergenceStep[] {
  const history: ConvergenceStep[] = [];
  let params = { ...startParams };

  for (let step = 0; step <= maxSteps; step += 1) {
    const q = predictEdgeQuality(proc, params);
    const corrections =
      q.edgeQualityIndex >= targetIndex
        ? []
        : proposeEdgeCorrections(q, params, proc.limits);

    history.push({
      step,
      params: { ...params },
      edgeQualityIndex: q.edgeQualityIndex,
      expectedDefectPct: q.expectedDefectPct,
      corrections,
    });

    if (!corrections.length) break;

    const next = { ...params };
    corrections.forEach((c) => {
      next[c.param] = c.newValue;
    });
    params = next;
  }

  return history;
}

/* ═════════════════ Экономика резки ═════════════════ */

export interface CutJobInput {
  /** Длина реза в задании, м */
  cutLengthM: number;
  /** Количество пробивок */
  pierceCount: number;
}

export interface CostBreakdown {
  cutTimeMin: number;
  gasM3: number;
  gasCost: number;
  consumableCost: number;
  machineCost: number;
  operatorCost: number;
  defectLossCost: number;
  totalCost: number;
  costPerMeter: number;
  nozzleWearPct: number;
  /** Удельный расход газа, л на метр реза — цеховая метрика, не зависящая от объёма задания */
  gasPerMeterL: number;
}

export interface EconomicsComparison {
  manual: CostBreakdown;
  adaptive: CostBreakdown;
  savingRub: number;
  savingPct: number;
  gasSavingPct: number;
  defectReductionPp: number;
  /**
   * Режимы совпадают — оператор не отклонялся от табличного.
   * В этом случае вся разница объясняется только разной долей брака,
   * и подавать её как «экономию от комплекса» некорректно.
   */
  sameMode: boolean;
}

/** Расчёт себестоимости резки для заданного режима и доли брака. */
export function calcCost(
  proc: ProcessDef,
  params: Record<string, number>,
  job: CutJobInput,
  defectPct: number,
): CostBreakdown {
  const e = proc.economics;
  const speed = params.speed_mm_min || 1;
  const gasFlow = params.gas_flow_l_min || 0;

  // Пробивка на толстом металле занимает заметное время и учитывается отдельно
  const pierceTimeMin = (job.pierceCount * (0.6 + proc.thicknessMm * 0.12)) / 60;
  const cutTimeMin = (job.cutLengthM * 1000) / speed + pierceTimeMin;

  const gasM3 = (gasFlow * cutTimeMin) / 1000;
  const gasCost = gasM3 * e.gasPriceRubM3;

  const hours = cutTimeMin / 60;
  const nozzleWearPct = (hours / e.nozzleLifeH) * 100;
  const consumableCost = (hours / e.nozzleLifeH) * e.consumableSetRub;

  const machineCost = hours * e.machineRateRubH;
  const operatorCost = hours * e.operatorRateRubH;

  // Брак: повторная резка плюс потерянная заготовка
  const defectLossCost =
    (defectPct / 100) * job.cutLengthM * e.materialCostPerMRub
    + (defectPct / 100) * hours * e.machineRateRubH;

  const totalCost =
    gasCost + consumableCost + machineCost + operatorCost + defectLossCost;

  return {
    cutTimeMin: Math.round(cutTimeMin * 10) / 10,
    gasM3: Math.round(gasM3 * 1000) / 1000,
    gasCost: Math.round(gasCost),
    consumableCost: Math.round(consumableCost),
    machineCost: Math.round(machineCost),
    operatorCost: Math.round(operatorCost),
    defectLossCost: Math.round(defectLossCost),
    totalCost: Math.round(totalCost),
    costPerMeter: Math.round(totalCost / Math.max(0.001, job.cutLengthM)),
    nozzleWearPct: Math.round(nozzleWearPct * 10) / 10,
    gasPerMeterL: Math.round((gasM3 * 1000) / Math.max(0.001, job.cutLengthM) * 10) / 10,
  };
}

/**
 * Сравнение ручного подбора режима и работы с адаптивным управлением.
 *
 * Ручной вариант считается по стартовым табличным параметрам и нормативной
 * доле брака предприятия. Адаптивный — по фактическому режиму после коррекций
 * и прогнозной доле брака от модуля контроля кромки.
 *
 * Именно эта разница — измеримая ценность для заявки и для цеха.
 */
export function compareEconomics(
  proc: ProcessDef,
  adaptiveParams: Record<string, number>,
  job: CutJobInput,
  expectedDefectPct: number,
): EconomicsComparison {
  const manual = calcCost(proc, proc.startParams, job, proc.economics.baselineDefectPct);
  const adaptive = calcCost(proc, adaptiveParams, job, expectedDefectPct);

  // Влияют только параметры, входящие в расчёт себестоимости
  const sameMode = (['speed_mm_min', 'gas_flow_l_min'] as const).every(
    (k) => Math.abs((adaptiveParams[k] ?? 0) - (proc.startParams[k] ?? 0)) < 1e-9,
  );

  const savingRub = manual.totalCost - adaptive.totalCost;
  const gasSavingPct = manual.gasM3
    ? ((manual.gasM3 - adaptive.gasM3) / manual.gasM3) * 100
    : 0;

  return {
    manual,
    adaptive,
    savingRub,
    savingPct: manual.totalCost
      ? Math.round((savingRub / manual.totalCost) * 1000) / 10
      : 0,
    gasSavingPct: Math.round(gasSavingPct * 10) / 10,
    defectReductionPp:
      Math.round((proc.economics.baselineDefectPct - expectedDefectPct) * 10) / 10,
    sameMode,
  };
}

export const EDGE_GRADE_LABELS: Record<string, string> = {
  good: 'Кромка в допуске',
  acceptable: 'Кромка приемлема',
  poor: 'Кромка вне допуска',
};

export const DEFECT_KIND_LABELS: Record<EdgeDefectKind, string> = {
  dross: 'Грат',
  scale: 'Окалина',
  taper: 'Конусность',
  undercut: 'Подрез',
  roughness: 'Шероховатость',
};