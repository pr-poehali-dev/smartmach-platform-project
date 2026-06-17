/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Шаблоны рабочих чертежей для станка МАТ-1.
 * Каждый шаблон содержит:
 *  - метаданные для ГОСТ-рамки (GostFrameOptions)
 *  - функцию drawGeometry(fc, pw, ph) — рисует геометрию детали поверх рамки
 *
 * Геометрия рисуется обычными fabric-объектами (Line/Rect/Circle/IText),
 * поэтому остаётся редактируемой и сохраняется в canvas_json.
 */
import { Line, Rect, Circle, IText } from "fabric";
import type { GostFrameOptions } from "@/components/smartmach/useCad2DCanvas";

export interface MachineTemplate {
  id: string;
  title: string;          // название в UI
  icon: string;           // lucide-иконка
  subtitle: string;       // короткое описание
  paperSize: string;      // формат листа
  gost: GostFrameOptions; // данные основной надписи
  drawGeometry: (fc: any, pw: number, ph: number) => void;
}

// ── Хелперы рисования (стиль ГОСТ 2.303) ─────────────────────────
const INK = "#1e3a8a";
const THIN = "#334155";

function line(fc: any, x1: number, y1: number, x2: number, y2: number, main = true) {
  fc.add(new Line([x1, y1, x2, y2], {
    stroke: main ? INK : THIN,
    strokeWidth: main ? 2 : 1,
    selectable: true, evented: true,
  }));
}

function dashLine(fc: any, x1: number, y1: number, x2: number, y2: number) {
  fc.add(new Line([x1, y1, x2, y2], {
    stroke: THIN, strokeWidth: 1, strokeDashArray: [8, 4],
    selectable: true, evented: true,
  }));
}

function rect(fc: any, x: number, y: number, w: number, h: number) {
  fc.add(new Rect({
    left: x, top: y, width: w, height: h,
    fill: "transparent", stroke: INK, strokeWidth: 2,
    selectable: true, evented: true,
  }));
}

function circle(fc: any, cx: number, cy: number, r: number, main = true) {
  fc.add(new Circle({
    left: cx - r, top: cy - r, radius: r,
    fill: "transparent", stroke: main ? INK : THIN, strokeWidth: main ? 2 : 1,
    selectable: true, evented: true,
  }));
}

function label(fc: any, text: string, x: number, y: number, size = 18) {
  fc.add(new IText(text, {
    left: x, top: y, fontSize: size,
    fontFamily: "Courier Prime, Courier New, monospace",
    fill: INK, selectable: true, evented: true,
  }));
}

// Осевая линия (штрих-пунктир)
function axis(fc: any, x1: number, y1: number, x2: number, y2: number) {
  fc.add(new Line([x1, y1, x2, y2], {
    stroke: "#dc2626", strokeWidth: 1, strokeDashArray: [16, 4, 3, 4],
    selectable: true, evented: true,
  }));
}

// Размерная линия со стрелками-чёрточками и подписью
function dim(fc: any, x1: number, y1: number, x2: number, y2: number, text: string) {
  line(fc, x1, y1, x2, y2, false);
  // засечки
  const a = 6;
  line(fc, x1, y1 - a, x1, y1 + a, false);
  line(fc, x2, y2 - a, x2, y2 + a, false);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  label(fc, text, mx - text.length * 4, my - 22, 14);
}

const COMPANY = "ООО «МАТ-Лабс»";

// ── ШАБЛОН 1: Станина ────────────────────────────────────────────
function drawFrame(fc: any, pw: number, ph: number) {
  const cx = pw * 0.42, cy = ph * 0.42;
  // Вид спереди — прямоугольная станина с рёбрами
  rect(fc, cx - 320, cy - 90, 640, 180);
  // Рёбра жёсткости (внутренние перегородки)
  line(fc, cx - 160, cy - 90, cx - 160, cy + 90);
  line(fc, cx,       cy - 90, cx,       cy + 90);
  line(fc, cx + 160, cy - 90, cx + 160, cy + 90);
  // Направляющие сверху
  rect(fc, cx - 320, cy - 110, 640, 20);
  // Опоры снизу
  rect(fc, cx - 300, cy + 90, 50, 40);
  rect(fc, cx + 250, cy + 90, 50, 40);
  // Осевая
  axis(fc, cx - 360, cy, cx + 360, cy);
  // Размеры
  dim(fc, cx - 320, cy + 160, cx + 320, cy + 160, "800");
  dim(fc, cx - 400, cy - 90, cx - 400, cy + 90, "180");
  label(fc, "Вид спереди", cx - 80, cy - 170, 16);
}

