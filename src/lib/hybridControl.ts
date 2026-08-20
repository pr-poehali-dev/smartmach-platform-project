/**
 * Демо-движок адаптивного управления гибридным лазерно-плазменным процессом.
 *
 * Портирован из app/hybrid/adaptive_control.py, чтобы панель оператора
 * работала автономно на защите заявки — без развёрнутого бэкенда и без доступа
 * к установке. Логика и пороги идентичны серверной реализации.
 */

export type ProcessId =
  | 'weld_al_6'
  | 'cut_steel_6'
  | 'cut_steel_10'
  | 'cut_steel_12';
export type SignalKind = 'stable' | 'arc_wander' | 'double_arcing' | 'power_drift';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Экономические нормативы процесса — основа расчёта себестоимости метра реза. */
export interface ProcessEconomics {
  /** Цена режущего газа, руб/м³ */
  gasPriceRubM3: number;
  /** Ресурс сопла при штатном режиме, часов горения */
  nozzleLifeH: number;
  /** Цена комплекта расходников (сопло + электрод), руб */
  consumableSetRub: number;
  /** Ставка машинного часа с учётом энергии и амортизации, руб/ч */
  machineRateRubH: number;
  /** Ставка оператора, руб/ч */
  operatorRateRubH: number;
  /** Нормативная доля брака при ручном подборе режима, % */
  baselineDefectPct: number;
  /** Стоимость метра погонного заготовки для оценки потерь от брака, руб */
  materialCostPerMRub: number;
}

export interface ProcessDef {
  id: ProcessId;
  title: string;
  kind: 'welding' | 'cutting';
  material: string;
  thicknessMm: number;
  gas: string;
  startParams: Record<string, number>;
  limits: Record<string, [number, number]>;
  checklist: string[];
  economics: ProcessEconomics;
}

/**
 * Нормативы для резки углеродистой стали.
 * Значения ориентировочные, калибруются под конкретное предприятие
 * на этапе пилотного внедрения.
 */
const STEEL_ECONOMICS: ProcessEconomics = {
  gasPriceRubM3: 42,
  nozzleLifeH: 8,
  consumableSetRub: 3400,
  machineRateRubH: 1850,
  operatorRateRubH: 620,
  baselineDefectPct: 12,
  materialCostPerMRub: 210,
};

