/**
 * Данные для Мастера режимов резания (аналог iMachining Technology Wizard)
 * Содержит справочные таблицы по материалам, инструментам и формулы расчёта.
 */

export type ToolType = "end_mill" | "face_mill" | "drill" | "boring" | "thread_mill" | "ball_end";
export type OperationType = "roughing" | "semi_finishing" | "finishing" | "drilling" | "threading";
export type MaterialGroup = "steel_soft" | "steel_hard" | "stainless" | "aluminum" | "titanium" | "cast_iron" | "copper" | "plastic";

export interface MaterialData {
  label: string;
  group: MaterialGroup;
  hardness: string;
  /** Коэффициент скорости резания (Vc, м/мин) — базовый для HSS */
  vcBase: number;
  /** Множитель для твёрдосплавного инструмента */
  carbideK: number;
  /** Рекомендуемое СОЖ */
  coolant: string;
  color: string;
}

export const WIZARD_MATERIALS: Record<string, MaterialData> = {
  "Сталь 20":          { label: "Сталь 20",          group: "steel_soft",  hardness: "163 HB", vcBase: 80,  carbideK: 3.5, coolant: "Эмульсия 5–8%",      color: "bg-blue-100 text-blue-800" },
  "Сталь 45":          { label: "Сталь 45",          group: "steel_soft",  hardness: "207 HB", vcBase: 70,  carbideK: 3.2, coolant: "Эмульсия 5–8%",      color: "bg-blue-100 text-blue-800" },
  "Сталь 40Х":         { label: "Сталь 40Х",         group: "steel_hard",  hardness: "255 HB", vcBase: 55,  carbideK: 3.0, coolant: "Масло / Эмульсия",   color: "bg-indigo-100 text-indigo-800" },
  "Сталь 30ХГСА":      { label: "Сталь 30ХГСА",      group: "steel_hard",  hardness: "269 HB", vcBase: 50,  carbideK: 2.8, coolant: "Масло / Эмульсия",   color: "bg-indigo-100 text-indigo-800" },
  "Сталь 65Г":         { label: "Сталь 65Г",         group: "steel_hard",  hardness: "285 HB", vcBase: 45,  carbideK: 2.7, coolant: "Масло / Эмульсия",   color: "bg-indigo-100 text-indigo-800" },
  "Сталь 12Х18Н10Т":  { label: "Сталь 12Х18Н10Т",  group: "stainless",   hardness: "200 HB", vcBase: 35,  carbideK: 3.0, coolant: "Масло (обильно)",    color: "bg-purple-100 text-purple-800" },
  "Алюминий АМГ6":     { label: "Алюминий АМГ6",     group: "aluminum",    hardness: "75 HB",  vcBase: 300, carbideK: 2.0, coolant: "Масло / всухую",     color: "bg-yellow-100 text-yellow-800" },
  "Алюминий Д16Т":     { label: "Алюминий Д16Т",     group: "aluminum",    hardness: "120 HB", vcBase: 250, carbideK: 2.0, coolant: "Масло / СОЖ",        color: "bg-yellow-100 text-yellow-800" },
  "Алюминий АД31":     { label: "Алюминий АД31",     group: "aluminum",    hardness: "60 HB",  vcBase: 350, carbideK: 2.0, coolant: "Масло / всухую",     color: "bg-yellow-100 text-yellow-800" },
  "Титан ВТ6":         { label: "Титан ВТ6",         group: "titanium",    hardness: "320 HB", vcBase: 25,  carbideK: 2.5, coolant: "Масло (обильно)",    color: "bg-orange-100 text-orange-800" },
  "Чугун СЧ20":        { label: "Чугун СЧ20",        group: "cast_iron",   hardness: "190 HB", vcBase: 90,  carbideK: 3.0, coolant: "Всухую / Эмульсия", color: "bg-gray-100 text-gray-800" },
  "Чугун ВЧ50":        { label: "Чугун ВЧ50",        group: "cast_iron",   hardness: "230 HB", vcBase: 75,  carbideK: 3.0, coolant: "Всухую / Эмульсия", color: "bg-gray-100 text-gray-800" },
  "Бронза БрАЖ9-4":   { label: "Бронза БрАЖ9-4",   group: "copper",      hardness: "180 HB", vcBase: 120, carbideK: 2.5, coolant: "Эмульсия / масло",   color: "bg-amber-100 text-amber-800" },
  "Латунь Л63":        { label: "Латунь Л63",        group: "copper",      hardness: "80 HB",  vcBase: 150, carbideK: 2.0, coolant: "Эмульсия / всухую", color: "bg-amber-100 text-amber-800" },
};

export interface ToolData {
  label: string;
  type: ToolType;
  /** Доступные диаметры */
  diameters: number[];
  /** Количество зубьев по умолчанию */
  defaultFlutes: number;
  /** Допустимые операции */
  operations: OperationType[];
  icon: string;
}

export const WIZARD_TOOLS: ToolData[] = [
  { label: "Концевая фреза (HM)", type: "end_mill",    diameters: [2,3,4,5,6,8,10,12,16,20,25,32], defaultFlutes: 4, operations: ["roughing","semi_finishing","finishing"], icon: "Drill" },
  { label: "Торцевая фреза",      type: "face_mill",   diameters: [32,40,50,63,80,100,125,160],    defaultFlutes: 6, operations: ["roughing","semi_finishing","finishing"], icon: "Circle" },
  { label: "Шаровая фреза",       type: "ball_end",    diameters: [2,3,4,5,6,8,10,12,16,20],       defaultFlutes: 2, operations: ["semi_finishing","finishing"],           icon: "Disc" },
  { label: "Сверло",              type: "drill",       diameters: [1,2,3,4,5,6,8,10,12,14,16,18,20,22,25], defaultFlutes: 2, operations: ["drilling"],              icon: "ArrowDown" },
  { label: "Расточной резец",     type: "boring",      diameters: [10,12,16,20,25,32,40,50],       defaultFlutes: 1, operations: ["finishing"],                         icon: "ScanLine" },
  { label: "Резьбофреза",         type: "thread_mill", diameters: [3,4,5,6,8,10,12,16,20],         defaultFlutes: 3, operations: ["threading"],                         icon: "Wrench" },
];

