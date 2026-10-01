import { describe, it, expect } from "vitest";
import { normalizeModel } from "@/lib/aipart/model";
import { buildDrawing, pickScale, wrapText } from "@/lib/aipart/drawing";
import { span, union, subtract, type Prim } from "@/lib/aipart/geom";
import { sheetSvg } from "@/lib/aipart/svg";

const texts = (p: Prim[]) => p.filter((x) => x.t === "text").map((x) => (x as { text: string }).text);

/** Всё, кроме общей шероховатости в углу, — внутри рамки и не залезает на основную надпись */
function insideField(prims: Prim[], W: number, H: number) {
  const bad: Prim[] = [];
  const stampL = W - 190, stampT = H - 60;
  for (const p of prims) {
    const pts: [number, number][] =
      p.t === "line" ? [[p.x1, p.y1], [p.x2, p.y2]]
        : p.t === "circle" || p.t === "arc" ? [[p.cx - p.r, p.cy - p.r], [p.cx + p.r, p.cy + p.r]]
          : p.t === "poly" ? p.pts : [[p.x, p.y]];
    for (const [x, y] of pts) {
      if (x < 20 || x > W - 5 || y < 5 || y > H - 5 || (x > stampL + 1 && y > stampT + 1)) bad.push(p);
    }
  }
  return bad;
}

const SHAFT = {
  kind: "shaft", name: "Вал тихоходный", designation: "СМ.01.001", material: "Сталь 45", hardness: "235...262 HB", ra_general: 6.3,
  requirements: ["Неуказанные предельные отклонения размеров: H14, h14, ±IT14/2."],
  shaft: {
    sections: [{ d: 45, l: 25, tol: "k6", ra: 0.8 }, { d: 52, l: 10 }, { d: 50, l: 70, tol: "k6", ra: 1.6 }, { d: 45, l: 25, tol: "k6", ra: 0.8 }, { d: 40, l: 80, tol: "k6", ra: 1.6 }],
    chamfer: 1.6, keyways: [{ section: 2, b: 14, l: 56, t1: 5.5, from: 7 }, { section: 4, b: 12, l: 63, t1: 5, from: 8 }], center_holes: true,
  },
};

describe("Чертёж вала", () => {
  const { model } = normalizeModel(SHAFT);
  const d = buildDrawing(model);

  it("все размеры диаметров с допусками", () => {
    const t = texts(d.prims);
    expect(t).toEqual(expect.arrayContaining(["∅45k6", "∅52", "∅50k6", "∅40k6"]));
  });
  it("длины ступеней и габарит", () => {
    expect(texts(d.prims)).toEqual(expect.arrayContaining(["25", "10", "70", "80", "210"]));
  });
  it("сечения по шпоночным пазам с обозначениями", () => {
    const t = texts(d.prims);
    expect(t).toEqual(expect.arrayContaining(["А–А", "Б–Б", "14P9", "12P9", "44,5", "35"]));
  });
  it("шероховатость посадочных мест и общая", () => {
    const t = texts(d.prims);
    expect(t.filter((x) => x === "Ra 0,8")).toHaveLength(2);
    expect(t).toContain("Ra 6,3");
  });
  it("твёрдость первым пунктом техтребований", () => {
    expect(texts(d.prims).find((x) => x.startsWith("1."))).toBe("1. 235...262 HB.");
  });
  it("стандартный масштаб и формат", () => {
    expect(["1:1", "1:2", "2:1"]).toContain(d.scale);
    expect(["A4 горизонт.", "A3 горизонт."]).toContain(d.paper);
  });
  it("ничего не выходит за рамку и не наезжает на основную надпись", () => {
    expect(insideField(d.prims, d.sheetW, d.sheetH)).toEqual([]);
  });
  it("длинный вал уходит в мелкий масштаб, но помещается", () => {
    const { model: m } = normalizeModel({ ...SHAFT, shaft: { ...SHAFT.shaft, sections: [{ d: 80, l: 600 }, { d: 90, l: 600 }], keyways: [] } });
    const dd = buildDrawing(m);
    expect(dd.scale).toMatch(/^1:/);
    expect(insideField(dd.prims, dd.sheetW, dd.sheetH)).toEqual([]);
  });
  it("мелкая деталь укрупняется", () => {
    const { model: m } = normalizeModel({ kind: "shaft", shaft: { sections: [{ d: 6, l: 20 }, { d: 8, l: 10 }], chamfer: 0.3 } });
    expect(buildDrawing(m).scale).toMatch(/:1$/);
    expect(buildDrawing(m).scale).not.toBe("1:1");
  });
});

