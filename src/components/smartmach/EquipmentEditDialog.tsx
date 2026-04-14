import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_CONFIG, MACHINE_TYPES, type Machine } from "@/components/smartmach/equipment.types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface EditProps {
  open: boolean;
  isNew: boolean;
  formData: Omit<Machine, "id">;
  onClose: () => void;
  onSave: () => void;
  setField: <K extends keyof Omit<Machine, "id">>(key: K, value: Omit<Machine, "id">[K]) => void;
}

export function EquipmentEditDialog({ open, isNew, formData, onClose, onSave, setField }: EditProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Новый станок" : "Редактировать станок"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Основное */}
          <Section title="Основное">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Наименование *">
                <Input value={formData.name} onChange={(e) => setField("name", e.target.value)} placeholder="Фрезерный ОЦ №3" />
              </Field>
              <Field label="Модель *">
                <Input value={formData.model} onChange={(e) => setField("model", e.target.value)} placeholder="DMG MORI DMU 50" />
              </Field>
              <Field label="Тип">
                <Select value={formData.type} onValueChange={(v) => setField("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MACHINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Производитель">
                <Input value={formData.manufacturer} onChange={(e) => setField("manufacturer", e.target.value)} placeholder="DMG MORI" />
              </Field>
              <Field label="Год выпуска">
                <Input type="number" value={formData.year} onChange={(e) => setField("year", Number(e.target.value))} />
              </Field>
              <Field label="Статус">
                <Select value={formData.status} onValueChange={(v) => setField("status", v as Machine["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* Технические характеристики */}
          <Section title="Технические характеристики">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Число осей">
                <Input type="number" value={formData.axes} onChange={(e) => setField("axes", Number(e.target.value))} />
              </Field>
              <Field label="Система управления">
                <Input value={formData.controlSystem} onChange={(e) => setField("controlSystem", e.target.value)} placeholder="Siemens 840D SL" />
              </Field>
              <Field label="Скорость шпинделя">
                <Input value={formData.spindleSpeed} onChange={(e) => setField("spindleSpeed", e.target.value)} placeholder="18 000 об/мин" />
              </Field>
              <Field label="Размер стола">
                <Input value={formData.tableSize} onChange={(e) => setField("tableSize", e.target.value)} placeholder="630 × 500 мм" />
              </Field>
              <Field label="Ход X">
                <Input value={formData.travelX} onChange={(e) => setField("travelX", e.target.value)} placeholder="500 мм" />
              </Field>
              <Field label="Ход Y">
                <Input value={formData.travelY} onChange={(e) => setField("travelY", e.target.value)} placeholder="450 мм" />
              </Field>
              <Field label="Ход Z">
                <Input value={formData.travelZ} onChange={(e) => setField("travelZ", e.target.value)} placeholder="400 мм" />
              </Field>
              <Field label="Точность позиционирования">
                <Input value={formData.accuracy} onChange={(e) => setField("accuracy", e.target.value)} placeholder="±0,003 мм" />
              </Field>
              <Field label="Мощность">
                <Input value={formData.power} onChange={(e) => setField("power", e.target.value)} placeholder="18 кВт" />
              </Field>
              <Field label="Масса станка">
                <Input value={formData.weight} onChange={(e) => setField("weight", e.target.value)} placeholder="7 500 кг" />
              </Field>
              <Field label="Охлаждение">
                <Input value={formData.coolant} onChange={(e) => setField("coolant", e.target.value)} placeholder="СОЖ + воздух" />
              </Field>
              <Field label="Инструментальный магазин (позиций)">
                <Input type="number" value={formData.toolCapacity} onChange={(e) => setField("toolCapacity", Number(e.target.value))} />
              </Field>
            </div>
          </Section>

          {/* Эксплуатация */}
          <Section title="Эксплуатация">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Инвентарный номер">
                <Input value={formData.inventoryNumber} onChange={(e) => setField("inventoryNumber", e.target.value)} placeholder="ИНВ-00124" />
              </Field>
              <Field label="Местонахождение">
                <Input value={formData.location} onChange={(e) => setField("location", e.target.value)} placeholder="Цех №1, позиция A1" />
              </Field>
              <Field label="Дата следующего ТО">
                <Input type="date" value={formData.nextMaintenance} onChange={(e) => setField("nextMaintenance", e.target.value)} />
              </Field>
            </div>
            <Field label="Примечания">
              <Textarea value={formData.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} placeholder="Дополнительная информация..." />
            </Field>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={onSave} disabled={!formData.name.trim() || !formData.model.trim()}>
            {isNew ? "Добавить" : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteProps {
  machine: Machine | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function EquipmentDeleteDialog({ machine, onClose, onConfirm }: DeleteProps) {
  return (
    <Dialog open={!!machine} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Удалить станок?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Станок <span className="font-medium text-foreground">«{machine?.name}»</span> будет удалён из справочника.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button variant="destructive" onClick={onConfirm}>Удалить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
