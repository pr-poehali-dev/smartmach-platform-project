import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/api", () => ({ URLS: { "chatgpt-polza-chatgpt": "https://ai.test/fn" } }));
import { validateSketchFile, fitSize, dataUrlBytes } from "@/lib/aipart/sketch";
import { runConstructor, normalizeSketch } from "@/lib/aipart/agents";

describe("Подготовка эскиза", () => {
  it("форматы и размер файла", () => {
    expect(() => validateSketchFile({ name: "a.jpg", type: "image/jpeg", size: 1000 })).not.toThrow();
    expect(() => validateSketchFile({ name: "IMG_1.HEIC", type: "", size: 1000 })).not.toThrow();
    expect(() => validateSketchFile({ name: "a.dwg", type: "application/acad", size: 1000 })).toThrow(/PDF и DWG/);
    expect(() => validateSketchFile({ name: "a.jpg", type: "image/jpeg", size: 20 * 1024 * 1024 })).toThrow(/15 МБ/);
  });
  it("уменьшение с сохранением пропорций", () => {
    expect(fitSize(4000, 3000)).toEqual([1600, 1200]);
    expect(fitSize(800, 600)).toEqual([800, 600]);
  });
  it("размер data URL", () => {
    expect(dataUrlBytes("data:image/jpeg;base64," + "A".repeat(400))).toBe(300);
  });
});

describe("Распознавание эскиза", () => {
  it("изображение уходит в ИИ, в инструкции — правила чтения эскиза", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: '{"kind":"shaft","shaft":{"sections":[{"d":40,"l":60}]},"sketch":{"recognized":"вал","dimensions":["∅40 L=60"],"confidence":"HIGH"}}' }), { status: 200 }));
    const r = await runConstructor("сталь 40Х", { image: "data:image/jpeg;base64,AAA", fetcher: f });
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.messages[0].content).toMatch(/РАБОТА С ЭСКИЗОМ/);
    expect(body.messages[1].content[1]).toEqual({ type: "image_url", image_url: { url: "data:image/jpeg;base64,AAA", detail: "high" } });
    expect(body.messages[1].content[0].text).toMatch(/сталь 40Х/);
    expect(r.sketch).toMatchObject({ recognized: "вал", confidence: "high", dimensions: ["∅40 L=60"] });
  });
  it("без изображения отчёта нет и инструкция обычная", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: '{"kind":"shaft"}' }), { status: 200 }));
    const r = await runConstructor("вал ∅40", { fetcher: f });
    expect(JSON.parse(f.mock.calls[0][1].body).messages[0].content).not.toMatch(/ЭСКИЗ/);
    expect(r.sketch).toBeNull();
  });
  it("кривой отчёт нормализуется", () => {
    expect(normalizeSketch({ confidence: "сомнительно", dimensions: "нет" })).toEqual({ recognized: "Деталь", dimensions: [], assumed: [], issues: [], confidence: "medium" });
    expect(normalizeSketch(null)).toBeNull();
  });
});
