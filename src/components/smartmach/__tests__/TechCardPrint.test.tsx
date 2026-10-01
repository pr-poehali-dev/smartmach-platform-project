import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TechCardPrint, { buildRows, paginate } from "@/components/smartmach/TechCardPrint";
import { process, operation, step } from "@/test/fixtures";

describe("Маршрутная карта ГОСТ 3.1118 — состав строк", () => {
  it("первая строка — материал (М01) с КИМ", () => {
    const rows = buildRows(process());
    expect(rows[0].sym).toBe("М01");
    expect(rows[0].cells).toContain("0,77"); // 3,85 / 5,01
  });

  it("на операцию: А, Б, О по УП, О по переходу, Т инструмент, Т приспособление", () => {
    const syms = buildRows(process()).slice(1).map((r) => r.sym);
    expect(syms).toEqual(["А", "Б", "О", "О", "Т", "Т"]);
  });

  it("в строке О указаны режимы резания", () => {
    const o = buildRows(process()).find((r) => r.sym === "О" && r.cells[0].startsWith("1."));
    expect(o?.cells[0]).toMatch(/S=0,2; n=1273; V=180/);
  });

  it("операция без программы и оснастки даёт только А и Б", () => {
    const op = operation({ cam_code: null, cam_program_id: null, fixture: null, steps: [] });
    expect(buildRows(process({ operations: [op] })).slice(1).map((r) => r.sym)).toEqual(["А", "Б"]);
  });

  it("строка Б несёт Тпз и Тшт", () => {
    const b = buildRows(process()).find((r) => r.sym === "Б")!;
    expect(b.cells).toContain("18");
    expect(b.cells).toContain("2,206");
  });
});

describe("Разбивка на листы", () => {
  it("пустой техпроцесс — один лист", () => {
    expect(paginate(buildRows(process({ operations: [] })))).toHaveLength(1);
  });
  it("первый лист 15 строк, последующие по 22", () => {
    const ops = Array.from({ length: 8 }, (_, i) =>
      operation({ id: i + 1, op_no: String((i + 1) * 5).padStart(3, "0"), steps: [step(), step({ id: 2, step_no: 2 })] }));
    const rows = buildRows(process({ operations: ops }));
    const pages = paginate(rows);
    expect(pages[0]).toHaveLength(15);
    expect(pages[1]).toHaveLength(22);
    const filled = pages.flat().filter((r) => r.kind !== "blank");
    expect(filled).toHaveLength(rows.length);
  });
});

describe("Экран печати", () => {
  it("показывает штамп, номер листа и вызывает печать", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const onClose = vi.fn();
    render(<TechCardPrint tp={process()} onClose={onClose} />);

    expect(screen.getByText("МАРШРУТНАЯ КАРТА")).toBeInTheDocument();
    expect(screen.getByText("Лист 1")).toBeInTheDocument();
    expect(screen.getByText("Листов 1")).toBeInTheDocument();
    expect(screen.getAllByTestId("mk-sheet")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: /Печать/ }));
    expect(print).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: /К техкарте/ }));
    expect(onClose).toHaveBeenCalled();
  });
});