export const PROCESSES: Record<ProcessId, ProcessDef> = {
  weld_al_6: {
    id: 'weld_al_6',
    title: 'Гибридная сварка стыка АМг6, 6 мм',
    kind: 'welding',
    material: 'AlMg6',
    thicknessMm: 6,
    gas: 'Ar + 30% He',
    startParams: {
      laser_power_w: 3200,
      plasma_current_a: 110,
      speed_mm_min: 900,
      focus_offset_mm: -1.5,
      beam_arc_distance_mm: 3.0,
      gas_flow_l_min: 18,
    },
    limits: {
      laser_power_w: [2200, 4500],
      plasma_current_a: [80, 160],
      speed_mm_min: [500, 1400],
      focus_offset_mm: [-3.0, 0.5],
      beam_arc_distance_mm: [1.5, 5.0],
      gas_flow_l_min: [14, 26],
    },
    checklist: [
      'Кромки зачищены до металлического блеска, обезжирены',
      'Зазор в стыке измерен и не превышает допуска',
      'Защитное стекло лазерной головки чистое',
      'Расход защитного газа проверен по ротаметру',
      'Электрод и сопло осмотрены, износ менее 70%',
      'Выполнен пробный проход на технологической планке',
    ],
    economics: {
      ...STEEL_ECONOMICS,
      gasPriceRubM3: 310, // смесь Ar + He существенно дороже кислорода
      materialCostPerMRub: 480,
      baselineDefectPct: 14,
    },
  },
  cut_steel_6: {
    id: 'cut_steel_6',
    title: 'Гибридная резка Ст3, 6 мм',
    kind: 'cutting',
    material: 'S235',
    thicknessMm: 6,
    gas: 'O2 / воздух',
    startParams: {
      laser_power_w: 3000,
      plasma_current_a: 65,
      speed_mm_min: 2800,
      focus_offset_mm: -1.2,
      beam_arc_distance_mm: 2.2,
      gas_flow_l_min: 17,
    },
    limits: {
      laser_power_w: [2000, 4500],
      plasma_current_a: [45, 95],
      speed_mm_min: [1800, 3800],
      focus_offset_mm: [-3.0, 0.0],
      beam_arc_distance_mm: [1.5, 3.5],
      gas_flow_l_min: [12, 24],
    },
    checklist: [
      'Лист очищен от окалины, ржавчины и масла',
      'Лист прижат, отсутствует коробление кромки',
      'Сопло и электрод осмотрены, посадка без люфта',
      'Давление и чистота режущего газа в норме',
      'Датчик высоты (THC) откалиброван',
      'Выполнена пробная пробивка на краю листа',
      'Проверено отсутствие грата на пробном резе',
    ],
    economics: { ...STEEL_ECONOMICS, materialCostPerMRub: 140 },
  },
  cut_steel_10: {
    id: 'cut_steel_10',
    title: 'Гибридная резка Ст3, 10 мм',
    kind: 'cutting',
    material: 'S235',
    thicknessMm: 10,
    gas: 'O2 / воздух',
    startParams: {
      laser_power_w: 4000,
      plasma_current_a: 85,
      speed_mm_min: 1900,
      focus_offset_mm: -2.0,
      beam_arc_distance_mm: 2.5,
      gas_flow_l_min: 22,
    },
    limits: {
      laser_power_w: [2500, 6000],
      plasma_current_a: [60, 120],
      speed_mm_min: [1200, 2600],
      focus_offset_mm: [-4.0, 0.0],
      beam_arc_distance_mm: [1.5, 4.0],
      gas_flow_l_min: [16, 30],
    },
    checklist: [
      'Лист очищен от окалины, ржавчины и масла',
      'Лист прижат, отсутствует коробление кромки',
      'Сопло и электрод осмотрены, посадка без люфта',
      'Давление и чистота режущего газа в норме',
      'Датчик высоты (THC) откалиброван',
      'Выполнена пробная пробивка на краю листа',
      'Проверено отсутствие грата на пробном резе',
    ],
    economics: STEEL_ECONOMICS,
  },
  cut_steel_12: {
    id: 'cut_steel_12',
    title: 'Гибридная резка Ст3, 12 мм',
    kind: 'cutting',
    material: 'S235',
    thicknessMm: 12,
    gas: 'O2 / воздух',
    startParams: {
      laser_power_w: 4600,
      plasma_current_a: 100,
      speed_mm_min: 1450,
      focus_offset_mm: -2.6,
      beam_arc_distance_mm: 2.8,
      gas_flow_l_min: 25,
    },
    limits: {
      laser_power_w: [3000, 6500],
      plasma_current_a: [70, 140],
      speed_mm_min: [900, 2100],
      focus_offset_mm: [-5.0, -0.5],
      beam_arc_distance_mm: [1.5, 4.5],
      gas_flow_l_min: [18, 34],
    },
    checklist: [
      'Лист очищен от окалины, ржавчины и масла',
      'Лист прижат, отсутствует коробление кромки',
      'Сопло и электрод осмотрены, посадка без люфта',
      'Давление и чистота режущего газа в норме',
      'Датчик высоты (THC) откалиброван',
      'Выполнена пробная пробивка на краю листа',
      'Проверено отсутствие грата на пробном резе',
    ],
    economics: { ...STEEL_ECONOMICS, materialCostPerMRub: 270 },
  },
};

export const PARAM_LABELS: Record<string, { label: string; unit: string }> = {
  laser_power_w: { label: 'Мощность лазера', unit: 'Вт' },
  plasma_current_a: { label: 'Ток плазмы', unit: 'А' },
  speed_mm_min: { label: 'Скорость', unit: 'мм/мин' },
  focus_offset_mm: { label: 'Смещение фокуса', unit: 'мм' },
  beam_arc_distance_mm: { label: 'Зазор луч–дуга', unit: 'мм' },
  gas_flow_l_min: { label: 'Расход газа', unit: 'л/мин' },
};

