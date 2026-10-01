import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type TechStep, spindleFromSpeed, mainTime, toNum, fmtNum } from "@/lib/techcard";

type Form = Record<string, string>;

const FIELDS: [keyof TechStep, string, string][] = [
  ["diameter", "D, мм", "Диаметр обработки"],
  ["length", "L, мм", "Длина обработки"],
  ["overrun", "l вр, мм", "Врезание + перебег"],
  ["depth", "t, мм", "Глубина резания"],
  ["passes", "i", "Число проходов"],
  ["feed", "S, мм/об", "Подача"],
  ["speed", "V, м/мин", "Скорость резания"],
  ["spindle", "n, об/мин", "Пусто — посчитается из V и D"],
];

interface Props {
  step: Partial<TechStep> | null;
  onClose: () => void;
  onSave: (data: Partial<TechStep>) => Promise<void>;
}

export default function TechStepForm({ step, onClose, onSave }: Props) {
  const init = (s: Partial<TechStep> | null): Form => {
    const f: Form = {};
    for (const k of ["description", "tool", "measuring_tool", "t_main", ...FIELDS.map((x) => x[0])]) {
      const v = s?.[k as keyof TechStep];
      f[k] = v === null || v === undefined ? "" : String(v);
    }
    if (!f.passes) f.passes = "1";
    f.manual = s?.manual_time ? "1" : "";
    return f;
  };
  const [f, setF] = useState<Form>(() => init(step));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const n = toNum(f.spindle) ?? spindleFromSpeed(f.speed, f.diameter);
  const autoT = mainTime(f.length, f.overrun, f.passes, n, f.feed);

  const submit = async () => {
    if (!f.description.trim()) { setError("Опишите содержание перехода"); return; }
    setSaving(true); setError(null);
    const data: Record<string, unknown> = {
      description: f.description.trim(),
      tool: f.tool || null,
      measuring_tool: f.measuring_tool || null,
    };
    for (const [k] of FIELDS) data[k] = f[k] === "" ? null : toNum(f[k]);
    data.passes = toNum(f.passes) || 1;
    data.overrun = toNum(f.overrun) || 0;
    data.manual_time = !!f.manual;
    if (f.manual) data.t_main = toNum(f.t_main) || 0;
    try { await onSave(data as Partial<TechStep>); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{step?.id ? `Переход ${step.step_no}` : "Новый переход"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Содержание перехода</Label>
            <Input value={f.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Точить поверхность ∅45k6 на длину 60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Режущий инструмент</Label>
              <Input value={f.tool} onChange={(e) => set("tool", e.target.value)} placeholder="Резец PCLNR 2525M12" />
            </div>
            <div>
              <Label>Мерительный инструмент</Label>
              <Input value={f.measuring_tool} onChange={(e) => set("measuring_tool", e.target.value)} placeholder="Скоба 45k6" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {FIELDS.map(([k, label, hint]) => (
              <div key={k}>
                <Label title={hint}>{label}</Label>
                <Input inputMode="decimal" value={f[k]} onChange={(e) => set(k, e.target.value)}
                  placeholder={k === "spindle" && n ? fmtNum(n, 0) : ""} />
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>n = <b>{n ? `${fmtNum(n, 0)} об/мин` : "—"}</b></span>
              <span>Основное время То = <b>{autoT !== null ? `${fmtNum(autoT, 3)} мин` : "—"}</b></span>
            </div>
            <p className="text-xs text-muted-foreground">
              То = (L + l вр) · i / (n · S). Для неметаллорежущих переходов (термообработка, контроль) задайте время вручную.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!f.manual} onChange={(e) => set("manual", e.target.checked ? "1" : "")} />
              Задать основное время вручную
            </label>
            {f.manual && (
              <div className="w-40">
                <Label>То, мин</Label>
                <Input inputMode="decimal" value={f.t_main} onChange={(e) => set("t_main", e.target.value)} />
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Сохраняю…" : "Сохранить"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