export const OPERATION_LABELS: Record<OperationType, string> = {
  roughing:       "Черновая",
  semi_finishing: "Получистовая",
  finishing:      "Чистовая",
  drilling:       "Сверление",
  threading:      "Нарезание резьбы",
};

/** Коэффициенты подачи на зуб (fz, мм/зуб) в зависимости от операции */
export const FZ_COEFFICIENTS: Record<OperationType, { min: number; max: number }> = {
  roughing:       { min: 0.05, max: 0.15 },
  semi_finishing: { min: 0.02, max: 0.08 },
  finishing:      { min: 0.005, max: 0.03 },
  drilling:       { min: 0.05, max: 0.30 },
  threading:      { min: 0.01, max: 0.05 },
};

/** Глубина резания ap как доля от диаметра */
export const AP_RATIO: Record<OperationType, number> = {
  roughing:       0.5,
  semi_finishing: 0.25,
  finishing:      0.05,
  drilling:       1.0,
  threading:      0.3,
};

/** Ширина резания ae как доля от диаметра */
export const AE_RATIO: Record<OperationType, number> = {
  roughing:       0.6,
  semi_finishing: 0.4,
  finishing:      0.2,
  drilling:       1.0,
  threading:      0.5,
};

export interface CuttingResult {
  vc: number;         // Скорость резания, м/мин
  n: number;          // Обороты шпинделя, об/мин
  fz: number;         // Подача на зуб, мм/зуб
  vf: number;         // Скорость подачи, мм/мин
  ap: number;         // Глубина резания, мм
  ae: number;         // Ширина резания, мм
  mrr: number;        // Material Removal Rate, см³/мин
  powerKw: number;    // Ориентировочная мощность, кВт
  toolLife: string;   // Стойкость инструмента
  gcode: string;      // Фрагмент G-кода
}

/**
 * Основная функция расчёта режимов резания.
 * Алгоритм адаптирован по нормативам ГОСТ 25762-83 и рекомендациям производителей инструмента.
 */
export function calcCuttingParams(
  material: string,
  toolType: ToolType,
  diameter: number,
  flutes: number,
  operation: OperationType,
  isCarbide: boolean,
): CuttingResult {
  const mat = WIZARD_MATERIALS[material];
  if (!mat) throw new Error("Материал не найден");

  // Скорость резания
  const vc = Math.round(mat.vcBase * (isCarbide ? mat.carbideK : 1));

  // Обороты шпинделя: n = 1000*Vc / (π*D)
  const n = Math.round((1000 * vc) / (Math.PI * diameter));

  // Подача на зуб
  const fzRange = FZ_COEFFICIENTS[operation];
  // Для мягких материалов берём верхнюю границу, для твёрдых — нижнюю
  const hardFactor = Math.min(mat.hardness ? parseInt(mat.hardness) / 300 : 0.5, 1);
  const fz = parseFloat((fzRange.max - (fzRange.max - fzRange.min) * hardFactor).toFixed(4));

  // Скорость подачи: Vf = fz * z * n
  const vf = Math.round(fz * flutes * n);

  // Глубина и ширина резания
  const ap = parseFloat((diameter * AP_RATIO[operation]).toFixed(2));
  const ae = parseFloat((diameter * AE_RATIO[operation]).toFixed(2));

  // MRR = ae * ap * Vf / 1000 (см³/мин)
  const mrr = parseFloat(((ae * ap * vf) / 1000).toFixed(2));

  // Мощность резания (упрощённая оценка)
  const kc = mat.group === "aluminum" ? 700 : mat.group === "cast_iron" ? 1300 : 2200;
  const powerKw = parseFloat(((kc * ae * ap * vf) / (60 * 1e6)).toFixed(2));

  // Стойкость инструмента
  const toolLife = isCarbide
    ? mat.group === "aluminum" ? "120–180 мин" : "60–90 мин"
    : mat.group === "aluminum" ? "60–90 мин" : "30–45 мин";

  // Генерация G-кода
  const opComment = OPERATION_LABELS[operation];
  const gcode = [
    `; === Режимы резания (${opComment}) ===`,
    `; Материал: ${material} | Инструмент: Ø${diameter} мм (${flutes} зуб.)`,
    `; Vc=${vc} м/мин | n=${n} об/мин | Vf=${vf} мм/мин`,
    `; ap=${ap} мм | ae=${ae} мм | MRR=${mrr} см³/мин`,
    ``,
    `G21 G90 G54`,
    `T01 M06  ; ${isCarbide ? "Твёрдосплавная" : "HSS"} фреза Ø${diameter}`,
    `S${n} M03  ; Обороты шпинделя`,
    `G00 Z5.0`,
    `G00 X0 Y0`,
    `G01 Z-${ap} F${Math.round(vf * 0.3)}  ; Врезание`,
    `G01 X100 F${vf}  ; Рабочий ход`,
    `G00 Z50.0`,
    `M05 M09`,
    `M30`,
  ].join("\n");

  return { vc, n, fz, vf, ap, ae, mrr, powerKw, toolLife, gcode };
}