export interface Conditions {
  processId: ProcessId;
  gapMm: number;
  surface: 'clean' | 'oxidized' | 'contaminated';
  electrodeWearPct: number;
  qualityTarget: 'standard' | 'high';
}

export interface AppliedRule {
  ruleId: string;
  param: string;
  from: number;
  to: number;
  changePct: number;
  reason: string;
}

/** Подбор стартового режима: правила «если… то…» вместо подбора вручную. */
export function selectMode(cond: Conditions): {
  params: Record<string, number>;
  applied: AppliedRule[];
} {
  const proc = PROCESSES[cond.processId];
  const params = { ...proc.startParams };
  const applied: AppliedRule[] = [];
  const isAl = proc.material.startsWith('AlMg');

  const push = (
    ruleId: string,
    param: string,
    next: number,
    reason: string,
  ) => {
    const before = params[param];
    const [lo, hi] = proc.limits[param];
    const clamped = Math.max(lo, Math.min(hi, next));
    if (Math.abs(clamped - before) < 1e-9) return;
    params[param] = Math.round(clamped * 100) / 100;
    applied.push({
      ruleId,
      param,
      from: before,
      to: params[param],
      changePct: Math.round(((clamped - before) / before) * 1000) / 10,
      reason,
    });
  };

  if (isAl && proc.thicknessMm >= 6)
    push('SR-01', 'plasma_current_a', params.plasma_current_a * 1.15,
      'Катодная очистка оксидной плёнки Al₂O₃ (Тпл 2050 °C против 660 °C у металла)');
  if (isAl)
    push('SR-02', 'laser_power_w', params.laser_power_w * 1.1,
      'Теплопроводность Al в 4 раза выше стали — компенсация теплоотвода');
  if (cond.gapMm > 0.5)
    push('SR-03', 'speed_mm_min', params.speed_mm_min * 0.85,
      'Увеличенный зазор требует большего объёма расплава');
  if (cond.surface !== 'clean')
    push('SR-04', 'plasma_current_a', params.plasma_current_a * 1.08,
      'Компенсация потерь на разрушение окисной плёнки');
  if (proc.thicknessMm >= 10)
    push('SR-06', 'focus_offset_mm', params.focus_offset_mm - 1.0,
      'Фокус заглубляется для проплавления по всей толщине');
  if (cond.electrodeWearPct >= 70)
    push('SR-07', 'plasma_current_a', params.plasma_current_a * 0.92,
      'Износ катода повышает риск двойного дугообразования');
  if (cond.qualityTarget === 'high')
    push('SR-08', 'speed_mm_min', params.speed_mm_min * 0.88,
      'Снижение скорости уменьшает конусность и грат');
  if (proc.kind === 'cutting' && proc.thicknessMm >= 10)
    push('SR-09', 'gas_flow_l_min', params.gas_flow_l_min * 1.12,
      'Эффективное удаление расплава из полости реза');

  return { params, applied };
}

/* ────────────────── Признаки сигнала ────────────────── */

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

const std = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

const cvPct = (a: number[]) => {
  const m = mean(a);
  return m ? (std(a) / m) * 100 : 0;
};

const trendPct = (a: number[]) => {
  if (a.length < 4) return 0;
  const h = Math.floor(a.length / 2);
  const x = mean(a.slice(0, h));
  const y = mean(a.slice(h));
  return x ? ((y - x) / x) * 100 : 0;
};

const spikePct = (a: number[]) => {
  const m = mean(a);
  return a.length && m ? (Math.max(...a.map((x) => Math.abs(x - m))) / m) * 100 : 0;
};

