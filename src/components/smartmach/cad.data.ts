import Icon from "@/components/ui/icon";

export const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  ok:    { label: "ОК",       color: "text-green-600  bg-green-50  border-green-200",  icon: "CheckCircle" },
  warn:  { label: "Предупр.", color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: "AlertTriangle" },
  error: { label: "Ошибка",   color: "text-red-600    bg-red-50    border-red-200",    icon: "XCircle" },
};

export const CAT_ICONS: Record<string, string> = {
  "Валы и оси":              "Minus",
  "Зубчатые колёса":         "Settings",
  "Корпуса":                 "Package",
  "Крепёж":                  "Link",
  "Подшипниковые узлы":      "CircleDot",
  "Уплотнения":              "Disc",
  "Фланцы":                  "Circle",
  "Пружины":                 "Codesandbox",
  "Муфты":                   "Plug",
  "Шкивы и звёздочки":       "Cpu",
  "Листовые детали":         "Square",
  "Трубопроводные элементы": "GitBranch",
  "Прочее":                  "Box",
};

export const CAT_COLORS: Record<string, string> = {
  "Валы и оси":              "bg-blue-50   text-blue-600",
  "Зубчатые колёса":         "bg-purple-50 text-purple-600",
  "Корпуса":                 "bg-orange-50 text-orange-600",
  "Крепёж":                  "bg-gray-50   text-gray-600",
  "Подшипниковые узлы":      "bg-indigo-50 text-indigo-600",
  "Уплотнения":              "bg-green-50  text-green-600",
  "Фланцы":                  "bg-cyan-50   text-cyan-600",
  "Пружины":                 "bg-pink-50   text-pink-600",
  "Муфты":                   "bg-teal-50   text-teal-600",
  "Шкивы и звёздочки":       "bg-amber-50  text-amber-600",
  "Листовые детали":         "bg-slate-50  text-slate-600",
  "Трубопроводные элементы": "bg-emerald-50 text-emerald-600",
  "Прочее":                  "bg-gray-50   text-gray-500",
};

export const CATEGORIES = Object.keys(CAT_ICONS);

export const STANDARDS = [
  "ГОСТ 2590-2006",
  "ГОСТ 8732-78",
  "ГОСТ 1050-2013",
  "ГОСТ 3478-2019",
  "ГОСТ 9150-2002",
  "ГОСТ 5915-70",
  "ГОСТ 7798-70",
  "ГОСТ 11738-84",
  "ГОСТ 6636-69",
  "ГОСТ 25347-2013",
  "ГОСТ 1643-81",
  "ГОСТ 16162-85",
  "DIN 912",
  "DIN 933",
  "DIN 7991",
  "ISO 286-1",
  "ISO 1101",
  "ISO 2768",
];

export const ROUGHNESS_VALUES = [
  "Ra 0.2", "Ra 0.4", "Ra 0.8", "Ra 1.6",
  "Ra 3.2", "Ra 6.3", "Ra 12.5", "Ra 25",
];

export const FIT_TYPES = [
  "С зазором (H/f, H/g, H/h)",
  "Переходная (H/js, H/k, H/m, H/n)",
  "С натягом (H/p, H/r, H/s, H/t, H/u)",
];

export const MATERIALS = [
  "Сталь 45",
  "Сталь 40Х",
  "Сталь 20",
  "Сталь 12Х18Н10Т",
  "Сталь 65Г",
  "Сталь 30ХГСА",
  "Алюминий АМГ6",
  "Алюминий Д16Т",
  "Алюминий АД31",
  "Титан ВТ6",
  "Чугун СЧ20",
  "Чугун ВЧ50",
  "Бронза БрАЖ9-4",
  "Латунь Л63",
];

/** Плотности материалов, кг/м³ (для автоматического расчёта массы) */
export const MATERIAL_DENSITY: Record<string, number> = {
  "Сталь 45":         7850,
  "Сталь 40Х":        7850,
  "Сталь 20":         7850,
  "Сталь 12Х18Н10Т":  7920,
  "Сталь 65Г":        7850,
  "Сталь 30ХГСА":     7850,
  "Алюминий АМГ6":    2640,
  "Алюминий Д16Т":    2780,
  "Алюминий АД31":    2710,
  "Титан ВТ6":        4430,
  "Чугун СЧ20":       7200,
  "Чугун ВЧ50":       7100,
  "Бронза БрАЖ9-4":   7600,
  "Латунь Л63":       8440,
};

