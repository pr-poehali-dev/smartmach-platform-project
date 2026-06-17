/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Протокол ИИ-агента-инженера.
 * Языковая модель возвращает чертёж в виде структурированного JSON
 * (массив примитивов), а рендерер преобразует его в объекты fabric.js.
 *
 * Все координаты — в миллиметрах рабочего поля; рендерер сам масштабирует
 * их в пиксели холста и центрирует деталь.
 */

export type AiPrimitive =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; style?: LineStyle }
  | { type: "rect"; x: number; y: number; w: number; h: number; style?: LineStyle }
  | { type: "circle"; cx: number; cy: number; r: number; style?: LineStyle }
  | { type: "arc"; cx: number; cy: number; r: number; start: number; end: number; style?: LineStyle }
  | { type: "axis"; x1: number; y1: number; x2: number; y2: number } // осевая (штрих-пунктир)
  | { type: "dim"; x1: number; y1: number; x2: number; y2: number; text: string; offset?: number } // линейный размер
  | { type: "diameter"; cx: number; cy: number; r: number; text: string } // ∅ выноска
  | { type: "text"; x: number; y: number; text: string; size?: number };

type LineStyle = "main" | "thin" | "dashed" | "hidden";

export interface AiDraft {
  title: string;        // наименование детали
  designation?: string; // обозначение (МАТ-1.000.0XX)
  material?: string;    // материал
  paperSize?: string;   // рекомендуемый формат
  units?: string;       // единицы (мм)
  primitives: AiPrimitive[];
  notes?: string[];     // технические требования / пояснения
}

// ── Цвета и толщины по ГОСТ 2.303 ───────────────────────────────
const INK = "#0f3d91";
const THIN = "#475569";
const DIMC = "#475569";
const AXISC = "#dc2626";

function styleProps(style?: LineStyle) {
  switch (style) {
    case "thin":   return { stroke: THIN, strokeWidth: 1 };
    case "dashed": return { stroke: THIN, strokeWidth: 1, strokeDashArray: [8, 4] };
    case "hidden": return { stroke: THIN, strokeWidth: 1.2, strokeDashArray: [10, 4] };
    default:       return { stroke: INK, strokeWidth: 2 };
  }
}

/**
 * Рендерит набор примитивов в fabric-объекты и добавляет на холст.
 * @returns массив добавленных объектов (чтобы можно было отменить).
 */
export async function renderAiDraft(
  fabric: any,            // модуль fabric (динамический импорт)
  fc: any,                // экземпляр Canvas
  draft: AiDraft,
  originX: number,        // px — левый отступ рабочего поля
  originY: number,        // px — верхний отступ
  scale: number,          // px/мм
): Promise<any[]> {
  const { Line, Rect, Circle, IText, Path } = fabric;
  const added: any[] = [];
  const FONT = "Courier Prime, Courier New, monospace";

  const X = (mm: number) => originX + mm * scale;
  const Y = (mm: number) => originY + mm * scale;

  const push = (obj: any) => { fc.add(obj); added.push(obj); return obj; };

  const mkLine = (x1: number, y1: number, x2: number, y2: number, st?: LineStyle) =>
    push(new Line([X(x1), Y(y1), X(x2), Y(y2)], { ...styleProps(st), selectable: true, evented: true }));

  const mkText = (text: string, x: number, y: number, size = 12, color = INK) =>
    push(new IText(text, {
      left: X(x), top: Y(y), fontSize: size * scale * 0.4 + 6, fontFamily: FONT,
      fill: color, selectable: true, evented: true,
    }));

  // Засечка размерной линии
  const tick = (x: number, y: number) => {
    const a = 5;
    push(new Line([X(x), Y(y) - a, X(x), Y(y) + a], { stroke: DIMC, strokeWidth: 1, selectable: true, evented: true }));
  };

  for (const p of draft.primitives) {
    switch (p.type) {
      case "line":
        mkLine(p.x1, p.y1, p.x2, p.y2, p.style);
        break;
      case "rect":
        push(new Rect({
          left: X(p.x), top: Y(p.y), width: p.w * scale, height: p.h * scale,
          fill: "transparent", ...styleProps(p.style), selectable: true, evented: true,
        }));
        break;
      case "circle":
        push(new Circle({
          left: X(p.cx) - p.r * scale, top: Y(p.cy) - p.r * scale, radius: p.r * scale,
          fill: "transparent", ...styleProps(p.style), selectable: true, evented: true,
        }));
        break;
      case "arc": {
        const r = p.r * scale;
        const a0 = (p.start * Math.PI) / 180;
        const a1 = (p.end * Math.PI) / 180;
        const sx = X(p.cx) + r * Math.cos(a0);
        const sy = Y(p.cy) + r * Math.sin(a0);
        const ex = X(p.cx) + r * Math.cos(a1);
        const ey = Y(p.cy) + r * Math.sin(a1);
        const large = Math.abs(p.end - p.start) > 180 ? 1 : 0;
        const d = `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
        push(new Path(d, { fill: "", ...styleProps(p.style), selectable: true, evented: true }));
        break;
      }
      case "axis":
        push(new Line([X(p.x1), Y(p.y1), X(p.x2), Y(p.y2)], {
          stroke: AXISC, strokeWidth: 1, strokeDashArray: [16, 4, 3, 4],
          selectable: true, evented: true,
        }));
        break;
      case "dim": {
        const off = p.offset ?? 0;
        // выносим размерную линию параллельно
        const isH = Math.abs(p.y1 - p.y2) < Math.abs(p.x1 - p.x2);
        const dy = isH ? off : 0;
        const dx = isH ? 0 : off;
        mkLine(p.x1 + dx, p.y1 + dy, p.x2 + dx, p.y2 + dy, "thin");
        // выносные линии
        if (off) {
          mkLine(p.x1, p.y1, p.x1 + dx, p.y1 + dy, "thin");
          mkLine(p.x2, p.y2, p.x2 + dx, p.y2 + dy, "thin");
        }
        tick(p.x1 + dx, p.y1 + dy);
        tick(p.x2 + dx, p.y2 + dy);
        const mx = (p.x1 + p.x2) / 2 + dx;
        const my = (p.y1 + p.y2) / 2 + dy;
        mkText(p.text, mx, my - 6, 11, DIMC);
        break;
      }
      case "diameter": {
        // выноска диаметра под 45°
        const r = p.r;
        const ex = p.cx + r * 0.707;
        const ey = p.cy - r * 0.707;
        const lx = ex + 10;
        const ly = ey - 10;
        mkLine(ex, ey, lx, ly, "thin");
        mkLine(lx, ly, lx + 14, ly, "thin");
        mkText(p.text, lx + 1, ly - 5, 11, DIMC);
        break;
      }
      case "text":
        mkText(p.text, p.x, p.y, p.size ?? 12);
        break;
    }
  }

  fc.renderAll();
  return added;
}
