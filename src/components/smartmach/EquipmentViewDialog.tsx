import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { STATUS_CONFIG, type Machine } from "@/components/smartmach/equipment.types";

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

interface Props {
  machine: Machine | null;
  open: boolean;
  onClose: () => void;
  onEdit: (m: Machine) => void;
  onDelete: (m: Machine) => void;
}

export default function EquipmentViewDialog({ machine, open, onClose, onEdit, onDelete }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {machine && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl">{machine.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {machine.model} · {machine.manufacturer} · {machine.year} г.
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_CONFIG[machine.status].color}`}>
                  {STATUS_CONFIG[machine.status].label}
                </span>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6 mt-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Технические характеристики</p>
                <DetailRow label="Тип"                       value={machine.type} />
                <DetailRow label="Число осей"               value={`${machine.axes}`} />
                <DetailRow label="Система управления"        value={machine.controlSystem} />
                <DetailRow label="Скорость шпинделя"         value={machine.spindleSpeed} />
                <DetailRow label="Размер стола"              value={machine.tableSize} />
                <DetailRow label="Ход X"                     value={machine.travelX} />
                <DetailRow label="Ход Y"                     value={machine.travelY} />
                <DetailRow label="Ход Z"                     value={machine.travelZ} />
                <DetailRow label="Точность"                  value={machine.accuracy} />
                <DetailRow label="Мощность"                  value={machine.power} />
                <DetailRow label="Масса"                     value={machine.weight} />
                <DetailRow label="Охлаждение"                value={machine.coolant} />
                {machine.toolCapacity > 0 && (
                  <DetailRow label="Инструментальный магазин" value={`${machine.toolCapacity} позиций`} />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Эксплуатация</p>
                <DetailRow label="Инвентарный номер" value={machine.inventoryNumber} />
                <DetailRow label="Год выпуска"       value={`${machine.year}`} />
                <DetailRow label="Местонахождение"   value={machine.location} />
                <DetailRow label="Следующее ТО"      value={machine.nextMaintenance} />
                {machine.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">{machine.notes}</div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button variant="destructive" size="sm" onClick={() => onDelete(machine)}>
                <Icon name="Trash2" size={14} className="mr-1.5" />Удалить
              </Button>
              <Button size="sm" onClick={() => onEdit(machine)}>
                <Icon name="Pencil" size={14} className="mr-1.5" />Редактировать
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