/**
 * Пик-фактор — отношение максимального отклонения к СКО.
 * Разделяет блуждание дуги (равномерный шум, ~3–4) и двойное
 * дугообразование (редкие выбросы, >6). Без него алгоритм путает
 * два дефекта с разными причинами и выдаёт неверную коррекцию.
 */
const crestFactor = (a: number[]) => {
  const s = std(a);
  if (!s) return 0;
  const m = mean(a);
  return Math.max(...a.map((x) => Math.abs(x - m))) / s;
};

export interface SignalData {
  voltage: number[];
  current: number[];
  laserPower: number[];
}

export interface Detection {
  key: string;
  title: string;
  severity: Severity;
  cause: string;
  hint: string;
  evidence: string;
}

export interface DetectionResult {
  features: Record<string, number>;
  detections: Detection[];
  stabilityIndex: number;
  status: 'stable' | 'warning' | 'unstable';
}

/** Детерминированный слой детекции — объясним и проходит приёмку у технолога. */
export function detect(sig: SignalData, baselineVoltage?: number): DetectionResult {
  const f = {
    voltageMean: mean(sig.voltage),
    voltageStdPct: cvPct(sig.voltage),
    voltageTrendPct: trendPct(sig.voltage),
    currentMean: mean(sig.current),
    currentStdPct: cvPct(sig.current),
    currentSpikePct: spikePct(sig.current),
    currentCrest: crestFactor(sig.current),
    powerTrendPct: trendPct(sig.laserPower),
  };

  const d: Detection[] = [];

  if (f.voltageStdPct >= 6 && f.currentStdPct >= 5)
    d.push({
      key: 'arc_wander',
      title: 'Блуждание дуги',
      severity: 'high',
      cause: 'Потеря привязки плазменного шнура, магнитное дутьё или износ сопла',
      hint: 'Сблизить зоны лазера и дуги для стабилизации шнура',
      evidence: `Разброс напряжения ${f.voltageStdPct.toFixed(1)}%, тока ${f.currentStdPct.toFixed(1)}%`,
    });

  const vDrop = -f.voltageTrendPct;
  if ((f.currentSpikePct >= 18 && f.currentCrest >= 6) || (vDrop >= 12 && f.currentCrest >= 5))
    d.push({
      key: 'double_arcing',
      title: 'Двойное дугообразование',
      severity: 'critical',
      cause: 'Износ электрода или сопла, замыкание дуги на сопло',
      hint: 'Снизить ток и проверить сопло — риск прогара',
      evidence: `Выброс тока ${f.currentSpikePct.toFixed(1)}% (пик-фактор ${f.currentCrest.toFixed(1)})`,
    });

  if (Math.abs(f.powerTrendPct) >= 5)
    d.push({
      key: 'power_drift',
      title: 'Дрейф мощности лазера',
      severity: 'medium',
      cause: 'Загрязнение защитного стекла или расфокусировка',
      hint: 'Проверить защитное стекло и юстировку оптики',
      evidence: `Дрейф мощности ${f.powerTrendPct.toFixed(1)}% за окно`,
    });

  if (baselineVoltage) {
    const drop = ((baselineVoltage - f.voltageMean) / baselineVoltage) * 100;
    if (drop >= 7)
      d.push({
        key: 'penetration_loss',
        title: 'Потеря проплавления',
        severity: 'high',
        cause: 'Избыточная скорость или недостаточное тепловложение',
        hint: 'Снизить скорость либо повысить мощность лазера',
        evidence: `Напряжение ниже эталона на ${drop.toFixed(1)}%`,
      });
  }

  const weights: Record<Severity, number> = { critical: 40, high: 25, medium: 12, low: 5 };
  const stabilityIndex = Math.max(0, 100 - d.reduce((s, x) => s + weights[x.severity], 0));

  return {
    features: f,
    detections: d,
    stabilityIndex,
    status: stabilityIndex >= 85 ? 'stable' : stabilityIndex >= 60 ? 'warning' : 'unstable',
  };
}

/* ────────────────── Коррекция ────────────────── */