describe("Чертёж фланца и плиты", () => {
  it("фланец: разрез, вид слева, группа отверстий", () => {
    const { model } = normalizeModel({ kind: "disc", name: "Фланец", disc: { D: 180, D_tol: "h9", H: 25, hub: { d: 90, h: 50 }, bore: { d: 60, tol: "H7" }, holes: { n: 8, d: 13.5, pcd: 150 }, chamfer: 2 } });
    const d = buildDrawing(model);
    const t = texts(d.prims);
    expect(t).toEqual(expect.arrayContaining(["∅180h9", "∅60H7", "∅90", "8 отв. ∅13,5", "∅150", "25", "50"]));
    expect(d.prims.filter((p) => p.t === "circle" && Math.abs(p.r - (13.5 / 2) * (d.scale === "1:2" ? 0.5 : 1)) < 0.01).length).toBe(8);
    expect(insideField(d.prims, d.sheetW, d.sheetH)).toEqual([]);
  });
  it("глухая крышка строится без центрального отверстия", () => {
    const { model } = normalizeModel({ kind: "disc", disc: { D: 120, H: 20, bore: { d: 0 } } });
    expect(texts(buildDrawing(model).prims).some((x) => x.includes("H7"))).toBe(false);
  });
  it("плита: координатные размеры и выноски групп отверстий", () => {
    const { model } = normalizeModel({ kind: "plate", plate: { L: 200, W: 120, H: 20, holes: [{ x: 20, y: 20, d: 11 }, { x: 180, y: 20, d: 11 }, { x: 100, y: 60, d: 10.2, thread: "М12-7H" }] } });
    const d = buildDrawing(model);
    const t = texts(d.prims);
    expect(t).toEqual(expect.arrayContaining(["200", "120", "20", "180", "100", "60", "2 отв. ∅11", "М12-7H"]));
    expect(insideField(d.prims, d.sheetW, d.sheetH)).toEqual([]);
  });
});

describe("Служебная геометрия", () => {
  it("масштаб по ГОСТ 2.302", () => {
    expect(pickScale(100, 50, 250, 150)[1]).toBe("2,5:1");
    expect(pickScale(300, 50, 250, 150)[1]).toBe("1:2");
  });
  it("штриховка: пересечение с кругом и вычитание", () => {
    expect(span({ circle: [0, 0, 10] }, 0)).toEqual([expect.closeTo(-7.071, 2), expect.closeTo(7.071, 2)]);
    expect(span({ circle: [0, 0, 10] }, 100)).toBeNull();
    expect(union([[0, 2], [1, 3], [5, 6]])).toEqual([[0, 3], [5, 6]]);
    expect(subtract([[0, 10]], [[2, 3], [5, 6]])).toEqual([[0, 2], [3, 5], [6, 10]]);
  });
  it("перенос техтребований по словам", () => {
    const lines = wrapText("1. Радиальное биение посадочных поверхностей относительно общей оси не более 0,02 мм.", 40);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.length <= 43)).toBe(true);
    expect(lines[1].startsWith("   ")).toBe(true);
  });
  it("SVG листа валиден и содержит штамп", () => {
    const { model } = normalizeModel(SHAFT);
    const d = buildDrawing(model);
    const svg = sheetSvg(d.prims, d.sheetW, d.sheetH, { name: "Вал", designation: "СМ.01.001", material: "Сталь 45", scale: d.scale, mass: "3 кг" });
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(svg).toContain("СМ.01.001");
  });
});
