/**
 * Рендер примитивов в SVG (мм) — предпросмотр чертежа без холста.
 * Толщины линий по ГОСТ 2.303: основная 0,7, тонкая 0,25.
 */
import type { Prim } from "@/lib/aipart/geom";

const W: Record<string, number> = { main: 0.7, thin: 0.25, axis: 0.25, hidden: 0.35 };
const DASH: Record<string, string | undefined> = { axis: "10 2 1.5 2", hidden: "3 1.5" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const rad = (a: number) => (a * Math.PI) / 180;
  const sweep = ((a1 - a0) % 360 + 360) % 360 || 360;
  const sx = cx + r * Math.cos(rad(a0)), sy = cy + r * Math.sin(rad(a0));
  const ex = cx + r * Math.cos(rad(a0 + sweep)), ey = cy + r * Math.sin(rad(a0 + sweep));
  if (sweep >= 359.99) return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ex} ${ey}`;
}

export function primsToSvgBody(prims: Prim[], ink = "#000"): string {
  const out: string[] = [];
  for (const p of prims) {
    if (p.t === "text") {
      const tr = p.rot ? ` transform="rotate(${p.rot} ${p.x} ${p.y})"` : "";
      out.push(`<text x="${p.x}" y="${p.y}" font-size="${p.h}" text-anchor="${p.anchor}" font-family="Arial Narrow, Arial, sans-serif" font-style="italic" fill="${ink}"${tr}>${esc(p.text)}</text>`);
      continue;
    }
    const st = `stroke="${ink}" stroke-width="${W[p.s]}"${DASH[p.s] ? ` stroke-dasharray="${DASH[p.s]}"` : ""}`;
    if (p.t === "line") out.push(`<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" ${st}/>`);
    else if (p.t === "circle") out.push(`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="none" ${st}/>`);
    else if (p.t === "arc") out.push(`<path d="${arcPath(p.cx, p.cy, p.r, p.a0, p.a1)}" fill="none" ${st}/>`);
    else if (p.t === "poly") out.push(`<polygon points="${p.pts.map((q) => q.join(",")).join(" ")}" fill="${p.fill ? ink : "none"}" ${st}/>`);
  }
  return out.join("");
}

/** Полный лист с рамкой и упрощённым штампом (для предпросмотра) */
export function sheetSvg(prims: Prim[], w: number, h: number, stamp?: { name: string; designation: string; material: string; scale: string; mass: string; company?: string }): string {
  const fr = `<rect x="20" y="5" width="${w - 25}" height="${h - 10}" fill="none" stroke="#000" stroke-width="0.7"/>`;
  let st = "";
  if (stamp) {
    const x = w - 5 - 185, y = h - 5 - 55;
    st = `<g stroke="#000" fill="none">
<rect x="${x}" y="${y}" width="185" height="55" stroke-width="0.7"/>
<line x1="${x}" y1="${y + 15}" x2="${w - 5}" y2="${y + 15}" stroke-width="0.25"/>
<line x1="${x}" y1="${y + 30}" x2="${w - 5}" y2="${y + 30}" stroke-width="0.25"/>
<line x1="${x + 55}" y1="${y}" x2="${x + 55}" y2="${h - 5}" stroke-width="0.25"/>
<line x1="${x + 120}" y1="${y}" x2="${x + 120}" y2="${h - 5}" stroke-width="0.25"/>
</g><g font-family="Arial Narrow, Arial" font-style="italic" fill="#000">
<text x="${x + 87.5}" y="${y + 10}" font-size="5" text-anchor="middle">${esc(stamp.designation)}</text>
<text x="${x + 87.5}" y="${y + 24}" font-size="4.2" text-anchor="middle">${esc(stamp.name)}</text>
<text x="${x + 87.5}" y="${y + 44}" font-size="3.2" text-anchor="middle">${esc(stamp.material)}</text>
<text x="${x + 135}" y="${y + 24}" font-size="3.5">Масса ${esc(stamp.mass)}</text>
<text x="${x + 135}" y="${y + 10}" font-size="3.5">Масштаб ${esc(stamp.scale)}</text>
<text x="${x + 135}" y="${y + 44}" font-size="3.2">${esc(stamp.company ?? "")}</text>
</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm"><rect width="${w}" height="${h}" fill="#fff"/>${fr}${st}${primsToSvgBody(prims)}</svg>`;
}
