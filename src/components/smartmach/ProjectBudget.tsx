import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  BudgetItem, BudgetCategory,
  BUDGET_CAT_CFG,
  projPost, projPut,
  fmt,
} from "@/lib/projects";

interface Props {
  projectId: number;
  budgetPlan: number;
  items: BudgetItem[];
  onRefresh: () => void;
}

const inp = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white";

function BudgetForm({ projectId, item, onSaved, onClose }: {
  projectId: number;
  item?: BudgetItem | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<BudgetCategory>(item?.category ?? "other");
  const [name,     setName]     = useState(item?.name ?? "");
  const [plan,     setPlan]     = useState(String(item?.plan ?? ""));
  const [fact,     setFact]     = useState(String(item?.fact ?? ""));
  const [note,     setNote]     = useState(item?.note ?? "");
  const [saving,   setSaving]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const body = {
      project_id: projectId,
      category, name: name.trim(),
      plan: parseFloat(plan) || 0,
      fact: parseFloat(fact) || 0,
      note: note || null,
    };
    try {
      if (item) {
        await projPut(body, { resource: "budget_item", id: item.id });
      } else {
        await projPost(body, { resource: "budget_item" });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">{item ? "Редактировать статью" : "Новая статья бюджета"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Категория</label>
              <select value={category} onChange={e => setCategory(e.target.value as BudgetCategory)} className={inp}>
                {Object.entries(BUDGET_CAT_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Статья *</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Металлопрокат" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Бюджет (план), ₽</label>
              <input type="number" value={plan} onChange={e => setPlan(e.target.value)} className={inp} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Затрачено (факт), ₽</label>
              <input type="number" value={fact} onChange={e => setFact(e.target.value)} className={inp} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Примечание</label>
            <input value={note} onChange={e => setNote(e.target.value)} className={inp} placeholder="Поставщик, основание…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
            <button type="submit" disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
              {item ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectBudget({ projectId, budgetPlan, items, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);

  const totalPlan = items.reduce((s, i) => s + i.plan, 0);
  const totalFact = items.reduce((s, i) => s + i.fact, 0);
  const variance  = totalPlan > 0 ? ((totalFact - totalPlan) / totalPlan) * 100 : 0;
  const pct       = totalPlan > 0 ? Math.min((totalFact / totalPlan) * 100, 100) : 0;

  // Группировка по категориям
  const byCategory = Object.keys(BUDGET_CAT_CFG).map(cat => ({
    cat: cat as BudgetCategory,
    items: items.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Итоговые карточки */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Бюджет проекта",  value: `${fmt(budgetPlan)} ₽`,  icon: "Wallet",       color: "text-blue-600 bg-blue-50" },
          { label: "Статей в бюджете",value: `${fmt(totalPlan)} ₽`,   icon: "List",         color: "text-slate-600 bg-secondary/40" },
          { label: "Израсходовано",   value: `${fmt(totalFact)} ₽`,   icon: "CreditCard",   color: totalFact > totalPlan ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
          { label: "Отклонение",      value: `${variance >= 0 ? "+" : ""}${variance.toFixed(1)}%`, icon: "TrendingUp", color: variance > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
        ].map(kpi => (
          <div key={kpi.label} className={cn("rounded-xl p-3 flex items-center gap-3", kpi.color.split(" ")[1])}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", kpi.color.split(" ")[1])}>
              <Icon name={kpi.icon as Parameters<typeof Icon>[0]["name"]} size={16} className={kpi.color.split(" ")[0]} />
            </div>
            <div>
              <div className="font-bold text-foreground text-sm">{kpi.value}</div>
              <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Прогресс освоения бюджета */}
      <div className="bg-white border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Освоение бюджета</span>
          <span className={cn("font-semibold", pct > 90 ? "text-red-600" : "text-foreground")}>{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", pct > 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500")}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>0</span>
          <span>{fmt(totalPlan)} ₽</span>
        </div>
      </div>

      {/* Таблица статей */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
          <h3 className="font-semibold text-sm text-foreground">Статьи бюджета</h3>
          <button onClick={() => { setEditItem(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
            <Icon name="Plus" size={13} />Добавить статью
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Icon name="Wallet" size={28} className="mx-auto mb-2 opacity-30" />
            Статей бюджета нет. Добавьте первую.
          </div>
        ) : (
          <div>
            {/* Заголовок */}
            <div className="grid grid-cols-[1fr_100px_100px_80px_30px] gap-2 px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground border-b border-border/50 bg-secondary/30">
              <div>Статья</div>
              <div className="text-right">План</div>
              <div className="text-right">Факт</div>
              <div className="text-right">%</div>
              <div />
            </div>

            {byCategory.map(({ cat, items: catItems }) => {
              const catPlan = catItems.reduce((s, i) => s + i.plan, 0);
              const catFact = catItems.reduce((s, i) => s + i.fact, 0);
              const cfg = BUDGET_CAT_CFG[cat];
              return (
                <div key={cat}>
                  {/* Группа */}
                  <div className="grid grid-cols-[1fr_100px_100px_80px_30px] gap-2 px-4 py-1.5 bg-secondary/20 border-b border-border/30">
                    <div className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</div>
                    <div className="text-xs font-semibold text-right text-muted-foreground">{fmt(catPlan)} ₽</div>
                    <div className="text-xs font-semibold text-right text-muted-foreground">{fmt(catFact)} ₽</div>
                    <div className="text-xs text-right text-muted-foreground">
                      {catPlan > 0 ? `${((catFact/catPlan)*100).toFixed(0)}%` : "—"}
                    </div>
                    <div />
                  </div>
                  {catItems.map(item => {
                    const itemPct = item.plan > 0 ? (item.fact / item.plan) * 100 : 0;
                    return (
                      <div key={item.id}
                        className="grid grid-cols-[1fr_100px_100px_80px_30px] gap-2 px-4 py-2 border-b border-border/30 hover:bg-secondary/10 text-sm">
                        <div className="min-w-0">
                          <div className="truncate">{item.name}</div>
                          {item.note && <div className="text-[10px] text-muted-foreground truncate">{item.note}</div>}
                        </div>
                        <div className="text-sm text-right text-muted-foreground">{fmt(item.plan)} ₽</div>
                        <div className={cn("text-sm text-right font-medium",
                          item.fact > item.plan ? "text-red-600" : "text-foreground")}>
                          {fmt(item.fact)} ₽
                        </div>
                        <div className={cn("text-sm text-right",
                          itemPct > 100 ? "text-red-600 font-bold" : itemPct > 80 ? "text-amber-600" : "text-emerald-600")}>
                          {item.plan > 0 ? `${itemPct.toFixed(0)}%` : "—"}
                        </div>
                        <button onClick={() => { setEditItem(item); setShowForm(true); }}
                          className="flex items-center justify-center text-muted-foreground hover:text-foreground">
                          <Icon name="Pencil" size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Итого */}
            <div className="grid grid-cols-[1fr_100px_100px_80px_30px] gap-2 px-4 py-2.5 bg-secondary/40 border-t border-border font-semibold text-sm">
              <div>Итого</div>
              <div className="text-right">{fmt(totalPlan)} ₽</div>
              <div className={cn("text-right", totalFact > totalPlan ? "text-red-600" : "")}>{fmt(totalFact)} ₽</div>
              <div className={cn("text-right", variance > 0 ? "text-red-600" : "text-emerald-600")}>
                {variance >= 0 ? "+" : ""}{variance.toFixed(1)}%
              </div>
              <div />
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <BudgetForm
          projectId={projectId}
          item={editItem}
          onSaved={() => { setShowForm(false); onRefresh(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
