import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { process, operation } from "@/test/fixtures";

const api = vi.hoisted(() => ({
  tcGet: vi.fn(), tcUpdate: vi.fn(), opCreate: vi.fn(), opUpdate: vi.fn(), opDelete: vi.fn(),
  stepCreate: vi.fn(), stepUpdate: vi.fn(), stepDelete: vi.fn(),
}));
vi.mock("@/lib/techcard", async (orig) => ({ ...(await orig<typeof import("@/lib/techcard")>()), ...api }));
vi.mock("@/lib/api", () => ({ apiGet: vi.fn(() => Promise.resolve([])) }));
vi.mock("@/lib/manufacture", () => ({ mGet: vi.fn(() => Promise.resolve([])) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TechCardEditor from "@/components/smartmach/TechCardEditor";
import { toast } from "sonner";

beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); });

describe("Редактор техкарты", () => {
  it("показывает маршрут, переходы, программу ЧПУ и итоги норм", async () => {
    api.tcGet.mockResolvedValue(process());
    render(<TechCardEditor id={1} onBack={() => {}} />);

    expect(await screen.findByText("Техпроцесс вала")).toBeInTheDocument();
    const op = screen.getByTestId("tech-op");
    expect(within(op).getByText("Токарная с ЧПУ")).toBeInTheDocument();
    expect(within(op).getByText(/O1001/)).toBeInTheDocument();
    expect(screen.getAllByTestId("tech-step")).toHaveLength(1);
    expect(screen.getByText("Тшк на деталь").parentElement).toHaveTextContent("2,57 мин");
  });

  it("сообщает об ошибке загрузки", async () => {
    api.tcGet.mockRejectedValue(new Error("Техкарта не найдена."));
    render(<TechCardEditor id={99} onBack={() => {}} />);
    expect(await screen.findByText("Техкарта не найдена.")).toBeInTheDocument();
  });

  it("сохраняет шапку с числовой партией", async () => {
    api.tcGet.mockResolvedValue(process());
    api.tcUpdate.mockResolvedValue(process({ batch_size: 10 }));
    render(<TechCardEditor id={1} onBack={() => {}} />);
    await screen.findByText("Техпроцесс вала");

    const batch = screen.getByText("Партия, шт").parentElement!.querySelector("input")!;
    await userEvent.clear(batch);
    await userEvent.type(batch, "10");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить шапку" }));

    expect(api.tcUpdate).toHaveBeenCalledWith(1, expect.objectContaining({ batch_size: 10, blank_mass: 5.01 }));
    expect(toast.success).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Сохранить шапку" })).not.toBeInTheDocument();
  });

  it("удаляет операцию после подтверждения и перерисовывает маршрут", async () => {
    api.tcGet.mockResolvedValue(process());
    api.opDelete.mockResolvedValue(process({ operations: [] }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TechCardEditor id={1} onBack={() => {}} />);
    await screen.findByTestId("tech-op");

    await userEvent.click(within(screen.getByTestId("tech-op")).getAllByTitle("Удалить")[0]);
    expect(api.opDelete).toHaveBeenCalledWith(10);
    expect(await screen.findByText(/Маршрут пуст/)).toBeInTheDocument();
  });

  it("не удаляет операцию при отказе", async () => {
    api.tcGet.mockResolvedValue(process());
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<TechCardEditor id={1} onBack={() => {}} />);
    await screen.findByTestId("tech-op");
    await userEvent.click(within(screen.getByTestId("tech-op")).getAllByTitle("Удалить")[0]);
    expect(api.opDelete).not.toHaveBeenCalled();
  });

  it("добавляет операцию через форму и раскрывает её", async () => {
    api.tcGet.mockResolvedValue(process({ operations: [] }));
    const added = operation({ id: 20, op_no: "005", name: "Отрезная", cam_code: null, steps: [] });
    api.opCreate.mockResolvedValue(process({ operations: [added] }));
    render(<TechCardEditor id={1} onBack={() => {}} />);
    await screen.findByText(/Маршрут пуст/);

    await userEvent.click(screen.getByRole("button", { name: /Операция/ }));
    await userEvent.type(screen.getByPlaceholderText("Токарная с ЧПУ"), "Отрезная");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(api.opCreate).toHaveBeenCalledWith(expect.objectContaining({ process_id: 1, name: "Отрезная", k_service_pct: 8 }));
    expect(await screen.findByText("Отрезная")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Переход/ })).toBeInTheDocument();
  });

  it("открывает маршрутную карту", async () => {
    api.tcGet.mockResolvedValue(process());
    render(<TechCardEditor id={1} onBack={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: /Маршрутная карта/ }));
    expect(screen.getByText("МАРШРУТНАЯ КАРТА")).toBeInTheDocument();
  });
});
