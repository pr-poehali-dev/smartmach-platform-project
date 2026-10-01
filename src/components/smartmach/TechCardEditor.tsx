import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TechOperationForm from "@/components/smartmach/TechOperationForm";
import TechStepForm from "@/components/smartmach/TechStepForm";
import TechCardPrint from "@/components/smartmach/TechCardPrint";
import {
  type TechProcess, type TechOperation, type TechStep, TP_STATUS,
  tcGet, tcUpdate, opCreate, opUpdate, opDelete, stepCreate, stepUpdate, stepDelete,
  fmtMin, fmtNum, toNum,
} from "@/lib/techcard";

interface Props { id: number; onBack: () => void }

const HEAD_FIELDS: [keyof TechProcess, string][] = [
  ["code", "Обозначение ТП"], ["material", "Материал"], ["blank_type", "Вид заготовки"],
  ["blank_size", "Профиль и размеры"], ["blank_mass", "Масса заготовки, кг"], ["part_mass", "Масса детали, кг"],
  ["batch_size", "Партия, шт"], ["developer", "Разработал"], ["checker", "Проверил"], ["approver", "Утвердил"],
];

export default function TechCardEditor({ id, onBack }: Props) {
  const [tp, setTp] = useState<TechProcess | null>(null);
  const [head, setHead] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [editOp, setEditOp] = useState<Partial<TechOperation> | null>(null);
  const [editStep, setEditStep] = useState<{ opId: number; step: Partial<TechStep> | null } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((p: TechProcess) => {
    setTp((prev) => {
      if (prev) {
        const known = new Set(prev.operations.map((o) => o.id));
        const fresh = p.operations.filter((o) => !known.has(o.id)).map((o) => o.id);
        if (fresh.length) setOpen((s) => new Set([...s, ...fresh]));
      }
      return p;
    });
    const h: Record<string, string> = { name: p.name ?? "", status: p.status };
    for (const [k] of HEAD_FIELDS) h[k] = p[k] === null || p[k] === undefined ? "" : String(p[k]);
    setHead(h);
    setDirty(false);
  }, []);

  useEffect(() => {
    tcGet(id).then((p) => { apply(p); setOpen(new Set(p.operations.map((o) => o.id))); })
      .catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить техкарту"));
  }, [id, apply]);

  const run = async (fn: () => Promise<TechProcess>, msg?: string) => {
    try { apply(await fn()); if (msg) toast.success(msg); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); throw e; }
  };

  const saveHead = () => run(() => tcUpdate(id, {
    ...head,
    blank_mass: toNum(head.blank_mass) as number | null,
    part_mass: toNum(head.part_mass) as number | null,
    batch_size: Math.max(1, Math.round(toNum(head.batch_size) || 1)),
  } as Partial<TechProcess>), "Шапка техкарты сохранена");

  const toggle = (opId: number) => setOpen((s) => {
    const n = new Set(s); if (n.has(opId)) n.delete(opId); else n.add(opId); return n;
  });

  if (error) return (
    <div className="p-6 space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack}><Icon name="ChevronLeft" size={15} className="mr-1" />К списку</Button>
      <p className="text-destructive">{error}</p>
    </div>
  );
  if (!tp) return (
    <div className="p-6 flex items-center gap-2 text-muted-foreground"><Icon name="Loader2" size={18} className="animate-spin" />Загрузка техкарты…</div>
  );

  if (printing) return <TechCardPrint tp={tp} onClose={() => setPrinting(false)} />;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><Icon name="ChevronLeft" size={15} className="mr-1" />К списку</Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground truncate">{tp.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tp.part_code ? `${tp.part_code} · ${tp.part_name}` : "Без привязки к детали"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPrinting(true)} disabled={!tp.operations.length}>
          <Icon name="Printer" size={15} className="mr-1.5" />Маршрутная карта
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Операций", String(tp.operations.length), "ListOrdered"],
          ["Тшт на деталь", fmtMin(tp.total_t_sht), "Timer"],
          ["Тшк на деталь", fmtMin(tp.total_t_sht_k), "Clock"],
          ["Трудоёмкость партии", fmtMin(tp.total_t_sht_k * (tp.batch_size || 1)), "Layers"],
        ].map(([label, val, icon]) => (
          <div key={label} className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name={icon} size={13} />{label}</div>
            <div className="text-lg font-semibold mt-1">{val}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Шапка техпроцесса</h2>
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={head.status}
            onChange={(e) => { setHead((h) => ({ ...h, status: e.target.value })); setDirty(true); }}>
            {Object.entries(TP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <Label>Наименование</Label>
          <Input value={head.name} onChange={(e) => { setHead((h) => ({ ...h, name: e.target.value })); setDirty(true); }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {HEAD_FIELDS.map(([k, label]) => (
            <div key={k}>
              <Label className="text-xs">{label}</Label>
              <Input value={head[k] ?? ""} onChange={(e) => { setHead((h) => ({ ...h, [k]: e.target.value })); setDirty(true); }} />
            </div>
          ))}
        </div>
        {dirty && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => apply(tp)}>Отменить</Button>
            <Button size="sm" onClick={saveHead}>Сохранить шапку</Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Маршрут обработки</h2>
          <Button size="sm" onClick={() => setEditOp({})}><Icon name="Plus" size={15} className="mr-1" />Операция</Button>
        </div>

        {tp.operations.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            Маршрут пуст. Добавьте первую операцию — например, «Отрезная» или «Токарная с ЧПУ».
          </div>
        )}

        {tp.operations.map((op) => (
          <div key={op.id} className="rounded-xl border bg-card overflow-hidden" data-testid="tech-op">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <button onClick={() => toggle(op.id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                <Icon name={open.has(op.id) ? "ChevronDown" : "ChevronRight"} size={16} className="text-muted-foreground shrink-0" />
                <span className="font-mono text-sm text-muted-foreground">{op.op_no}</span>
                <span className="font-medium truncate">{op.name}</span>
              </button>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {(op.eq_model || op.equipment_name) && (
                  <span className="flex items-center gap-1"><Icon name="Cog" size={12} />{op.eq_model ? `${op.eq_model} ${op.eq_name}` : op.equipment_name}</span>
                )}
                {op.cam_code && (
                  <span className="flex items-center gap-1 rounded bg-purple-100 text-purple-800 px-1.5 py-0.5" title={op.cam_name ?? ""}>
                    <Icon name="Cpu" size={12} />{op.cam_code}{op.cam_est ? ` · ${op.cam_est}` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span title="Основное время">То <b>{fmtNum(op.t_main, 2)}</b></span>
                <span title="Штучное время">Тшт <b>{fmtNum(op.t_sht, 2)}</b></span>
                <span title="Штучно-калькуляционное время">Тшк <b>{fmtNum(op.t_sht_k, 2)}</b></span>
              </div>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={() => setEditOp(op)} title="Изменить"><Icon name="Pencil" size={14} /></Button>
                <Button variant="ghost" size="icon" title="Удалить" onClick={() => {
                  if (confirm(`Удалить операцию ${op.op_no} «${op.name}» вместе с переходами?`))
                    run(() => opDelete(op.id), "Операция удалена").catch(() => {});
                }}><Icon name="Trash2" size={14} /></Button>
              </div>
            </div>

            {open.has(op.id) && (
              <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  {op.fixture && <span>Приспособление: {op.fixture}</span>}
                  {op.profession && <span>Профессия: {op.profession}{op.worker_rank ? `, ${op.worker_rank} разряд` : ""}</span>}
                  <span>Тв {fmtNum(op.t_aux)} · К {fmtNum(op.k_service_pct)}% · Тпз {fmtNum(op.t_pz)} мин</span>
                  {op.steps.length === 0 && op.cam_est && <span className="text-purple-700">То взято из программы ЧПУ</span>}
                </div>
                {op.steps.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="text-left">
                          <th className="py-1 pr-2 w-6">№</th><th className="py-1 pr-2">Содержание перехода</th>
                          <th className="py-1 pr-2">Инструмент</th>
                          <th className="py-1 pr-2 text-right">D</th><th className="py-1 pr-2 text-right">L</th>
                          <th className="py-1 pr-2 text-right">t</th><th className="py-1 pr-2 text-right">i</th>
                          <th className="py-1 pr-2 text-right">S</th><th className="py-1 pr-2 text-right">n</th>
                          <th className="py-1 pr-2 text-right">V</th><th className="py-1 pr-2 text-right">То</th><th className="w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {op.steps.map((st) => (
                          <tr key={st.id} className="border-t border-border/60" data-testid="tech-step">
                            <td className="py-1.5 pr-2">{st.step_no}</td>
                            <td className="py-1.5 pr-2">{st.description}</td>
                            <td className="py-1.5 pr-2 text-muted-foreground">{st.tool}</td>
                            <td className="py-1.5 pr-2 text-right">{fmtNum(st.diameter)}</td>
                            <td className="py-1.5 pr-2 text-right">{fmtNum(st.length)}</td>
                            <td className="py-1.5 pr-2 text-right">{fmtNum(st.depth)}</td>
                            <td className="py-1.5 pr-2 text-right">{st.passes}</td>
                            <td className="py-1.5 pr-2 text-right">{fmtNum(st.feed, 3)}</td>
                            <td className="py-1.5 pr-2 text-right">{fmtNum(st.spindle, 0)}</td>
                            <td className="py-1.5 pr-2 text-right">{fmtNum(st.speed, 0)}</td>
                            <td className="py-1.5 pr-2 text-right font-medium">{fmtNum(st.t_main, 3)}{st.manual_time ? "*" : ""}</td>
                            <td className="py-1 text-right whitespace-nowrap">
                              <button className="p-1 text-muted-foreground hover:text-foreground" title="Изменить"
                                onClick={() => setEditStep({ opId: op.id, step: st })}><Icon name="Pencil" size={12} /></button>
                              <button className="p-1 text-muted-foreground hover:text-destructive" title="Удалить"
                                onClick={() => { if (confirm("Удалить переход?")) run(() => stepDelete(st.id)).catch(() => {}); }}>
                                <Icon name="Trash2" size={12} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[11px] text-muted-foreground mt-1">D, L, t — мм; S — мм/об; n — об/мин; V — м/мин; То — мин; * — задано вручную</p>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditStep({ opId: op.id, step: null })}>
                  <Icon name="Plus" size={13} className="mr-1" />Переход
                </Button>
              </div>
            )}
          </div>
        ))}
      </section>

      {editOp && (
        <TechOperationForm op={editOp} partId={tp.part_id} onClose={() => setEditOp(null)}
          onSave={(data) => run(
            () => (editOp.id ? opUpdate(editOp.id, data) : opCreate({ ...data, process_id: tp.id })),
            editOp.id ? "Операция обновлена" : "Операция добавлена",
          )} />
      )}
      {editStep && (
        <TechStepForm step={editStep.step} onClose={() => setEditStep(null)}
          onSave={(data) => run(
            () => (editStep.step?.id ? stepUpdate(editStep.step.id, data) : stepCreate({ ...data, operation_id: editStep.opId })),
            editStep.step?.id ? "Переход обновлён" : "Переход добавлен",
          )} />
      )}
    </div>
  );
}
