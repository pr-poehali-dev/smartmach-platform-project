import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet } from "@/lib/api";
import { mGet, type Program } from "@/lib/manufacture";
import { type TechOperation, toNum } from "@/lib/techcard";

interface Equipment { id: number; name: string; model: string; type: string }

export const OP_PRESETS = [
  "Заготовительная", "Отрезная", "Токарная", "Токарная с ЧПУ", "Фрезерная", "Фрезерная с ЧПУ",
  "Сверлильная", "Зубофрезерная", "Шлифовальная", "Круглошлифовальная", "Термическая",
  "Слесарная", "Моечная", "Контрольная",
];

interface Props {
  op: Partial<TechOperation> | null;
  partId: number | null;
  onClose: () => void;
  onSave: (data: Partial<TechOperation>) => Promise<void>;
}

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default function TechOperationForm({ op, partId, onClose, onSave }: Props) {
  const [f, setF] = useState(() => ({
    op_no: s(op?.op_no), name: s(op?.name), workshop: s(op?.workshop) || "01", area: s(op?.area),
    equipment_id: s(op?.equipment_id), cam_program_id: s(op?.cam_program_id),
    fixture: s(op?.fixture), profession: s(op?.profession), worker_rank: s(op?.worker_rank),
    t_aux: s(op?.t_aux ?? 0), k_service_pct: s(op?.k_service_pct ?? 8), t_pz: s(op?.t_pz ?? 0),
    notes: s(op?.notes),
  }));
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    apiGet<Equipment[]>("equipment").then(setEquipment).catch(() => {});
    mGet<Program[]>("programs").then(setPrograms).catch(() => {});
  }, []);

  const progs = [...programs].sort((a, b) =>
    Number(b.part_id === partId) - Number(a.part_id === partId));

  const submit = async () => {
    if (!f.name.trim()) { setError("Укажите наименование операции"); return; }
    setSaving(true); setError(null);
    const eq = equipment.find((e) => String(e.id) === f.equipment_id);
    try {
      await onSave({
        op_no: f.op_no || undefined, name: f.name.trim(), workshop: f.workshop || null, area: f.area || null,
        equipment_id: eq ? eq.id : null,
        equipment_name: eq ? `${eq.model} ${eq.name}` : null,
        cam_program_id: f.cam_program_id ? Number(f.cam_program_id) : null,
        fixture: f.fixture || null, profession: f.profession || null,
        worker_rank: toNum(f.worker_rank), t_aux: toNum(f.t_aux) ?? 0,
        k_service_pct: toNum(f.k_service_pct) ?? 8, t_pz: toNum(f.t_pz) ?? 0, notes: f.notes || null,
      });
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  const sel = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{op?.id ? `Операция ${op.op_no}` : "Новая операция"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[90px_1fr] gap-3">
            <div>
              <Label>№</Label>
              <Input value={f.op_no} onChange={(e) => set("op_no", e.target.value)} placeholder="авто" />
            </div>
            <div>
              <Label>Наименование операции</Label>
              <Input list="op-presets" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Токарная с ЧПУ" />
              <datalist id="op-presets">{OP_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Цех</Label><Input value={f.workshop} onChange={(e) => set("workshop", e.target.value)} /></div>
            <div><Label>Участок</Label><Input value={f.area} onChange={(e) => set("area", e.target.value)} /></div>
            <div><Label>Разряд</Label><Input inputMode="numeric" value={f.worker_rank} onChange={(e) => set("worker_rank", e.target.value)} /></div>
          </div>
          <div>
            <Label>Оборудование</Label>
            <select className={sel} value={f.equipment_id} onChange={(e) => set("equipment_id", e.target.value)}>
              <option value="">— не выбрано —</option>
              {equipment.map((e) => <option key={e.id} value={e.id}>{e.model} — {e.name}</option>)}
            </select>
            {equipment.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Справочник оборудования пуст — добавьте станки в разделе «Справочник обор.»</p>
            )}
          </div>
          <div>
            <Label>Управляющая программа ЧПУ</Label>
            <select className={sel} value={f.cam_program_id} onChange={(e) => set("cam_program_id", e.target.value)}>
              <option value="">— без программы —</option>
              {progs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} · ` : ""}{p.name}{p.est_time ? ` (${p.est_time})` : ""}{p.part_id === partId && partId ? " ★" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Если у операции нет переходов, основное время берётся из длительности программы. ★ — программы этой детали.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Приспособление</Label><Input value={f.fixture} onChange={(e) => set("fixture", e.target.value)} placeholder="Патрон 3-кулачковый" /></div>
            <div><Label>Профессия</Label><Input value={f.profession} onChange={(e) => set("profession", e.target.value)} placeholder="Оператор станков с ПУ" /></div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-medium mb-2">Нормирование</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Тв, мин</Label><Input inputMode="decimal" value={f.t_aux} onChange={(e) => set("t_aux", e.target.value)} /></div>
              <div><Label>К обсл. и отдыха, %</Label><Input inputMode="decimal" value={f.k_service_pct} onChange={(e) => set("k_service_pct", e.target.value)} /></div>
              <div><Label>Тпз, мин</Label><Input inputMode="decimal" value={f.t_pz} onChange={(e) => set("t_pz", e.target.value)} /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Тшт = (То + Тв) · (1 + К/100), Тшк = Тшт + Тпз / партия. То суммируется по переходам.</p>
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
