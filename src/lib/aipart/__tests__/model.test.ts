import { describe, it, expect } from "vitest";
import { normalizeModel, massKg, density, dimensions, totalLength, stdKeyB } from "@/lib/aipart/model";

const shaft = (over: Record<string, unknown> = {}) => ({
  kind: "shaft", name: "Вал", designation: "СМ.01.001", material: "Сталь 45", ra_general: 6.3, requirements: ["Неуказанные отклонения H14."],
  shaft: { sections: [{ d: 40, l: 50, tol: "k6", ra: 0.8 }, { d: 50, l: 100, tol: null, ra: null }], chamfer: 1.6, bore: null, keyways: [], center_holes: true, ...over },
});

describe("Нормализация ответа ИИ-конструктора", () => {
  it("принимает корректную модель без предупреждений", () => {
    const { model, warnings } = normalizeModel(shaft());
    expect(warnings).toEqual([]);
    expect(model.shaft!.sections).toHaveLength(2);
    expect(totalLength(model.shaft!)).toBe(150);
  });

  it("числа строками и с запятой", () => {
    const { model } = normalizeModel(shaft({ sections: [{ d: "40,5", l: "60 мм", tol: "h9" }] }));
    expect(model.shaft!.sections[0]).toMatchObject({ d: 40.5, l: 60 });
  });

  it("Ra приводится к стандартному ряду", () => {
    const { model } = normalizeModel(shaft({ sections: [{ d: 40, l: 50, ra: 1.5 }] }));
    expect(model.shaft!.sections[0].ra).toBe(1.6);
  });

  it("паз длиннее ступени укорачивается", () => {
    const { model, warnings } = normalizeModel(shaft({ keyways: [{ section: 0, b: 12, l: 80, t1: 5, from: 5 }] }));
    const kw = model.shaft!.keyways[0];
    expect(kw.l + 2 * kw.from).toBeLessThanOrEqual(50);
    expect(warnings.join()).toMatch(/укорочен/);
  });

  it("паз на несуществующей ступени без подходящей замены убирается", () => {
    const { model, warnings } = normalizeModel(shaft({ keyways: [{ section: 7, b: 20, l: 20, t1: 5, from: 2 }] }));
    expect(model.shaft!.keyways).toHaveLength(0);
    expect(warnings.length).toBe(1);
  });

  it("паз с ошибочным индексом ступени переносится на подходящую по ГОСТ 23360", () => {
    // ступени ∅40×50 и ∅50×100; паз 14 (для ∅44…50) длиной 70 указан на ступени 0
    const { model, warnings } = normalizeModel(shaft({ keyways: [{ section: 0, b: 14, l: 70, t1: 5.5, from: 5 }] }));
    expect(model.shaft!.keyways[0]).toMatchObject({ section: 1, l: 70 });
    expect(warnings.join()).toMatch(/перенесён/);
  });

  it("отверстие больше вала убирается", () => {
    const { model } = normalizeModel(shaft({ bore: { d: 45, tol: "H7", l: 0 } }));
    expect(model.shaft!.bore).toBeNull();
  });

  it("неизвестный тип угадывается по заполненному объекту", () => {
    const { model, warnings } = normalizeModel({ kind: "flange", disc: { D: 100, H: 10, bore: { d: 30 } } });
    expect(model.kind).toBe("disc");
    expect(warnings[0]).toMatch(/не распознан/);
  });

  it("пустой ответ не роняет систему", () => {
    const { model } = normalizeModel(null);
    expect(model.kind).toBe("shaft");
    expect(model.shaft!.sections.length).toBe(1);
    expect(model.requirements.length).toBeGreaterThan(0);
  });

  it("отверстия фланца за пределами диска сдвигаются", () => {
    const { model, warnings } = normalizeModel({ kind: "disc", disc: { D: 100, H: 10, bore: { d: 30 }, holes: { n: 4, d: 9, pcd: 200 } } });
    expect(model.disc!.holes!.pcd).toBeLessThan(100);
    expect(warnings.join()).toMatch(/исправлен/);
  });

  it("глухая крышка без отверстия допустима", () => {
    const { model } = normalizeModel({ kind: "disc", disc: { D: 100, H: 10, bore: { d: 0 } } });
    expect(model.disc!.bore.d).toBe(0);
  });

  it("отверстие плиты за контуром убирается", () => {
    const { model } = normalizeModel({ kind: "plate", plate: { L: 100, W: 50, H: 10, holes: [{ x: 10, y: 10, d: 8 }, { x: 99, y: 10, d: 8 }] } });
    expect(model.plate!.holes).toHaveLength(1);
  });

  it("твёрдость не дублируется в техтребованиях", () => {
    const { model } = normalizeModel({ ...shaft(), hardness: "235...262 HB", requirements: ["235...262 HB.", "Острые кромки притупить."] });
    expect(model.requirements).toEqual(["Острые кромки притупить."]);
  });
});

describe("Масса и габариты", () => {
  it("плотность по материалу", () => {
    expect(density("Сталь 45 ГОСТ 1050")).toBe(7.85);
    expect(density("СЧ20 ГОСТ 1412")).toBe(7.2);
    expect(density("Д16Т")).toBe(2.75);
    expect(density("БрО5Ц5С5")).toBe(8.8);
  });
  it("масса цилиндра ∅50×100 из стали ≈ 1,54 кг", () => {
    const { model } = normalizeModel(shaft({ sections: [{ d: 50, l: 100 }], chamfer: 0 }));
    expect(massKg(model)).toBeCloseTo(1.541, 2);
  });
  it("габариты строкой", () => {
    expect(dimensions(normalizeModel(shaft()).model)).toBe("∅50×150");
    expect(dimensions(normalizeModel({ kind: "plate", plate: { L: 200, W: 120, H: 20 } }).model)).toBe("200×120×20");
  });
});

describe("Шпонки ГОСТ 23360", () => {
  it("ширина по диаметру вала", () => {
    expect(stdKeyB(40)).toBe(12);
    expect(stdKeyB(50)).toBe(14);
    expect(stdKeyB(60)).toBe(18);
  });
});
