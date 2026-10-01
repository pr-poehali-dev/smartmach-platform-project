import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api", () => ({ URLS: { "chatgpt-polza-chatgpt": "https://ai.test/fn" } }));

import { extractJson, normalizePlan, runConstructor, runTechnologist, callAi, modelBrief, AiError } from "@/lib/aipart/agents";
import { normalizeModel } from "@/lib/aipart/model";

const ok = (content: string) => new Response(JSON.stringify({ success: true, content }), { status: 200 });
const fail = (status: number, error: string) => new Response(JSON.stringify({ error }), { status });

describe("Разбор ответа ИИ", () => {
  it("JSON в markdown-блоке и с текстом вокруг", () => {
    expect(extractJson('Вот ответ:\n```json\n{"a":1}\n```\nГотово')).toEqual({ a: 1 });
    expect(extractJson('Ответ: {"a": {"b": 2}} спасибо')).toEqual({ a: { b: 2 } });
  });
  it("лишние запятые и комментарии чинятся", () => {
    expect(extractJson('{"a": [1, 2,], // коммент\n "b": 3,}')).toEqual({ a: [1, 2], b: 3 });
  });
  it("не JSON — понятная ошибка", () => {
    expect(() => extractJson("Не могу помочь")).toThrow(AiError);
  });
});

describe("Вызов ИИ", () => {
  it("повторяет запрос при сбое и возвращает ответ", async () => {
    const f = vi.fn().mockResolvedValueOnce(fail(504, "timeout")).mockResolvedValueOnce(ok("{}"));
    expect(await callAi("s", "u", { model: "m", maxTokens: 10, fetcher: f })).toBe("{}");
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("переводит ошибки на понятный язык", async () => {
    const f = vi.fn().mockResolvedValue(fail(504, "Execution timeout"));
    await expect(callAi("s", "u", { model: "m", maxTokens: 10, fetcher: f })).rejects.toThrow(/не успел ответить/);
  });
  it("ошибку ключа не повторяет", async () => {
    const f = vi.fn().mockResolvedValue(fail(401, "Invalid API key"));
    await expect(callAi("s", "u", { model: "m", maxTokens: 10, fetcher: f })).rejects.toThrow(/Ключ доступа/);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("конструктор отдаёт нормализованную модель", async () => {
    const f = vi.fn().mockResolvedValue(ok('```json\n{"kind":"plate","name":"Плита","plate":{"L":"100","W":50,"H":10,"holes":[]}}\n```'));
    const { model } = await runConstructor("плита 100×50×10", { fetcher: f });
    expect(model.plate).toMatchObject({ L: 100, W: 50, H: 10 });
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].content).toContain("плита 100×50×10");
  });
});

const EQ = [{ id: 5, name: "Токарный с ЧПУ", model: "16А20Ф3", type: "Токарный" }];

describe("Проверка плана ИИ-технолога", () => {
  it("снимает привязку к несуществующему станку", () => {
    const { plan, warnings } = normalizePlan({ ops: [{ op_no: "010", name: "Токарная", equipment_id: 99, steps: [] }] }, EQ);
    expect(plan.ops[0].equipment_id).toBeNull();
    expect(warnings[0]).toMatch(/#99/);
  });
  it("подставляет название станка из справочника", () => {
    const { plan } = normalizePlan({ ops: [{ op_no: "010", name: "Токарная", equipment_id: 5, equipment_name: "что-то", steps: [] }] }, EQ);
    expect(plan.ops[0].equipment_name).toBe("16А20Ф3 Токарный с ЧПУ");
  });
  it("сортирует операции и чинит номера-дубли", () => {
    const { plan } = normalizePlan({ ops: [{ op_no: "10", name: "Б" }, { op_no: "5", name: "А" }, { op_no: "10", name: "В" }] }, EQ);
    expect(plan.ops.map((o) => o.op_no)).toEqual(["005", "010", "015"]);
    expect(plan.ops.map((o) => o.name)).toEqual(["А", "Б", "В"]);
  });
  it("отбрасывает абсурдные режимы", () => {
    const { plan } = normalizePlan({ ops: [{ name: "Т", steps: [{ description: "Точить", feed: 250, speed: 99999, length: 50, t_main: 2 }] }] }, EQ);
    expect(plan.ops[0].steps[0]).toMatchObject({ feed: null, speed: null });
  });
  it("переход без режимов и нормы получает минимальную норму", () => {
    const { plan, warnings } = normalizePlan({ ops: [{ name: "Отрезная", steps: [{ description: "Отрезать заготовку" }] }] }, EQ);
    expect(plan.ops[0].steps[0].t_main).toBe(1);
    expect(warnings.join()).toMatch(/уточните/);
  });
  it("числа строками понимаются", () => {
    const { plan } = normalizePlan({ blank_mass: "5,6 кг", ops: [{ name: "Т", t_aux: "2.5", worker_rank: "4", steps: [{ description: "x", feed: "0,3", speed: "160", length: "60", diameter: "50" }] }] }, EQ);
    expect(plan.blank_mass).toBe(5.6);
    expect(plan.ops[0]).toMatchObject({ t_aux: 2.5, worker_rank: 4 });
    expect(plan.ops[0].steps[0]).toMatchObject({ feed: 0.3, speed: 160 });
  });
  it("пустой план — ошибка", () => {
    expect(() => normalizePlan({ ops: [] }, EQ)).toThrow(/ни одной операции/);
  });
  it("технолог получает сводку детали и список станков", async () => {
    const { model } = normalizeModel({ kind: "shaft", name: "Вал", shaft: { sections: [{ d: 40, l: 50, tol: "k6", ra: 0.8 }], keyways: [] } });
    const f = vi.fn().mockResolvedValue(ok('{"ops":[{"op_no":"005","name":"Токарная","equipment_id":5,"steps":[]}]}'));
    const { plan } = await runTechnologist(model, EQ, 50, { fetcher: f });
    expect(plan.ops).toHaveLength(1);
    const user = JSON.parse(f.mock.calls[0][1].body).messages[1].content;
    expect(user).toContain("∅40k6 L=50 Ra 0,8");
    expect(user).toContain('"id":5');
    expect(user).toContain("партия 50");
  });
  it("сводка модели описывает пазы и отверстия", () => {
    const { model } = normalizeModel({ kind: "shaft", shaft: { sections: [{ d: 40, l: 60 }], keyways: [{ section: 0, b: 12, l: 40, t1: 5, from: 5 }], bore: { d: 10, l: 0 } } });
    const b = modelBrief(model);
    expect(b).toMatch(/Шпоночный паз 12P9/);
    expect(b).toMatch(/сквозное/);
  });
});
