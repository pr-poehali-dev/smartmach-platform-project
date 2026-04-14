export type Tool =
  | "select" | "move"
  | "line" | "polyline" | "rect" | "circle" | "ellipse" | "arc" | "spline"
  | "dimension" | "dim-aligned" | "dim-radius" | "dim-diameter" | "dim-angular" | "leader" | "text" | "mtext"
  | "hatch"
  | "erase" | "rotate" | "scale" | "mirror" | "offset" | "trim" | "extend" | "fillet" | "chamfer" | "array" | "stretch" | "break";

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export const TOOLS: { id: Tool; icon: string; label: string; key?: string }[] = [
  // Навигация
  { id: "select",       icon: "MousePointer2", label: "Выбор (V)",              key: "v" },
  { id: "move",         icon: "Move",          label: "Переместить (M)",         key: "m" },
  // Рисование
  { id: "line",         icon: "Minus",         label: "Отрезок (L)",             key: "l" },
  { id: "polyline",     icon: "Spline",        label: "Полилиния (PL)",          key: "p" },
  { id: "rect",         icon: "Square",        label: "Прямоугольник (REC)",     key: "r" },
  { id: "circle",       icon: "Circle",        label: "Окружность (C)",          key: "c" },
  { id: "arc",          icon: "Aperture",      label: "Дуга (A)",                key: "a" },
  { id: "ellipse",      icon: "Ellipsis",      label: "Эллипс (EL)" },
  { id: "spline",       icon: "Waves",         label: "Сплайн (SPL)" },
  { id: "hatch",        icon: "Grid2x2",       label: "Штриховка (H)",           key: "h" },
  // Аннотации
  { id: "dimension",    icon: "Ruler",          label: "Линейный размер (DLI)",   key: "d" },
  { id: "dim-aligned",  icon: "Ruler",          label: "Выровненный размер (DAL)" },
  { id: "dim-radius",   icon: "Circle",         label: "Радиус (DRA)" },
  { id: "dim-diameter", icon: "Target",         label: "Диаметр (DDI)" },
  { id: "dim-angular",  icon: "RotateCcw",      label: "Угловой размер (DAN)" },
  { id: "leader",       icon: "ArrowUpRight",   label: "Выноска (LE)" },
  { id: "text",         icon: "Type",           label: "Однострочный текст (T)",  key: "t" },
  { id: "mtext",        icon: "AlignLeft",      label: "Многострочный текст (MT)" },
  // Редактирование
  { id: "erase",        icon: "Eraser",         label: "Удалить (E)",             key: "e" },
  { id: "rotate",       icon: "RotateCw",       label: "Повернуть (RO)" },
  { id: "scale",        icon: "Maximize2",      label: "Масштаб (SC)" },
  { id: "mirror",       icon: "FlipHorizontal", label: "Зеркало (MI)" },
  { id: "offset",       icon: "AlignCenter",    label: "Подобие (O)" },
  { id: "trim",         icon: "Scissors",       label: "Обрезать (TR)" },
  { id: "extend",       icon: "ArrowRight",     label: "Удлинить (EX)" },
  { id: "fillet",       icon: "ArrowDownRight", label: "Сопряжение (F)" },
  { id: "chamfer",      icon: "ChevronRight",   label: "Фаска (CHA)" },
  { id: "array",        icon: "Grid3x3",        label: "Массив (AR)" },
  { id: "stretch",      icon: "GripHorizontal", label: "Растянуть (S)" },
  { id: "break",        icon: "SplitSquare",    label: "Разорвать (BR)" },
];

// Группы для левой боковой панели
export const TOOL_GROUPS: { label: string; ids: Tool[] }[] = [
  { label: "Навигация",      ids: ["select", "move"] },
  { label: "Рисование",      ids: ["line", "polyline", "rect", "circle", "arc", "ellipse", "spline"] },
  { label: "Штриховка",      ids: ["hatch"] },
  { label: "Размеры",        ids: ["dimension", "dim-aligned", "dim-radius", "dim-diameter", "dim-angular", "leader"] },
  { label: "Текст",          ids: ["text", "mtext"] },
  { label: "Редактирование", ids: ["erase", "rotate", "scale", "mirror", "offset", "trim", "extend", "fillet", "chamfer", "array", "stretch", "break"] },
];

// Ribbon-вкладки в стиле AutoCAD
export type RibbonTab = "home" | "annotate" | "view" | "output";

export const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
  { id: "home",     label: "Главная" },
  { id: "annotate", label: "Аннотации" },
  { id: "view",     label: "Вид" },
  { id: "output",   label: "Вывод" },
];

export interface RibbonGroup {
  label: string;
  items: { type: "tool"; id: Tool; large?: boolean }
       | { type: "action"; id: string; icon: string; label: string; large?: boolean }[];
}

export const LAYER_COLORS = [
  "#000000", "#1e40af", "#dc2626", "#16a34a",
  "#9333ea", "#ea580c", "#0891b2", "#d97706",
];

export const STROKES      = [0.18, 0.25, 0.35, 0.5, 0.7, 1, 1.4, 2];
export const GRID         = 20;
export const GRID_MAJOR   = 100;
export const LINE_TYPES   = ["Сплошная", "Штриховая", "Осевая", "Пунктирная", "Штрих-пунктир"];

export const PAPER_SIZES: Record<string, [number, number]> = {
  "A4 горизонт.": [1122, 794],
  "A4 вертикал.": [794,  1122],
  "A3 горизонт.": [1587, 1122],
  "A3 вертикал.": [1122, 1587],
  "A2 горизонт.": [2245, 1587],
  "A1 горизонт.": [3178, 2245],
  "Свободно":     [0, 0],
};

export function snapToGrid(v: number, size = GRID) {
  return Math.round(v / size) * size;
}