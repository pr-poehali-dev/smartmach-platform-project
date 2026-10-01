import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({ demoStatus: vi.fn(), demoLoad: vi.fn(), demoClear: vi.fn() }));
vi.mock("@/lib/techcard", () => api);
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import DemoDataButton from "@/components/smartmach/DemoDataButton";
import { toast } from "sonner";

beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); });

describe("Кнопка «Заполнить примером»", () => {
  it("загружает пример и переключается на «Убрать пример»", async () => {
    api.demoStatus.mockResolvedValue({ loaded: false });
    api.demoLoad.mockResolvedValue({ parts: 6, equipment: 5, programs: 4 });
    const onChanged = vi.fn();
    render(<DemoDataButton onChanged={onChanged} />);

    await userEvent.click(await screen.findByRole("button", { name: /Заполнить примером/ }));
    expect(api.demoLoad).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: /Убрать пример/ })).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("6 деталей"));
  });

  it("удаляет пример только после подтверждения", async () => {
    api.demoStatus.mockResolvedValue({ loaded: true });
    api.demoClear.mockResolvedValue({ ok: true });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<DemoDataButton />);

    const btn = await screen.findByRole("button", { name: /Убрать пример/ });
    await userEvent.click(btn);
    expect(api.demoClear).not.toHaveBeenCalled();
    await userEvent.click(btn);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(api.demoClear).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: /Заполнить примером/ })).toBeInTheDocument();
  });

  it("показывает ошибку сервера и остаётся в прежнем состоянии", async () => {
    api.demoStatus.mockResolvedValue({ loaded: false });
    api.demoLoad.mockRejectedValue(new Error("Пример уже загружен. Сначала удалите его."));
    render(<DemoDataButton />);
    await userEvent.click(await screen.findByRole("button", { name: /Заполнить примером/ }));
    expect(toast.error).toHaveBeenCalledWith("Пример уже загружен. Сначала удалите его.");
    expect(screen.getByRole("button", { name: /Заполнить примером/ })).toBeEnabled();
  });

  it("скрыта, если сервер недоступен", async () => {
    api.demoStatus.mockRejectedValue(new Error("401"));
    const { container } = render(<DemoDataButton />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
