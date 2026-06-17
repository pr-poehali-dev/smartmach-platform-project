import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MACHINE_TESTS_SEED, TEST_CATEGORIES, type TestRecord,
} from "@/components/smartmach/machineSpec.data";

const LS_KEY = "mat1_test_log";

const STATUS_CFG: Record<TestRecord["status"], { label: string; cls: string; dot: string; icon: string }> = {
  passed:  { label: "Пройдено", cls: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500", icon: "CheckCircle2" },
  failed:  { label: "Не пройдено", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", icon: "XCircle" },
  pending: { label: "В процессе", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: "Clock" },
};

const EMPTY = {
  date: new Date().toISOString().slice(0, 10),
  category: "Геометрия",
  title: "",
  method: "",
  expected: "",
  actual: "",
  status: "pending" as TestRecord["status"],
  engineer: "",
};

function loadTests(): TestRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return MACHINE_TESTS_SEED;
}

export default function MachineTestLog() {
  const [tests, setTests] = useState<TestRecord[]>(loadTests);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState<"all" | TestRecord["status"]>("all");

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(tests)); } catch { /* ignore */ }
  }, [tests]);

  const f = (k: keyof typeof EMPTY, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Укажите название испытания"); return; }
    const newId = tests.length ? Math.max(...tests.map((t) => t.id)) + 1 : 1;
    setTests((prev) => [{ ...form, id: newId }, ...prev]);
    setForm(EMPTY);
    setShowForm(false);
    toast.success("Запись добавлена в журнал");
  }

  function handleDelete(id: number) {
    setTests((prev) => prev.filter((t) => t.id !== id));
    toast.success("Запись удалена");
  }

  function cycleStatus(id: number) {
    const order: TestRecord["status"][] = ["pending", "passed", "failed"];
    setTests((prev) => prev.map((t) =>
      t.id === id ? { ...t, status: order[(order.indexOf(t.status) + 1) % 3] } : t
    ));
  }

  const stats = {
    total: tests.length,
    passed: tests.filter((t) => t.status === "passed").length,
    failed: tests.filter((t) => t.status === "failed").length,
    pending: tests.filter((t) => t.status === "pending").length,
  };
  const passRate = stats.total ? Math.round((stats.passed / stats.total) * 100) : 0;

  const filtered = filter === "all" ? tests : tests.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">всего испытаний</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-2xl font-bold text-green-600">{passRate}%</div>
          <div className="text-xs text-muted-foreground">успешно пройдено</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">в процессе</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">не пройдено</div>
        </div>
      </div>

      {/* Шапка + фильтры */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-secondary/40 p-1 rounded-lg">
          {([["all", "Все"], ["passed", "Пройдено"], ["pending", "В процессе"], ["failed", "Не пройдено"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                filter === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Icon name="Plus" size={15} />
          Запись
        </button>
      </div>

      {/* Форма добавления */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-border p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название испытания *</label>
              <input value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="Точность позиционирования оси Z"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
              <select value={form.category} onChange={(e) => f("category", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Методика / стандарт</label>
              <input value={form.method} onChange={(e) => f("method", e.target.value)} placeholder="ГОСТ 8-82, лазерный интерферометр"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ожидаемый результат</label>
              <input value={form.expected} onChange={(e) => f("expected", e.target.value)} placeholder="±0,05 мм"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Фактический результат</label>
              <input value={form.actual} onChange={(e) => f("actual", e.target.value)} placeholder="±0,04 мм"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Дата</label>
              <input type="date" value={form.date} onChange={(e) => f("date", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Исполнитель</label>
              <input value={form.engineer} onChange={(e) => f("engineer", e.target.value)} placeholder="Фамилия И.О."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
              <select value={form.status} onChange={(e) => f("status", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="pending">В процессе</option>
                <option value="passed">Пройдено</option>
                <option value="failed">Не пройдено</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90">Добавить</button>
          </div>
        </form>
      )}

      {/* Список записей */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 flex flex-col items-center gap-3 text-center">
          <Icon name="FlaskConical" size={36} className="text-muted-foreground opacity-20" />
          <p className="text-sm text-muted-foreground">Записей в этой категории нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const cfg = STATUS_CFG[t.status];
            return (
              <div key={t.id} className="bg-white rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => cycleStatus(t.id)}
                    title="Сменить статус"
                    className={cn("w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors", cfg.cls)}
                  >
                    <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={16} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{t.category}</span>
                      <h3 className="font-semibold text-foreground text-sm">{t.title}</h3>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.cls)}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{t.method}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex gap-1.5">
                        <span className="text-muted-foreground">Ожидалось:</span>
                        <span className="font-medium text-foreground">{t.expected || "—"}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="text-muted-foreground">Факт:</span>
                        <span className={cn("font-medium", t.status === "failed" ? "text-red-600" : "text-foreground")}>{t.actual || "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={() => handleDelete(t.id)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Icon name="Trash2" size={13} />
                    </button>
                    <div className="text-[11px] text-muted-foreground text-right">
                      <div>{new Date(t.date).toLocaleDateString("ru-RU")}</div>
                      {t.engineer && <div className="mt-0.5">{t.engineer}</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-4 py-3">
        <Icon name="Info" size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <p>Журнал испытаний сохраняется в браузере. Нажмите на иконку статуса слева, чтобы переключить результат испытания.</p>
      </div>
    </div>
  );
}
