/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Перенос сгенерированного чертежа на холст fabric: рамка и основная надпись ГОСТ Р 2.104
 * (та же, что в редакторе), объекты чертежа — редактируемые линии/дуги/тексты.
 * Результат — canvas_json (открывается в редакторе) и PNG-превью для библиотеки.
 */
import type { Prim } from "@/lib/aipart/geom";
import { arcPath } from "@/lib/aipart/svg";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";
import { drawGostFrame, type GostFrameOptions } from "@/components/smartmach/useCad2DCanvas";

const WIDTH: Record<string, number> = { main: 0.7, thin: 0.25, axis: 0.25, hidden: 0.35 };
const DASH: Record<string, number[] | undefined> = { axis: [10, 2, 1.5, 2], hidden: [3, 1.5] };

export async function renderToFabric(prims: Prim[], paper: string, gost: GostFrameOptions) {
  const fabric = await import("fabric");
  const [pw, ph] = PAPER_SIZES[paper] ?? PAPER_SIZES["A4 горизонт."];
  const k = pw / (ph > pw ? 210 : paper.startsWith("A3") ? 420 : 297);
  const el = document.createElement("canvas");
  const fc = new fabric.StaticCanvas(el, { width: pw, height: ph, backgroundColor: "#ffffff", renderOnAddRemove: false });

  drawGostFrame(fc as any, pw, ph, gost);

  const stroke = (s: string) => ({
    stroke: "#000000", strokeWidth: Math.max(WIDTH[s] * k, 0.6),
    strokeDashArray: DASH[s]?.map((v) => v * k), strokeUniform: true, fill: "",
  });

  for (const p of prims) {
    let o: any;
    if (p.t === "line") o = new fabric.Line([p.x1 * k, p.y1 * k, p.x2 * k, p.y2 * k], stroke(p.s));
    else if (p.t === "circle") o = new fabric.Circle({ left: (p.cx - p.r) * k, top: (p.cy - p.r) * k, radius: p.r * k, ...stroke(p.s), fill: "transparent" });
    else if (p.t === "arc") o = new fabric.Path(arcPath(p.cx * k, p.cy * k, p.r * k, p.a0, p.a1), stroke(p.s));
    else if (p.t === "poly") o = new fabric.Polygon(p.pts.map(([x, y]) => ({ x: x * k, y: y * k })), { ...stroke(p.s), fill: p.fill ? "#000000" : "" });
    else if (p.t === "text") {
      o = new fabric.FabricText(p.text, {
        left: p.x * k, top: p.y * k, fontSize: p.h * k * 1.1, fontStyle: "italic",
        fontFamily: "Arial Narrow, Arial, sans-serif", fill: "#000000",
        originX: p.anchor === "start" ? "left" : p.anchor === "end" ? "right" : "center",
        originY: "bottom", angle: p.rot ?? 0,
      });
    }
    if (o) { o.__ai = true; fc.add(o); }
  }
  fc.renderAll();
  const json = JSON.stringify(fc.toJSON());
  const png = fc.toDataURL({ format: "png", multiplier: 1.5 });
  fc.dispose();
  return { json, png };
}