/**
 * Рассчитывает массу параллелепипеда (кг) по размерам в мм и плотности кг/м³.
 * Объём в м³ = L(мм) × W(мм) × H(мм) / 1e9
 */
export function calcMass(L: number, W: number, H: number, densityKgM3: number): number {
  if (!L || !W || !H || !densityKgM3) return 0;
  const volumeM3 = (L * W * H) / 1e9;
  return Math.round(volumeM3 * densityKgM3 * 1000) / 1000; // округление до г
}

/** Форматирует габариты в строку по ГОСТ — «L × W × H мм» */
export function formatDimensions(L: string, W: string, H: string): string {
  const parts = [L, W, H].filter(Boolean).map((v) => `${parseFloat(v)}`);
  return parts.length === 3 ? `${parts[0]} × ${parts[1]} × ${parts[2]} мм` : parts.join(" × ");
}

export const EMPTY = {
  code: "", name: "", category: "Прочее", material: "", version: "v1.0",
  dimensions: "", weight_kg: "", standard: "", notes: "", author_id: "",
  roughness: "", fit_type: "", tolerance: "", drawing_number: "",
  dim_length: "", dim_width: "", dim_height: "",
};

// Тип для передачи данных детали в редакторы
export interface PartInfo {
  id: number;
  code: string;
  name: string;
  material: string | null;
  dimensions: string | null;
  dim_length: number | null;
  dim_width: number | null;
  dim_height: number | null;
  standard: string | null;
  drawing_number: string | null;
  tolerance: string | null;
  roughness: string | null;
  weight_kg: number | null;
  category: string;
}

export function catIcon(cat: string) {
  return (CAT_ICONS[cat] ?? "Box") as Parameters<typeof Icon>[0]["name"];
}

export function catColor(cat: string) {
  return CAT_COLORS[cat] ?? "bg-gray-50 text-gray-500";
}

export const AI_SYSTEM = `Ты — инженер-конструктор в системе СмартМаш. 
Помогаешь с выбором материалов, расчётом допусков и посадок, шероховатостью поверхностей, 
стандартами ЕСКД (ГОСТ, DIN, ISO), выбором типовых деталей из библиотеки, 
параметрическим моделированием и проверкой геометрии. 
Отвечай кратко, с конкретными цифрами и ссылками на стандарты.`;

export const AI_SUGGESTIONS = [
  "Какой материал выбрать для вала редуктора?",
  "Как рассчитать допуск посадки подшипника по ГОСТ?",
  "Какую шероховатость Ra назначить для посадочной поверхности?",
  "Чем отличается Сталь 45 от 40Х по механическим свойствам?",
  "Какие стандарты применяются для зубчатых колёс?",
  "Как обозначить посадку с зазором на чертеже по ЕСКД?",
  "Какой допуск на соосность выбрать для вала и корпуса?",
];

// Хелпер для передачи Part в редакторы 2D/3D
export function partInfoFromPart(part: {
  id: number; code: string; name: string; material: string | null;
  dimensions: string | null; standard: string | null; weight_kg: number | null;
  category: string;
  [key: string]: unknown;
}, form: typeof EMPTY): PartInfo {
  return {
    id: part.id,
    code: part.code,
    name: part.name,
    material: part.material,
    dimensions: part.dimensions,
    dim_length: part.dim_length ? Number(part.dim_length) : (form.dim_length ? Number(form.dim_length) : null),
    dim_width:  part.dim_width  ? Number(part.dim_width)  : (form.dim_width  ? Number(form.dim_width)  : null),
    dim_height: part.dim_height ? Number(part.dim_height) : (form.dim_height ? Number(form.dim_height) : null),
    standard: part.standard,
    drawing_number: (part.drawing_number as string | null) ?? null,
    tolerance:      (part.tolerance      as string | null) ?? null,
    roughness:      (part.roughness      as string | null) ?? null,
    weight_kg: part.weight_kg ?? null,
    category: part.category,
  };
}