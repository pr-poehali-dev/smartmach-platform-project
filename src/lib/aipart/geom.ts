/**
 * Примитивы чертежа в миллиметрах листа (ось Y вниз) и построители
 * размеров, штриховки и знаков шероховатости по ГОСТ 2.307, 2.306, 2.309.
 * Чистая геометрия — без зависимостей от холста, поэтому полностью тестируется.
 */
import { fmt } from "@/lib/aipart/model";

export type Style = "main" | "thin" | "axis" | "hidden";

export type Prim =
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; s: Style }
  | { t: "circle"; cx: number; cy: number; r: number; s: Style }
  /** Дуга по часовой стрелке экрана от a0 до a1, градусы (0 — вправо, 90 — вниз) */
  | { t: "arc"; cx: number; cy: number; r: number; a0: number; a1: number; s: Style }
  | { t: "poly"; pts: [number, number][]; fill: boolean; s: Style }
  | { t: "text"; x: number; y: number; text: string; h: number; anchor: "start" | "middle" | "end"; rot?: number };

export type Shape =
  | { rect: [number, number, number, number] }   // x0, y0, x1, y1
  | { circle: [number, number, number] };         // cx, cy, r

export const FONT_H = 3.5;
const ARROW_L = 2.5;
const ARROW_W = 0.55;
const EXT_OVER = 2;

/** Ширина надписи шрифтом ГОСТ 2.304 тип Б (оценка), мм */
export const textW = (s: string, h = FONT_H) => s.length * h * 0.56;

export class Sheet {
  prims: Prim[] = [];

  line(x1: number, y1: number, x2: number, y2: number, s: Style = "main") {
    this.prims.push({ t: "line", x1, y1, x2, y2, s });
  }
  circle(cx: number, cy: number, r: number, s: Style = "main") {
    this.prims.push({ t: "circle", cx, cy, r, s });
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, s: Style = "main") {
    this.prims.push({ t: "arc", cx, cy, r, a0, a1, s });
  }
  text(x: number, y: number, text: string, anchor: "start" | "middle" | "end" = "middle", h = FONT_H, rot?: number) {
    this.prims.push({ t: "text", x, y, text, h, anchor, rot });
  }

  /** Стрелка с остриём в (x, y), направленная по углу ang (рад) */
  arrow(x: number, y: number, ang: number) {
    const bx = x - Math.cos(ang) * ARROW_L, by = y - Math.sin(ang) * ARROW_L;
    const nx = -Math.sin(ang) * ARROW_W, ny = Math.cos(ang) * ARROW_W;
    this.prims.push({ t: "poly", pts: [[x, y], [bx + nx, by + ny], [bx - nx, by - ny]], fill: true, s: "thin" });
  }

  /** Горизонтальный размер: выносные линии от (x1, yA) и (x2, yB) до уровня yDim */
  hdim(x1: number, x2: number, yA: number, yB: number, yDim: number, text: string) {
    if (x2 < x1) [x1, x2, yA, yB] = [x2, x1, yB, yA];
    const dir = (from: number) => (yDim >= from ? 1 : -1);
    if (Math.abs(yDim - yA) > 0.5) this.line(x1, yA + dir(yA) * 1, x1, yDim + dir(yA) * EXT_OVER, "thin");
    if (Math.abs(yDim - yB) > 0.5) this.line(x2, yB + dir(yB) * 1, x2, yDim + dir(yB) * EXT_OVER, "thin");
    const span = x2 - x1;
    const tw = textW(text);
    if (span >= 2 * ARROW_L + 3) {
      this.line(x1, yDim, x2, yDim, "thin");
      this.arrow(x1, yDim, Math.PI);
      this.arrow(x2, yDim, 0);
    } else {
      this.line(x1 - 6, yDim, x2 + 6, yDim, "thin");
      this.arrow(x1, yDim, 0);
      this.arrow(x2, yDim, Math.PI);
    }
    if (tw + 2 <= span) this.text((x1 + x2) / 2, yDim - 0.8, text, "middle");
    else {
      this.line(x2, yDim, x2 + 6 + tw, yDim, "thin");
      this.text(x2 + 6, yDim - 0.8, text, "start");
    }
  }

