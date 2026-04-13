export type Tool = "select" | "line" | "polyline" | "rect" | "circle" | "ellipse"
                | "arc" | "dimension" | "text" | "hatch" | "erase" | "move";

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export const TOOLS: { id: Tool; icon: string; label: string; group: string }[] = [
  { id: "select",    icon: "MousePointer", label: "Выбор (V)",          group: "nav" },
  { id: "move",      icon: "Move",         label: "Переместить (M)",    group: "nav" },
  { id: "line",      icon: "Minus",        label: "Отрезок (L)",        group: "draw" },
  { id: "polyline",  icon: "Spline",       label: "Полилиния (P)",      group: "draw" },
  { id: "rect",      icon: "Square",       label: "Прямоугольник (R)",  group: "draw" },
  { id: "circle",    icon: "Circle",       label: "Окружность (C)",     group: "draw" },
  { id: "ellipse",   icon: "Ellipsis",     label: "Эллипс (E)",         group: "draw" },
  { id: "arc",       icon: "Aperture",     label: "Дуга (A)",           group: "draw" },
  { id: "dimension", icon: "Ruler",        label: "Размер (D)",         group: "annotate" },
  { id: "text",      icon: "Type",         label: "Текст (T)",          group: "annotate" },
  { id: "hatch",     icon: "Grid2x2",      label: "Штриховка (H)",      group: "annotate" },
  { id: "erase",     icon: "Eraser",       label: "Удалить (Del)",      group: "edit" },
];

export const TOOL_GROUPS = [
  { label: "Навигация",      ids: ["select", "move"] },
  { label: "Рисование",      ids: ["line", "polyline", "rect", "circle", "ellipse", "arc"] },
  { label: "Аннотации",      ids: ["dimension", "text", "hatch"] },
  { label: "Редактирование", ids: ["erase"] },
];

export const LAYER_COLORS = [
  "#000000", "#1e40af", "#dc2626", "#16a34a",
  "#9333ea", "#ea580c", "#0891b2", "#d97706",
];

export const STROKES      = [0.3, 0.5, 1, 1.5, 2, 3];
export const GRID         = 20;
export const GRID_MAJOR   = 100;
export const LINE_TYPES   = ["Сплошная", "Штриховая", "Осевая", "Пунктирная"];

export const PAPER_SIZES: Record<string, [number, number]> = {
  "A4 гориз.": [1122, 794],
  "A4 верт.":  [794,  1122],
  "A3 гориз.": [1587, 1122],
  "A3 верт.":  [1122, 1587],
  "A2 гориз.": [2245, 1587],
  "Свободно":  [0, 0],
};

export function snapToGrid(v: number, size = GRID) {
  return Math.round(v / size) * size;
}
