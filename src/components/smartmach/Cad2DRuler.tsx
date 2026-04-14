/**
 * Линейки для 2D-чертёжного редактора.
 * Горизонтальная (сверху) + вертикальная (слева).
 * Деления в мм, учёт zoom и scrollOffset канваса.
 * Курсорные линии — перекрестие по текущим координатам.
 * Соответствует принятым в черчении стандартам.
 */
import { useEffect, useRef, useCallback } from "react";

interface Props {
  /** Zoom-уровень канваса (1 = 100%) */
  zoom: number;
  /** Смещение прокрутки контейнера (scrollLeft, scrollTop) */
  scrollX: number;
  scrollY: number;
  /** Текущие координаты курсора в px канваса */
  cursorX: number;
  cursorY: number;
  /** Ширина и высота канваса (px) */
  canvasW: number;
  canvasH: number;
  /** Тема (dark/light) */
  theme?: "light" | "dark";
  /** Высота горизонтальной линейки (px) */
  rulerSize?: number;
}

// Масштаб: A4 горизонт = 1122px = 297мм → 1мм = 1122/297 ≈ 3.779px
const PX_PER_MM = 1122 / 297; // ~3.779

// Шаги делений в мм (выбирается в зависимости от zoom)
function getStep(zoom: number): { major: number; minor: number; mid: number } {
  const effectivePx = PX_PER_MM * zoom; // px на 1мм при текущем zoom
  if (effectivePx > 15) return { major: 10, minor: 1, mid: 5 };
  if (effectivePx > 7)  return { major: 20, minor: 2, mid: 10 };
  if (effectivePx > 3)  return { major: 50, minor: 5, mid: 25 };
  return { major: 100, minor: 10, mid: 50 };
}

// Линейка нарисована через Canvas 2D (не Fabric) — точный рендер
function drawHRuler(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  zoom: number, scrollX: number,
  theme: "light" | "dark",
) {
  const bg   = theme === "dark" ? "#1a1c2e" : "#f3f4f6";
  const fg   = theme === "dark" ? "#6b7280" : "#9ca3af";
  const text = theme === "dark" ? "#9ca3af" : "#374151";
  const border = theme === "dark" ? "#374151" : "#d1d5db";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Нижняя граница
  ctx.strokeStyle = border;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, height); ctx.lineTo(width, height); ctx.stroke();

  const { major, minor } = getStep(zoom);
  const pxPerMM = PX_PER_MM * zoom;
  const startMM = Math.floor(-scrollX / pxPerMM / minor) * minor;
  const endMM   = Math.ceil((width - scrollX) / pxPerMM / minor) * minor;

  ctx.textAlign = "left";
  ctx.font = `9px "Courier Prime", monospace`;
  ctx.fillStyle = text;

  for (let mm = startMM; mm <= endMM; mm += minor) {
    const x = mm * pxPerMM + scrollX;
    if (x < 0 || x > width) continue;

    const isMajor = mm % major === 0;
    const isMid   = mm % (major / 2) === 0;

    ctx.strokeStyle = fg;
    ctx.lineWidth = isMajor ? 0.8 : 0.4;
    const tickH = isMajor ? height * 0.65 : isMid ? height * 0.45 : height * 0.25;

    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x, height - tickH);
    ctx.stroke();

    if (isMajor) {
      ctx.fillStyle = text;
      ctx.fillText(String(mm), x + 1.5, height - tickH - 1);
    }
  }
}

