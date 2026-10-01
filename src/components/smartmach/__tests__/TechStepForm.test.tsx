import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TechStepForm from "@/components/smartmach/TechStepForm";
import { step } from "@/test/fixtures";

const field = (label: string) => screen.getByText(label).parentElement!.querySelector("input")!;

describe("Форма перехода", () => {
  it("не сохраняет переход без содержания", async () => {
    const onSave = vi.fn();
    render(<TechStepForm step={null} onClose={() => {}} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(screen.getByText("Опишите содержание перехода")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("на лету считает n и То по введённым режимам", async () => {
    render(<TechStepForm step={null} onClose={() => {}} onSave={vi.fn()} />);
    await userEvent.type(field("D, мм"), "50");
    await userEvent.type(field("V, м/мин"), "180");
    await userEvent.type(field("S, мм/об"), "0,25");
    await userEvent.type(field("L, мм"), "25");
    await userEvent.type(field("l вр, мм"), "2");
    expect(screen.getByText("1146 об/мин")).toBeInTheDocument();
    expect(screen.getByText("0,094 мин")).toBeInTheDocument();
  });

  it("отправляет числа, а не строки, и закрывается после сохранения", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<TechStepForm step={null} onClose={onClose} onSave={onSave} />);
    await userEvent.type(screen.getByPlaceholderText(/Точить поверхность/), "Подрезать торец");
    await userEvent.type(field("D, мм"), "40,5");
    await userEvent.type(field("S, мм/об"), "0.3");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(onSave).toHaveBeenCalledOnce();
    const data = onSave.mock.calls[0][0];
    expect(data).toMatchObject({ description: "Подрезать торец", diameter: 40.5, feed: 0.3, passes: 1, overrun: 0, manual_time: false });
    expect(data.length).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it("ручное время передаётся только при включённой галочке", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<TechStepForm step={step({ description: "Контроль" })} onClose={() => {}} onSave={onSave} />);
    await userEvent.click(screen.getByLabelText(/Задать основное время вручную/));
    const t = field("То, мин");
    await userEvent.clear(t);
    await userEvent.type(t, "4");
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ manual_time: true, t_main: 4 });
  });

  it("показывает ошибку сервера и не закрывается", async () => {
    const onClose = vi.fn();
    render(<TechStepForm step={step()} onClose={onClose}
      onSave={vi.fn().mockRejectedValue(new Error("Переход не найден."))} />);
    await userEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Переход не найден.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
