import { describe, it, expect } from "vitest";
import { spindleFromSpeed, mainTime, opTimes, fmtMin, fmtNum, toNum } from "@/lib/techcard";

describe("Режимы резания", () => {
  it("n = 1000·V/(π·D): V=180 м/мин, D=50 мм → 1145,9 об/мин", () => {
    expect(spindleFromSpeed(180, 50)).toBeCloseTo(1145.9, 1);
  });
  it("принимает строки с запятой", () => {
    expect(spindleFromSpeed("180", "50,0")).toBeCloseTo(1145.9, 1);
  });
  it("без диаметра или скорости частота не считается", () => {
    expect(spindleFromSpeed(180, null)).toBeNull();
    expect(spindleFromSpeed("", 50)).toBeNull();
  });
});

describe("Основное время перехода", () => {
  it("То = (L + l)·i / (n·S)", () => {
    // (25 + 2)·1 / (1145.9·0.25) = 0,094
    expect(mainTime(25, 2, 1, 1145.9, 0.25)).toBeCloseTo(0.094, 3);
  });
  it("учитывает число проходов", () => {
    const one = mainTime(100, 0, 1, 1000, 0.2)!;
    expect(mainTime(100, 0, 3, 1000, 0.2)).toBeCloseTo(one * 3, 3);
  });
  it("без подачи время не считается", () => {
    expect(mainTime(100, 0, 1, 1000, null)).toBeNull();
  });
});

describe("Нормы времени операции", () => {
  it("Тшт = (То + Тв)·(1 + К/100); Тшк = Тшт + Тпз/N", () => {
    const { tSht, tShtK } = opTimes(0.094, 1.8, 8, 18, 50);
    expect(tSht).toBeCloseTo(2.046, 3);
    expect(tShtK).toBeCloseTo(2.406, 3);
  });
  it("совпадает с серверным расчётом примера (операция 010)", () => {
    // То переходов 0,094 + 1,125 + 0,481 = 1,7; Тв 1,8; К 8%; Тпз 18; партия 50
    const { tSht, tShtK } = opTimes(1.7, 1.8, 8, 18, 50);
    expect(tSht).toBeCloseTo(3.78, 3);
    expect(tShtK).toBeCloseTo(4.14, 3);
  });
  it("партия 0 не приводит к делению на ноль", () => {
    expect(Number.isFinite(opTimes(1, 1, 8, 10, 0).tShtK)).toBe(true);
  });
  it("по умолчанию К = 8%", () => {
    expect(opTimes(10, 0, null, 0, 1).tSht).toBeCloseTo(10.8, 3);
  });
});

describe("Форматирование", () => {
  it("минуты и часы", () => {
    expect(fmtMin(2.4)).toBe("2,40 мин");
    expect(fmtMin(45)).toBe("45,0 мин");
    expect(fmtMin(85.5)).toBe("1 ч 26 мин");
    expect(fmtMin(null)).toBe("—");
  });
  it("числа без лишних нулей", () => {
    expect(fmtNum("0.2500", 3)).toBe("0,25");
    expect(fmtNum(null)).toBe("");
  });
  it("toNum отбрасывает мусор", () => {
    expect(toNum("abc")).toBeNull();
    expect(toNum("1,5")).toBe(1.5);
  });
});
