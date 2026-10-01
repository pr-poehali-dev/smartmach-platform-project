import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  runConstructor: vi.fn(), runTechnologist: vi.fn(), apiGet: vi.fn(), apiPost: vi.fn(), renderToFabric: vi.fn(),
}));
vi.mock("@/lib/aipart/agents", async (orig) => ({ ...(await orig<typeof import("@/lib/aipart/agents")>()), runConstructor: h.runConstructor, runTechnologist: h.runTechnologist }));
vi.mock("@/lib/api", () => ({ apiGet: h.apiGet, apiPost: h.apiPost, URLS: {} }));
vi.mock("@/lib/aipart/fabric", () => ({ renderToFabric: h.renderToFabric }));
vi.mock("@/lib/aipart/sketch", async (orig) => ({
  ...(await orig<typeof import("@/lib/aipart/sketch")>()),
  prepareSketch: vi.fn(async (f: File) => {
    const { validateSketchFile } = await orig<typeof import("@/lib/aipart/sketch")>();
    validateSketchFile(f);
    return { dataUrl: "data:image/jpeg;base64,SKETCH", width: 800, height: 600 };
  }),
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { name: "Иванов Иван Петрович", company_name: "Завод" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ModuleAiDesigner, { planTotals } from "@/components/smartmach/ModuleAiDesigner";
import { normalizeModel } from "@/lib/aipart/model";
import { toast } from "sonner";

const MODEL = normalizeModel({
  kind: "shaft", name: "Вал опытный", designation: "СМ.09.001", material: "Сталь 45",
  shaft: { sections: [{ d: 40, l: 60, tol: "k6", ra: 0.8 }, { d: 50, l: 80 }], chamfer: 1, keyways: [] },
}).model;
const PLAN = {
  blank_type: "Прокат", blank_size: "∅55×145", blank_mass: 2.7,
  ops: [
    { op_no: "005", name: "Отрезная", equipment_id: null, equipment_name: "Пила", fixture: null, profession: null, worker_rank: 2, t_aux: 1, t_pz: 5, k_service_pct: 8,
      steps: [{ description: "Отрезать", tool: null, measuring_tool: null, diameter: null, length: null, overrun: 0, depth: null, passes: 1, feed: null, speed: null, t_main: 2 }] },
    { op_no: "010", name: "Токарная", equipment_id: 5, equipment_name: "16А20Ф3", fixture: null, profession: null, worker_rank: 4, t_aux: 2, t_pz: 20, k_service_pct: 8,
      steps: [{ description: "Точить", tool: "Резец", measuring_tool: null, diameter: 50, length: 60, overrun: 2, depth: 2, passes: 1, feed: 0.3, speed: 160, t_main: null }] },
  ],
};

const deferred = <T,>() => { let resolve!: (v: T) => void; const p = new Promise<T>((r) => { resolve = r; }); return { p, resolve }; };

beforeEach(() => {
  Object.values(h).forEach((f) => f.mockReset());
  h.apiGet.mockResolvedValue([{ id: 5, name: "Токарный", model: "16А20Ф3", type: "Токарный" }]);
  h.renderToFabric.mockResolvedValue({ json: "{}", png: "data:image/png;base64,AA" });
});

const describeIt = async () => {
  render(<ModuleAiDesigner onOpenTechCard={vi.fn()} />);
  fireEvent.change(screen.getByTestId("ai-desc"), { target: { value: "Вал ступенчатый ∅40 и ∅50, сталь 45" } });
  await userEvent.click(screen.getByRole("button", { name: /Спроектировать/ }));
};

describe("ИИ-конструктор: экран", () => {
  it("короткое описание не отправляется", async () => {
    render(<ModuleAiDesigner />);
    fireEvent.change(screen.getByTestId("ai-desc"), { target: { value: "вал" } });
    await userEvent.click(screen.getByRole("button", { name: /Спроектировать/ }));
    expect(h.runConstructor).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("чертёж показывается сразу, пока технолог ещё работает", async () => {
    h.runConstructor.mockResolvedValue({ model: MODEL, warnings: [], sketch: null });
    const tech = deferred<{ plan: typeof PLAN; warnings: string[] }>();
    h.runTechnologist.mockReturnValue(tech.p);
    await describeIt();

    expect(await screen.findByTestId("ai-drawing")).toContainHTML("∅40k6");
    expect(screen.getByText(/подбирает станки/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Сохранить деталь/ })).toBeDisabled();

    tech.resolve({ plan: PLAN, warnings: [] });
    expect(await screen.findByTestId("ai-plan")).toHaveTextContent("Токарная");
    expect(screen.getByRole("button", { name: /Сохранить деталь/ })).toBeEnabled();
    expect(h.runTechnologist).toHaveBeenCalledWith(MODEL, [{ id: 5, name: "Токарный", model: "16А20Ф3", type: "Токарный" }], 50);
  });

  it("ошибка конструктора показывается, технолог не запускается", async () => {
    h.runConstructor.mockRejectedValue(new Error("ИИ не успел ответить."));
    await describeIt();
    expect(await screen.findByText("ИИ не успел ответить.")).toBeInTheDocument();
    expect(h.runTechnologist).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Повторить/ })).toBeInTheDocument();
  });

  it("правка параметров перестраивает чертёж и требует пересчёта техпроцесса", async () => {
    h.runConstructor.mockResolvedValue({ model: MODEL, warnings: [], sketch: null });
    h.runTechnologist.mockResolvedValue({ plan: PLAN, warnings: [] });
    await describeIt();
    await screen.findByTestId("ai-plan");

    await userEvent.click(screen.getByRole("button", { name: "Параметры" }));
    const d0 = screen.getByTestId("sec-d-0");
    await userEvent.clear(d0);
    await userEvent.type(d0, "42");
    await userEvent.click(screen.getByRole("button", { name: "Чертёж" }));

    expect(screen.getByTestId("ai-drawing")).toContainHTML("∅42k6");
    expect(screen.getByRole("button", { name: /Сохранить деталь/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Пересчитать" }));
    expect(h.runTechnologist).toHaveBeenCalledTimes(2);
    expect(h.runTechnologist.mock.calls[1][0].shaft.sections[0].d).toBe(42);
  });

  it("сохраняет деталь с техкартой и чертёж с привязкой к детали", async () => {
    h.runConstructor.mockResolvedValue({ model: MODEL, warnings: [], sketch: null });
    h.runTechnologist.mockResolvedValue({ plan: PLAN, warnings: [] });
    h.apiPost.mockResolvedValueOnce({ id: 31, part_id: 77 }).mockResolvedValueOnce({ id: 12 });
    await describeIt();
    await screen.findByTestId("ai-plan");
    await userEvent.click(screen.getByRole("button", { name: /Сохранить деталь/ }));

    await waitFor(() => expect(h.apiPost).toHaveBeenCalledTimes(2));
    const [impBody, impParams] = h.apiPost.mock.calls[0].slice(1);
    expect(impParams).toEqual({ resource: "techcard_import" });
    expect(impBody.part).toMatchObject({ code: "СМ.09.001", name: "Вал опытный", category: "Валы" });
    expect(impBody.process).toMatchObject({ batch_size: 50, developer: "Иванов И. П." });
    expect(impBody.operations).toHaveLength(2);
    const drBody = h.apiPost.mock.calls[1][1];
    expect(drBody).toMatchObject({ part_id: 77, module: "cad", image: "data:image/png;base64,AA" });
    expect(drBody.gost_meta).toMatchObject({ drawingNumber: "СМ.09.001", company: "Завод", scale: expect.any(String) });
    expect(await screen.findByRole("button", { name: "Открыть техкарту" })).toBeInTheDocument();
  });
});

describe("Оценка норм до сохранения", () => {
  it("совпадает с серверной формулой", () => {
    const { tSht } = planTotals(PLAN as never, 50);
    // Отрезная: (2 + 1)·1,08 = 3,24; Токарная: То = 62/(1018,6·0,3) = 0,203; (0,203 + 2)·1,08 = 2,379
    expect(tSht).toBeCloseTo(3.24 + 2.379, 2);
  });
});

describe("ИИ-конструктор: эскиз", () => {
  const file = (name: string, type: string) => new File(["x"], name, { type });

  it("эскиз без текста отправляется в ИИ вместе с изображением, отчёт распознавания показывается", async () => {
    h.runConstructor.mockResolvedValue({ model: MODEL, warnings: [], sketch: { recognized: "вал ступенчатый", dimensions: ["∅40k6 L=60"], assumed: ["фаска 1 мм"], issues: [], confidence: "high" } });
    h.runTechnologist.mockResolvedValue({ plan: PLAN, warnings: [] });
    render(<ModuleAiDesigner />);
    await userEvent.upload(screen.getByTestId("sketch-input"), file("vale.jpg", "image/jpeg"));
    expect(await screen.findByTestId("sketch-preview")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Спроектировать/ }));

    await waitFor(() => expect(h.runConstructor).toHaveBeenCalled());
    expect(h.runConstructor).toHaveBeenCalledWith("", { image: "data:image/jpeg;base64,SKETCH" });
    const rep = await screen.findByTestId("sketch-report");
    expect(rep).toHaveTextContent("уверенно: вал ступенчатый");
    expect(rep).toHaveTextContent("∅40k6 L=60");
    expect(rep).toHaveTextContent("фаска 1 мм");
  });

  it("не-изображение отклоняется с понятным сообщением", async () => {
    render(<ModuleAiDesigner />);
    const input = screen.getByTestId("sketch-input");
    fireEvent.change(input, { target: { files: [file("drawing.pdf", "application/pdf")] } });
    expect(await screen.findByText(/PDF и DWG пока не поддерживаются/)).toBeInTheDocument();
    expect(screen.queryByTestId("sketch-preview")).toBeNull();
  });

  it("эскиз можно убрать", async () => {
    render(<ModuleAiDesigner />);
    await userEvent.upload(screen.getByTestId("sketch-input"), file("a.png", "image/png"));
    await userEvent.click(await screen.findByTitle("Убрать эскиз"));
    expect(screen.getByTestId("sketch-drop")).toBeInTheDocument();
  });
});