function drawVRuler(
  ctx: CanvasRenderingContext2D,
  width: number, height: number,
  zoom: number, scrollY: number,
  theme: "light" | "dark",
) {
  const bg     = theme === "dark" ? "#1a1c2e" : "#f3f4f6";
  const fg     = theme === "dark" ? "#6b7280" : "#9ca3af";
  const text   = theme === "dark" ? "#9ca3af" : "#374151";
  const border = theme === "dark" ? "#374151" : "#d1d5db";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = border;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(width, 0); ctx.lineTo(width, height); ctx.stroke();

  const { major, minor } = getStep(zoom);
  const pxPerMM = PX_PER_MM * zoom;
  const startMM = Math.floor(-scrollY / pxPerMM / minor) * minor;
  const endMM   = Math.ceil((height - scrollY) / pxPerMM / minor) * minor;

  ctx.save();
  ctx.font = `9px "Courier Prime", monospace`;
  ctx.fillStyle = text;

  for (let mm = startMM; mm <= endMM; mm += minor) {
    const y = mm * pxPerMM + scrollY;
    if (y < 0 || y > height) continue;

    const isMajor = mm % major === 0;
    const isMid   = mm % (major / 2) === 0;

    ctx.strokeStyle = fg;
    ctx.lineWidth = isMajor ? 0.8 : 0.4;
    const tickW = isMajor ? width * 0.65 : isMid ? width * 0.45 : width * 0.25;

    ctx.beginPath();
    ctx.moveTo(width, y);
    ctx.lineTo(width - tickW, y);
    ctx.stroke();

    if (isMajor) {
      ctx.save();
      ctx.translate(width - tickW - 2, y - 1);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "left";
      ctx.fillText(String(mm), 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

export default function Cad2DRuler({
  zoom, scrollX, scrollY, cursorX, cursorY,
  canvasW, canvasH, theme = "light", rulerSize = 20,
}: Props) {
  const hRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef<HTMLCanvasElement>(null);

  const redrawH = useCallback(() => {
    const c = hRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    drawHRuler(ctx, c.width, c.height, zoom, scrollX, theme);

    // Курсорная линия
    const x = cursorX * zoom + scrollX;
    if (x >= 0 && x <= c.width) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
    }
  }, [zoom, scrollX, cursorX, theme]);

  const redrawV = useCallback(() => {
    const c = vRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    drawVRuler(ctx, c.width, c.height, zoom, scrollY, theme);

    // Курсорная линия
    const y = cursorY * zoom + scrollY;
    if (y >= 0 && y <= c.height) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
    }
  }, [zoom, scrollY, cursorY, theme]);

  useEffect(() => { redrawH(); }, [redrawH]);
  useEffect(() => { redrawV(); }, [redrawV]);

  // Подгоняем размер canvas под контейнер при ресайзе
  useEffect(() => {
    const hc = hRef.current; const vc = vRef.current;
    if (hc) { hc.width = hc.offsetWidth || canvasW; hc.height = rulerSize; }
    if (vc) { vc.width = rulerSize; vc.height = vc.offsetHeight || canvasH; }
    redrawH(); redrawV();
  }, [canvasW, canvasH, rulerSize, redrawH, redrawV]);

  const corner = theme === "dark" ? "#1a1c2e" : "#f3f4f6";
  const border = theme === "dark" ? "#374151" : "#d1d5db";

  return (
    <>
      {/* Угловой квадрат */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          left: 0, top: 0,
          width: rulerSize, height: rulerSize,
          background: corner,
          borderRight: `0.5px solid ${border}`,
          borderBottom: `0.5px solid ${border}`,
        }}
      />

      {/* Горизонтальная линейка */}
      <canvas
        ref={hRef}
        className="absolute pointer-events-none z-10"
        style={{
          left: rulerSize, top: 0,
          height: rulerSize,
          width: `calc(100% - ${rulerSize}px)`,
        }}
        height={rulerSize}
      />

      {/* Вертикальная линейка */}
      <canvas
        ref={vRef}
        className="absolute pointer-events-none z-10"
        style={{
          left: 0, top: rulerSize,
          width: rulerSize,
          height: `calc(100% - ${rulerSize}px)`,
        }}
        width={rulerSize}
      />

      {/* Перекрестие курсора поверх канваса */}
      <div
        className="absolute pointer-events-none z-[5]"
        style={{
          left: cursorX * zoom + scrollX + rulerSize,
          top: 0,
          width: 0.5,
          height: "100%",
          background: "rgba(239,68,68,0.35)",
        }}
      />
      <div
        className="absolute pointer-events-none z-[5]"
        style={{
          top: cursorY * zoom + scrollY + rulerSize,
          left: 0,
          height: 0.5,
          width: "100%",
          background: "rgba(239,68,68,0.35)",
        }}
      />
    </>
  );
}
