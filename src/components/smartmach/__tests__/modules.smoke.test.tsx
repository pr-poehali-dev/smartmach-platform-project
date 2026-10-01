/**
 * Дымовой тест: каждый раздел системы открывается без падения
 * и при пустом ответе сервера, и при ошибке сервера.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import type { ComponentType } from "react";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Тест Тестов", email: "t@t.ru", role: "admin", company_id: 1, company_name: "Тест" },
    loading: false, login: vi.fn(), logout: vi.fn(), register: vi.fn(), refresh: vi.fn(),
  }),
  getAuthHeaders: () => ({}),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));

type Mode = "empty" | "error";
let mode: Mode = "empty";

function emptyBody(url: string): unknown {
  const u = new URL(url);
  const r = u.searchParams.get("resource");
  if (r === "parts") return { items: [], total: 0, limit: 50, offset: 0 };
  if (r === "stats") return {
    parts_total: 0, machines_total: 0, machines_running: 0, programs_running: 0,
    jobs_active: 0, jobs_done: 0, sims_error: 0, products_total: 0,
  };
  if (r === "demo") return { loaded: false };
  if (r === "dashboard") return { total: 0, active: 0, recent_projects: [] };
  return [];
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (mode === "error") return new Response(JSON.stringify({ error: "Сбой сервера" }), { status: 500 });
    return new Response(JSON.stringify(emptyBody(url)), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODULES: [string, () => Promise<{ default: ComponentType<any> }>][] = [
  ["Обзор", () => import("@/components/smartmach/DashboardHome")],
  ["Проектирование", () => import("@/components/smartmach/ModuleCAD")],
  ["Программы ЧПУ", () => import("@/components/smartmach/ModuleCAM")],
  ["Расчёты", () => import("@/components/smartmach/ModuleCAE")],
  ["Жизненный цикл", () => import("@/components/smartmach/ModulePLM")],
  ["Оборудование", () => import("@/components/smartmach/ModuleCNC")],
  ["Задания", () => import("@/components/smartmach/ModuleAnalytics")],
  ["Справочник оборудования", () => import("@/components/smartmach/ModuleEquipment")],
  ["Экономика", () => import("@/components/smartmach/ModuleEconomics")],
  ["Сотрудники", () => import("@/components/smartmach/ModuleEmployees")],
  ["Состав изделия", () => import("@/components/smartmach/ModuleAssembly")],
  ["Проекты", () => import("@/components/smartmach/ModuleProjects")],
  ["Станок МАТ-1", () => import("@/components/smartmach/ModuleMachine")],
  ["Техкарты", () => import("@/components/smartmach/ModuleTechCards")],
  ["ИИ-конструктор", () => import("@/components/smartmach/ModuleAiDesigner")],
];

const noop = () => {};
const props = {
  onNavigate: noop, onNavigateToCam: noop, onNavigateToJob: noop, onNavigateToPart: noop,
  onNavigateToProgram: noop,
};

describe.each(["empty", "error"] as Mode[])("Разделы открываются (сервер: %s)", (m) => {
  it.each(MODULES)("%s", async (_name, load) => {
    mode = m;
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...a) => {
      const msg = String(a[0] ?? "");
      if (/act\(|not wrapped in act|validateDOMNesting|Missing `Description`|aria-describedby/i.test(msg)) return;
      errors.push(a);
    });
    const { default: Module } = await load();
    let container!: HTMLElement;
    await act(async () => {
      container = render(<Module {...props} />).container;
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(screen.queryByText(/Something went wrong|Произошла ошибка в интерфейсе/i)).toBeNull();
    const crashes = errors.filter((a) => /The above error occurred|Uncaught|TypeError|ReferenceError/i
      .test((a as unknown[]).map(String).join(" ")));
    expect(crashes, JSON.stringify(crashes.map((a) => String((a as unknown[])[0]).slice(0, 300)))).toHaveLength(0);
    spy.mockRestore();
  }, 15000);
});