// ── ШАБЛОН 2: Токарный модуль ────────────────────────────────────
function drawLathe(fc: any, pw: number, ph: number) {
  const cx = pw * 0.42, cy = ph * 0.42;
  // Корпус шпиндельной бабки
  rect(fc, cx - 280, cy - 70, 200, 140);
  // Шпиндель (горизонтальный вал)
  rect(fc, cx - 80, cy - 25, 260, 50);
  axis(fc, cx - 300, cy, cx + 260, cy);
  // Патрон трёхкулачковый
  circle(fc, cx + 180, cy, 70);
  circle(fc, cx + 180, cy, 45, false);
  // 3 кулачка
  for (let i = 0; i < 3; i++) {
    const ang = (i * 120) * Math.PI / 180;
    const x = cx + 180 + Math.cos(ang) * 55;
    const y = cy + Math.sin(ang) * 55;
    rect(fc, x - 10, y - 10, 20, 20);
  }
  // Размеры
  dim(fc, cx + 110, cy + 110, cx + 250, cy + 110, "∅140");
  dim(fc, cx - 280, cy + 130, cx + 180, cy + 130, "L=460");
  label(fc, "Шпиндельная бабка с патроном", cx - 200, cy - 130, 16);
}

// ── ШАБЛОН 3: Фрезерная головка ──────────────────────────────────
function drawMill(fc: any, pw: number, ph: number) {
  const cx = pw * 0.42, cy = ph * 0.40;
  // Корпус головки
  rect(fc, cx - 90, cy - 140, 180, 160);
  // Поворотный узел (±45°)
  circle(fc, cx, cy + 20, 60);
  axis(fc, cx, cy - 160, cx, cy + 200);
  // Шпиндель фрезы (вертикальный)
  rect(fc, cx - 22, cy + 20, 44, 150);
  // Цанга ER25
  rect(fc, cx - 30, cy + 170, 60, 30);
  circle(fc, cx, cy + 200, 14, false);
  // Линии наклона ±45°
  dashLine(fc, cx, cy + 20, cx + 130, cy + 150);
  dashLine(fc, cx, cy + 20, cx - 130, cy + 150);
  label(fc, "±45°", cx + 70, cy + 70, 14);
  // Размеры
  dim(fc, cx - 90, cy - 165, cx + 90, cy - 165, "180");
  label(fc, "Поворотная фрезерная головка", cx - 200, cy - 200, 16);
}

export const MACHINE_TEMPLATES: MachineTemplate[] = [
  {
    id: "frame",
    title: "Станина",
    icon: "Layers",
    subtitle: "Базовая станина с рёбрами жёсткости, 800 мм",
    paperSize: "A3 горизонт.",
    gost: {
      paperSize: "A3 горизонт.",
      drawingNumber: "МАТ-1.000.001",
      drawingName: "Станина",
      company: COMPANY,
      designer: "", checker: "", normController: "", approver: "",
      material: "СЧ20 ГОСТ 1412",
      litera: "О", scale: "1:5", mass: "120",
      sheet: "1", sheets: "1",
    },
    drawGeometry: drawFrame,
  },
  {
    id: "lathe",
    title: "Токарный модуль",
    icon: "RefreshCw",
    subtitle: "Шпиндельная бабка с трёхкулачковым патроном ∅140",
    paperSize: "A3 горизонт.",
    gost: {
      paperSize: "A3 горизонт.",
      drawingNumber: "МАТ-1.100.001",
      drawingName: "Бабка шпиндельная",
      company: COMPANY,
      designer: "", checker: "", normController: "", approver: "",
      material: "Сталь 45 ГОСТ 1050",
      litera: "О", scale: "1:2", mass: "28",
      sheet: "1", sheets: "1",
    },
    drawGeometry: drawLathe,
  },
  {
    id: "mill",
    title: "Фрезерная головка",
    icon: "Drill",
    subtitle: "Поворотная головка ±45°, цанга ER25",
    paperSize: "A3 горизонт.",
    gost: {
      paperSize: "A3 горизонт.",
      drawingNumber: "МАТ-1.200.001",
      drawingName: "Головка фрезерная поворотная",
      company: COMPANY,
      designer: "", checker: "", normController: "", approver: "",
      material: "Сталь 40Х ГОСТ 4543",
      litera: "О", scale: "1:2", mass: "14",
      sheet: "1", sheets: "1",
    },
    drawGeometry: drawMill,
  },
];