export interface Correction {
  param: string;
  oldValue: number;
  newValue: number;
  changePct: number;
  signature: string;
  severity: Severity;
  requiresConfirm: boolean;
  reason: string;
}

const ACTIONS: Record<string, { param: string; factor?: number; delta?: number }> = {
  arc_wander: { param: 'beam_arc_distance_mm', delta: -0.3 },
  double_arcing: { param: 'plasma_current_a', factor: 0.9 },
  power_drift: { param: 'laser_power_w', factor: 1.05 },
  penetration_loss: { param: 'speed_mm_min', factor: 0.9 },
};

export const MAX_STEP_PCT = 10;

/**
 * Выработка коррекций с двумя уровнями защиты:
 * шаг ограничен 10% и критические события требуют подтверждения оператора.
 * Это исключает разгон системы и защищает оборудование от прогара.
 */
export function propose(
  res: DetectionResult,
  params: Record<string, number>,
  limits: Record<string, [number, number]>,
): Correction[] {
  const order: Severity[] = ['critical', 'high', 'medium', 'low'];
  const sorted = [...res.detections].sort(
    (a, b) => order.indexOf(a.severity) - order.indexOf(b.severity),
  );

  const out: Correction[] = [];
  for (const det of sorted) {
    const act = ACTIONS[det.key];
    if (!act || !(act.param in params)) continue;

    const before = params[act.param];
    let next = act.factor !== undefined ? before * act.factor : before + (act.delta ?? 0);

    const change = before ? ((next - before) / before) * 100 : 0;
    if (Math.abs(change) > MAX_STEP_PCT)
      next = before * (1 + (MAX_STEP_PCT / 100) * Math.sign(change));

    const [lo, hi] = limits[act.param];
    next = Math.max(lo, Math.min(hi, next));
    if (Math.abs(next - before) < 1e-9) continue;

    out.push({
      param: act.param,
      oldValue: Math.round(before * 100) / 100,
      newValue: Math.round(next * 100) / 100,
      changePct: Math.round(((next - before) / before) * 1000) / 10,
      signature: det.title,
      severity: det.severity,
      requiresConfirm: det.key === 'double_arcing',
      reason: det.cause,
    });
  }
  return out;
}

/* ────────────────── Генератор осциллограмм ────────────────── */

/** Детерминированный ГПСЧ — демо воспроизводится одинаково на любой машине. */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function gauss(rng: () => number, sigma: number) {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()) * sigma;
}

/** Синтетические сигналы: позволяют показать работу комплекса без установки. */
export function synthSignal(kind: SignalKind, n = 240, seed = 42): SignalData {
  const rng = makeRng(seed);
  const voltage: number[] = [];
  const current: number[] = [];
  const laserPower: number[] = [];

  for (let i = 0; i < n; i++) {
    switch (kind) {
      case 'arc_wander':
        voltage.push(28 + gauss(rng, 2.2));
        current.push(110 + gauss(rng, 7));
        laserPower.push(3200 + gauss(rng, 20));
        break;
      case 'double_arcing': {
        const spike = [80, 81, 150, 151, 200].includes(i) ? 46 : 0;
        voltage.push(28 - (i / n) * 5 + gauss(rng, 0.6));
        current.push(110 + spike + gauss(rng, 1.5));
        laserPower.push(3200 + gauss(rng, 15));
        break;
      }
      case 'power_drift':
        voltage.push(28 + gauss(rng, 0.3));
        current.push(110 + gauss(rng, 1));
        laserPower.push(3200 * (1 - (0.14 * i) / n) + gauss(rng, 12));
        break;
      default:
        voltage.push(28 + gauss(rng, 0.25));
        current.push(110 + gauss(rng, 0.8));
        laserPower.push(3200 + gauss(rng, 15));
    }
  }
  return { voltage, current, laserPower };
}

export const SIGNAL_LABELS: Record<SignalKind, string> = {
  stable: 'Стабильный процесс',
  arc_wander: 'Блуждание дуги',
  double_arcing: 'Двойное дугообразование',
  power_drift: 'Дрейф мощности лазера',
};