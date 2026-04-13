import Icon from "@/components/ui/icon";
import { Program, Part, Machine, User } from "@/lib/manufacture";
import { STATUS_CFG, NEXT_LABEL, EMPTY_FORM } from "@/components/smartmach/cam.data";

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

export default function CamPrograms({
  programs, parts, machines, users,
  loading, error, showForm, saving, form,
  onSetShowForm, onSetForm, onSubmit, onAdvance, onRetry,
}: Props) {
  const f = (k: keyof typeof EMPTY_FORM, v: string) => onSetForm({ ...form, [k]: v });

  return (
    <>
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">Новая управляющая программа</span>
            <button onClick={() => onSetShowForm(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input required value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Фрезеровка корпуса"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Код программы</label>
              <input value={form.code} onChange={(e) => f("code", e.target.value)} placeholder="Текст управляющей программы..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Оценка времени</label>
              <input value={form.est_time} onChange={(e) => f("est_time", e.target.value)} placeholder="2ч 30м"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Деталь</label>
              <select value={form.part_id} onChange={(e) => f("part_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбрана —</option>
                {parts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Станок</label>
              <select value={form.machine_id} onChange={(e) => f("machine_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбран —</option>
                {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Автор</label>
              <select value={form.author_id} onChange={(e) => f("author_id", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— не выбран —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => onSetShowForm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
                {saving ? "Сохранение…" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold">Очередь программ</span>
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
        ) : programs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="FileCode" size={36} className="mx-auto mb-2 opacity-20" />Программ пока нет. Добавьте первую.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {programs.map((p) => {
              const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.queue;
              const nextAction = NEXT_LABEL[p.status];
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="FileCode" size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.part_name, p.machine_name, p.est_time].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {nextAction && (
                    <button onClick={() => onAdvance(p)}
                      className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90 flex-shrink-0">
                      {nextAction}
                    </button>
                  )}
                  <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