  /** Вертикальный размер: выносные линии от (xA, y1) и (xB, y2) до уровня xDim, текст слева от линии */
  vdim(y1: number, y2: number, xA: number, xB: number, xDim: number, text: string) {
    if (y2 < y1) [y1, y2, xA, xB] = [y2, y1, xB, xA];
    const dir = (from: number) => (xDim >= from ? 1 : -1);
    if (Math.abs(xDim - xA) > 0.5) this.line(xA + dir(xA) * 1, y1, xDim + dir(xA) * EXT_OVER, y1, "thin");
    if (Math.abs(xDim - xB) > 0.5) this.line(xB + dir(xB) * 1, y2, xDim + dir(xB) * EXT_OVER, y2, "thin");
    const span = y2 - y1;
    const tw = textW(text);
    if (span >= 2 * ARROW_L + 3) {
      this.line(xDim, y1, xDim, y2, "thin");
      this.arrow(xDim, y1, -Math.PI / 2);
      this.arrow(xDim, y2, Math.PI / 2);
    } else {
      this.line(xDim, y1 - 6, xDim, y2 + 6, "thin");
      this.arrow(xDim, y1, Math.PI / 2);
      this.arrow(xDim, y2, -Math.PI / 2);
    }
    if (tw + 2 <= span) this.text(xDim - 0.8, (y1 + y2) / 2, text, "middle", FONT_H, -90);
    else {
      this.line(xDim, y1, xDim, y1 - 6 - tw, "thin");
      this.text(xDim - 0.8, y1 - 6 - tw / 2, text, "middle", FONT_H, -90);
    }
  }

  /** Выноска с полкой: от точки (x, y) под углом к полке, текст над полкой */
  leader(x: number, y: number, dx: number, dy: number, text: string, dot = false) {
    const ex = x + dx, ey = y + dy;
    const tw = textW(text);
    const right = dx >= 0;
    this.line(x, y, ex, ey, "thin");
    this.line(ex, ey, right ? ex + tw + 1 : ex - tw - 1, ey, "thin");
    this.text(right ? ex + 0.5 : ex - 0.5, ey - 0.8, text, right ? "start" : "end");
    if (dot) this.circle(x, y, 0.5, "thin");
    else this.arrow(x, y, Math.atan2(-dy, -dx));
  }

  /** Знак шероховатости ГОСТ 2.309: вершина в (x, y) на поверхности, знак над ней */
  roughness(x: number, y: number, ra: number) {
    const h = FONT_H * 1.5;
    this.line(x, y, x - h * 0.58, y - h, "thin");
    this.line(x, y, x + h * 1.15, y - 2 * h, "thin");
    const label = `Ra ${fmt(ra)}`;
    const tw = textW(label, 3);
    this.line(x + h * 1.15, y - 2 * h, x + h * 1.15 + tw + 1, y - 2 * h, "thin");
    this.text(x + h * 1.15 + 0.5, y - 2 * h - 0.7, label, "start", 3);
  }

  /** Штриховка сечения под 45° (ГОСТ 2.306): base — объединение, holes — вычитание */
  hatch(base: Shape[], holes: Shape[] = [], step = 2.2) {
    const boxes = base.map(bbox);
    const minC = Math.min(...boxes.map((b) => b[0] + b[1]));
    const maxC = Math.max(...boxes.map((b) => b[2] + b[3]));
    const dc = step * Math.SQRT2;
    for (let c = Math.ceil(minC / dc) * dc; c <= maxC; c += dc) {
      const ins = union(base.map((s) => span(s, c)).filter(Boolean) as [number, number][]);
      const outs = holes.map((s) => span(s, c)).filter(Boolean) as [number, number][];
      for (const [a, b] of subtract(ins, outs)) {
        if (b - a > 0.15) this.line(a, c - a, b, c - b, "thin");
      }
    }
  }
}

function bbox(s: Shape): [number, number, number, number] {
  if ("rect" in s) {
    const [x0, y0, x1, y1] = s.rect;
    return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
  }
  const [cx, cy, r] = s.circle;
  return [cx - r, cy - r, cx + r, cy + r];
}

/** Интервал параметра t (x = t, y = c − t), попадающий в фигуру */
export function span(s: Shape, c: number): [number, number] | null {
  if ("rect" in s) {
    const [x0, y0, x1, y1] = bbox(s);
    const a = Math.max(x0, c - y1), b = Math.min(x1, c - y0);
    return a < b ? [a, b] : null;
  }
  const [cx, cy, r] = s.circle;
  const k = c - cy;
  const A = 2, B = -2 * (cx + k), C = cx * cx + k * k - r * r;
  const D = B * B - 4 * A * C;
  if (D <= 0) return null;
  const q = Math.sqrt(D);
  return [(-B - q) / (2 * A), (-B + q) / (2 * A)];
}

export function union(iv: [number, number][]): [number, number][] {
  const s = [...iv].sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  for (const [a, b] of s) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

export function subtract(ins: [number, number][], outs: [number, number][]): [number, number][] {
  let cur = ins;
  for (const [oa, ob] of outs) {
    const next: [number, number][] = [];
    for (const [a, b] of cur) {
      if (ob <= a || oa >= b) { next.push([a, b]); continue; }
      if (oa > a) next.push([a, oa]);
      if (ob < b) next.push([ob, b]);
    }
    cur = next;
  }
  return cur;
}
