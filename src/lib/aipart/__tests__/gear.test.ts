import { describe, it, expect } from "vitest";
import { gearGeometry, gearTable, centerDistance, fmtAngle, nearestModule } from "@/lib/aipart/gear";
import { normalizeModel, massKg } from "@/lib/aipart/model";
import { buildDrawing } from "@/lib/aipart/drawing";
import type { Prim } from "@/lib/aipart/geom";

describe("Геометрия колеса ГОСТ 16532", () => {
  it("прямозубое m=2 z=40: d, da, df", () => {
    const g = gearGeometry({ m: 2, z: 40, beta: 0, x: 0 });
    expect(g).toMatchObject({ d: 80, da: 84, df: 75, h: 4.5 });
  });
  it("длина общей нормали совпадает со справочными таблицами (W/m при x=0)", () => {
    // ГОСТ 16532 / справочник: z=20 → zw=3, W*=7,6604; z=40 → zw=5, W*=13,8448; z=100 → zw=12, W*=35,3500
    expect(gearGeometry({ m: 1, z: 20, beta: 0, x: 0 })).toMatchObject({ zw: 3, W: 7.66 });
    const g40 = gearGeometry({ m: 2, z: 40, beta: 0, x: 0 });
    expect(g40.zw).toBe(5); expect(g40.W / 2).toBeCloseTo(13.8448, 2);
    const g100 = gearGeometry({ m: 1, z: 100, beta: 0, x: 0 });
    expect(g100.zw).toBe(12); expect(g100.W).toBeCloseTo(35.35, 2);
  });
  it("косозубое: торцовый модуль и делительный диаметр", () => {
    const g = gearGeometry({ m: 2.5, z: 30, beta: 12, x: 0 });
    expect(g.mt).toBeCloseTo(2.5 / Math.cos((12 * Math.PI) / 180), 3);
    expect(g.d).toBeCloseTo(76.676, 2);
  });
  it("смещение увеличивает da и W", () => {
    const a = gearGeometry({ m: 4, z: 60, beta: 0, x: 0 }), b = gearGeometry({ m: 4, z: 60, beta: 0, x: 0.3 });
    expect(b.da - a.da).toBeCloseTo(2 * 0.3 * 4, 3);
    expect(b.W).toBeGreaterThan(a.W);
  });
  it("межосевое расстояние и формат угла", () => {
    expect(centerDistance(2, 22, 78)).toBe(100);
    expect(fmtAngle(12.8389)).toBe(`12°50'20"`);
    expect(nearestModule(2.2)).toBe(2.25);
  });
  it("таблица ГОСТ 2.403: обязательные строки", () => {
    const rows = gearTable({ m: 2, z: 78, beta: 12, hand: "left", x: 0, b: 40, accuracy: "8-B", mate_z: 22, aw: null } as never, gearGeometry({ m: 2, z: 78, beta: 12, x: 0 }));
    const names = rows.map((r) => r[0]);
    expect(names).toEqual(expect.arrayContaining(["Модуль", "Число зубьев", "Угол наклона зуба", "Направление линии зуба", "Нормальный исходный контур", "Коэффициент смещения", "Степень точности по ГОСТ 1643-81", "Длина общей нормали", "Делительный диаметр", "Межосевое расстояние"]));
    expect(rows.find((r) => r[0] === "Направление линии зуба")![2]).toBe("Левое");
  });
});

describe("Модель колеса", () => {
  it("нестандартный модуль заменяется по ГОСТ 9563", () => {
    const { model, warnings } = normalizeModel({ kind: "gear", gear: { m: 2.3, z: 50, b: 30, bore: { d: 30 } } });
    expect(model.gear!.m).toBe(2.25);
    expect(warnings[0]).toMatch(/9563/);
  });
  it("малое число зубьев — смещение против подрезания", () => {
    const { model } = normalizeModel({ kind: "gear", gear: { m: 2, z: 12, b: 20, bore: { d: 10 } } });
    expect(model.gear!.x).toBeCloseTo(0.29, 2);
  });
  it("отверстие без обода под зубьями уменьшается", () => {
    const { model, warnings } = normalizeModel({ kind: "gear", gear: { m: 2, z: 20, b: 20, bore: { d: 34 } } });
    expect(model.gear!.bore.d).toBeLessThan(34);
    expect(warnings.join()).toMatch(/обода/);
  });
  it("масса колеса с диском меньше сплошного", () => {
    const base = { kind: "gear", gear: { m: 2, z: 78, b: 40, bore: { d: 50 }, hub: { d: 80, h: 55 } } };
    const solid = massKg(normalizeModel(base).model);
    const webbed = massKg(normalizeModel({ ...base, gear: { ...base.gear, web: { t: 14, d_rim: 130 } } }).model);
    expect(webbed).toBeLessThan(solid * 0.75);
  });
});

describe("Чертёж колеса", () => {
  const texts = (p: Prim[]) => p.filter((x) => x.t === "text").map((x) => (x as { text: string }).text);
  const { model } = normalizeModel({ kind: "gear", name: "Колесо", material: "Сталь 40Х", gear: { m: 2, z: 78, b: 40, accuracy: "8-B", mate_z: 22, bore: { d: 50, tol: "H7" }, keyway: { b: 14, t2: 3.8 }, hub: { d: 80, h: 55 }, web: { t: 14, d_rim: 130, holes: { n: 6, d: 18, pcd: 108 } } } });
  const d = buildDrawing(model);
  it("таблица параметров и размеры", () => {
    const t = texts(d.prims);
    expect(t).toEqual(expect.arrayContaining(["Модуль", "78", "52,371", "156", "100", "∅160h11", "∅50H7", "14Js9", "6 отв. ∅18", "40", "55"]));
  });
  it("делительная окружность — штрихпунктир на виде слева", () => {
    const k = d.scale === "1:2" ? 0.5 : 1;
    expect(d.prims.some((p) => p.t === "circle" && p.s === "axis" && Math.abs(p.r - 78 * k) < 0.01)).toBe(true);
  });
  it("в техтребованиях — отклонения W по ГОСТ 1643", () => {
    expect(texts(d.prims).some((x) => x.includes("общей нормали"))).toBe(true);
  });
});
