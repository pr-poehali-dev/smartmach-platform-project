import Icon from "@/components/ui/icon";
import { Part } from "@/lib/manufacture";
import { STATUS_CFG, catIcon, catColor } from "@/components/smartmach/cad.data";

/* ─── карточка детали ────────────────────────────────────────────── */

export function PartCard({
  part, active, onClick,
}: { part: Part; active: boolean; onClick: () => void }) {
  const cfg = STATUS_CFG[part.status] ?? STATUS_CFG.ok;
  return (
    <div onClick={onClick}
      className={`group flex gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm
        ${active ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border bg-white hover:border-primary/30"}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${catColor(part.category)}`}>
        <Icon name={catIcon(part.category)} size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground leading-tight truncate">{part.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">
          {part.code}{part.material ? ` · ${part.material}` : ""}{part.dimensions ? ` · ${part.dimensions}` : ""}
        </div>
        {part.standard && (
          <div className="text-xs text-muted-foreground/70 mt-0.5">{part.standard}</div>
        )}
      </div>
      {part.collisions > 0 && (
        <span className="self-start mt-0.5 text-xs text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
          {part.collisions}к
        </span>
      )}
      <span className={`self-start mt-0.5 text-xs font-medium border px-1.5 py-0.5 rounded-full flex items-center gap-0.5 flex-shrink-0 ${cfg.color}`}>
        <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={10} />
      </span>
    </div>
  );
}

/* ─── детальная панель ───────────────────────────────────────────── */

export function DetailPanel({
  part, onUseAsBase, onStatusChange,
}: { part: Part; onUseAsBase: (p: Part) => void; onStatusChange: (p: Part, s: string) => void }) {
  const cfg = STATUS_CFG[part.status] ?? STATUS_CFG.ok;
  const extra = part as Part & {
    roughness?: string; fit_type?: string; tolerance?: string; drawing_number?: string;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${catColor(part.category)}`}>
          <Icon name={catIcon(part.category)} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground leading-tight">{part.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{part.code} · {part.version}</div>
        </div>
        <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${cfg.color}`}>
          <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={11} />{cfg.label}
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        {([
          ["Категория",        part.category],
          part.material        && ["Материал",        part.material],
          part.dimensions      && ["Габариты",        part.dimensions],
          part.weight_kg       && ["Масса",           `${part.weight_kg} кг`],
          part.standard        && ["Стандарт",        part.standard],
          extra.roughness      && ["Шероховатость",   extra.roughness],
          extra.fit_type       && ["Тип посадки",     extra.fit_type],
          extra.tolerance      && ["Допуск",          extra.tolerance],
          extra.drawing_number && ["Номер чертежа",   extra.drawing_number],
          part.author_name     && ["Автор",           part.author_name],
        ] as (string[] | false)[]).filter(Boolean).map((r) => {
          const [k, v] = r as string[];
          return (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-muted-foreground whitespace-nowrap">{k}</span>
              <span className="font-medium text-foreground text-right">{v}</span>
            </div>
          );
        })}
      </div>

      {part.notes && (
        <p className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2.5 leading-relaxed">{part.notes}</p>
      )}

      {part.is_template && (
        <button onClick={() => onUseAsBase(part)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Icon name="Copy" size={15} />Взять за основу
        </button>
      )}

      {!part.is_template && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Сменить статус</div>
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(STATUS_CFG).map(([key, c]) => (
              <button key={key} onClick={() => onStatusChange(part, key)} disabled={part.status === key}
                className={`text-xs border px-2 py-0.5 rounded-full ${c.color} ${part.status === key ? "font-semibold" : "opacity-50 hover:opacity-80"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
