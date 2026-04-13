import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Program, Part, Machine, User } from "@/lib/manufacture";
import {
  STATUS_CFG, PRIORITY_CFG, NEXT_LABEL, EMPTY_FORM,
  OPERATION_TYPES, POSTPROCESSORS, MATERIALS,
} from "@/components/smartmach/cam.data";

interface Props {
  programs: Program[];
  parts: Part[];
  machines: Machine[];
  users: User[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  saving: boolean;
  form: typeof EMPTY_FORM;
  onSetShowForm: (v: boolean) => void;
  onSetForm: (v: typeof EMPTY_FORM) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAdvance: (p: Program) => void;
  onRetry: () => void;
}

const STATUS_ORDER = ["queue", "running", "review", "done", "error", "cancelled"];

export default function CamPrograms({
  programs, parts, machines, users,
  loading, error, showForm, saving, form,
  onSetShowForm, onSetForm, onSubmit, onAdvance, onRetry,
}: Props) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Program | null>(null);

  const f = (k: keyof typeof EMPTY_FORM, v: string) => onSetForm({ ...form, [k]: v });

  const filtered = programs.filter((p) => {
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchPriority = filterPriority === "all" || (p as Record<string, unknown>).priority === filterPriority;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.part_name ?? "").toLowerCase().includes(q) || (p.machine_name ?? "").toLowerCase().includes(q);
    return matchStatus && matchPriority && matchSearch;
  });

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = programs.filter((p) => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      {/* Pipeline summary */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CFG[s];
          return (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium shrink-0 transition-colors ${
                filterStatus === s ? `${cfg.color} border-current` : "border-border text-muted-foreground hover:border-primary/40"
              }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${filterStatus === s ? "" : "bg-secondary"}`}>
                {counts[s] ?? 0}
              </span>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Search + priority filter */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, детали, станку..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          {[["all", "Все приоритеты"], ...Object.entries(PRIORITY_CFG).map(([k, v]) => [k, v.label])].map(([id, label]) => (
            <button key={id} onClick={() => setFilterPriority(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterPriority === id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Новая управляющая программа</span>
            <button onClick={() => onSetShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Basic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Название *">
                <input required value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Фрезеровка корпуса А-01"
                  className="form-input" />
              </FormField>
              <FormField label="Тип операции">
                <select value={form.operation_type} onChange={(e) => f("operation_type", e.target.value)} className="form-input">
                  <option value="">— выберите —</option>
                  {OPERATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Приоритет">
                <select value={form.priority} onChange={(e) => f("priority", e.target.value)} className="form-input">
                  {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </FormField>
              <FormField label="Оценка времени">
                <input value={form.est_time} onChange={(e) => f("est_time", e.target.value)} placeholder="2ч 30м"
                  className="form-input" />
              </FormField>
              <FormField label="Деталь">
                <select value={form.part_id} onChange={(e) => f("part_id", e.target.value)} className="form-input">
                  <option value="">— не выбрана —</option>
                  {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                </select>
              </FormField>
              <FormField label="Станок">
                <select value={form.machine_id} onChange={(e) => f("machine_id", e.target.value)} className="form-input">
                  <option value="">— не выбран —</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </FormField>
              <FormField label="Автор">
                <select value={form.author_id} onChange={(e) => f("author_id", e.target.value)} className="form-input">
                  <option value="">— не выбран —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </FormField>
              <FormField label="Постпроцессор">
                <select value={form.postprocessor} onChange={(e) => f("postprocessor", e.target.value)} className="form-input">
                  <option value="">— выберите —</option>
                  {POSTPROCESSORS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
            </div>

            {/* Cutting parameters */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 border-t border-border pt-3">Режимы резания</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FormField label="Материал">
                  <select value={form.material} onChange={(e) => f("material", e.target.value)} className="form-input">
                    <option value="">—</option>
                    {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FormField>
                <FormField label="Инструмент">
                  <input value={form.tool_name} onChange={(e) => f("tool_name", e.target.value)} placeholder="Фреза Ø16 Z4"
                    className="form-input" />
                </FormField>
                <FormField label="Диаметр, мм">
                  <input type="number" value={form.tool_diameter} onChange={(e) => f("tool_diameter", e.target.value)} placeholder="16"
                    className="form-input" />
                </FormField>
                <FormField label="Скорость шпинделя, об/мин">
                  <input type="number" value={form.spindle_speed} onChange={(e) => f("spindle_speed", e.target.value)} placeholder="6000"
                    className="form-input" />
                </FormField>
                <FormField label="Подача, мм/мин">
                  <input type="number" value={form.feed_rate} onChange={(e) => f("feed_rate", e.target.value)} placeholder="800"
                    className="form-input" />
                </FormField>
                <FormField label="Глубина резания, мм">
                  <input type="number" value={form.depth_of_cut} onChange={(e) => f("depth_of_cut", e.target.value)} placeholder="3"
                    className="form-input" />
                </FormField>
              </div>
            </div>

            {/* G-code & notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="G-код программы">
                <textarea value={form.code} onChange={(e) => f("code", e.target.value)}
                  placeholder="G21 G90 G54&#10;T01 M06&#10;S6000 M03&#10;..."
                  rows={4} className="form-input font-mono text-xs resize-none" />
              </FormField>
              <FormField label="Примечания">
                <textarea value={form.notes} onChange={(e) => f("notes", e.target.value)}
                  placeholder="Особенности обработки, допуски, требования к качеству поверхности..."
                  rows={4} className="form-input resize-none" />
              </FormField>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => onSetShowForm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? "Сохранение…" : "Создать программу"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Programs list */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
          <span className="text-sm font-semibold">Управляющие программы</span>
          <span className="text-xs text-muted-foreground">{filtered.length} из {programs.length}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 text-sm">
            <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error}
            <button onClick={onRetry} className="mt-2 block mx-auto text-xs underline">Повторить</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="FileCode" size={36} className="mx-auto mb-2 opacity-20" />
            {programs.length === 0 ? "Программ пока нет. Добавьте первую." : "Нет программ по выбранным фильтрам."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((p) => {
              const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.queue;
              const nextAction = NEXT_LABEL[p.status];
              const pr = (p as Record<string, unknown>).priority as string | undefined;
              const prio = PRIORITY_CFG[pr ?? "normal"];
              return (
                <div key={p.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(p)}>
                  {/* Priority stripe */}
                  <div className={`w-1 h-10 rounded-full shrink-0 ${
                    pr === "high" ? "bg-red-400" : pr === "low" ? "bg-gray-300" : "bg-blue-400"
                  }`} />
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <Icon name="FileCode" size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      {p.part_name && <span className="flex items-center gap-1"><Icon name="Box" size={10} />{p.part_name}</span>}
                      {p.machine_name && <span className="flex items-center gap-1"><Icon name="Cpu" size={10} />{p.machine_name}</span>}
                      {p.author_name && <span className="flex items-center gap-1"><Icon name="User" size={10} />{p.author_name}</span>}
                      {p.est_time && <span className="flex items-center gap-1"><Icon name="Clock" size={10} />{p.est_time}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {prio && (
                      <span className={`text-[11px] font-medium border px-2 py-0.5 rounded-full hidden sm:inline ${prio.color}`}>
                        {prio.label}
                      </span>
                    )}
                    {nextAction && (
                      <button onClick={(e) => { e.stopPropagation(); onAdvance(p); }}
                        className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90">
                        {nextAction}
                      </button>
                    )}
                    <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[selected.part_name, selected.machine_name].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium border px-2.5 py-1 rounded-full ${STATUS_CFG[selected.status]?.color ?? ""}`}>
                  {STATUS_CFG[selected.status]?.label}
                </span>
                <button onClick={() => setSelected(null)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Key params grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { icon: "Clock", label: "Время", value: selected.est_time },
                  { icon: "User", label: "Автор", value: selected.author_name },
                  { icon: "Calendar", label: "Создана", value: selected.created_at ? new Date(selected.created_at).toLocaleDateString("ru") : null },
                  { icon: "Play", label: "Запущена", value: selected.started_at ? new Date(selected.started_at).toLocaleDateString("ru") : null },
                  { icon: "CheckCircle", label: "Завершена", value: selected.finished_at ? new Date(selected.finished_at).toLocaleDateString("ru") : null },
                ].filter((r) => r.value).map((r) => (
                  <div key={r.label} className="bg-secondary/40 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Icon name={r.icon as Parameters<typeof Icon>[0]["name"]} size={12} />{r.label}
                    </div>
                    <p className="text-sm font-medium">{r.value}</p>
                  </div>
                ))}
              </div>

              {/* G-code preview */}
              {selected.code && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">G-код</p>
                  <pre className="bg-gray-950 text-green-400 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-48 leading-relaxed">
                    {selected.code}
                  </pre>
                </div>
              )}

              {/* Advance button */}
              {NEXT_LABEL[selected.status] && (
                <div className="flex justify-end">
                  <button onClick={() => { onAdvance(selected); setSelected(null); }}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
                    <Icon name="ArrowRight" size={15} />
                    {NEXT_LABEL[selected.status]}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`.form-input { width: 100%; border: 1px solid hsl(var(--border)); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; background: white; } .form-input:focus { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2); }`}</style>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground block">{label}</label>
      {children}
    </div>
  );
}