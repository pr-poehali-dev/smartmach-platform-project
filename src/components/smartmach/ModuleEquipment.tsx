import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";

interface Machine {
  id: number;
  name: string;
  model: string;
  type: string;
  manufacturer: string;
  year: number;
  axes: number;
  controlSystem: string;
  spindleSpeed: string;
  tableSize: string;
  travelX: string;
  travelY: string;
  travelZ: string;
  accuracy: string;
  power: string;
  weight: string;
  coolant: string;
  toolCapacity: number;
  status: "active" | "maintenance" | "idle" | "decommissioned";
  location: string;
  inventoryNumber: string;
  nextMaintenance: string;
  notes: string;
}

const API_URL = "https://functions.poehali.dev/ea23c122-5390-4ba0-8db8-032ba069c01b";

const INITIAL_MACHINES: Machine[] = [
  {
    id: 1,
    name: "Фрезерный ОЦ №1",
    model: "DMG MORI DMU 50",
    type: "Фрезерный ОЦ",
    manufacturer: "DMG MORI",
    year: 2019,
    axes: 5,
    controlSystem: "Siemens 840D SL",
    spindleSpeed: "18 000 об/мин",
    tableSize: "630 × 500 мм",
    travelX: "500 мм",
    travelY: "450 мм",
    travelZ: "400 мм",
    accuracy: "±0,003 мм",
    power: "18 кВт",
    weight: "7 500 кг",
    coolant: "СОЖ + воздух",
    toolCapacity: 30,
    status: "active",
    location: "Цех №1, позиция A1",
    inventoryNumber: "ИНВ-00124",
    nextMaintenance: "2026-06-15",
    notes: "Плановое ТО выполнено 01.03.2026",
  },
  {
    id: 2,
    name: "Токарный с ЧПУ №1",
    model: "HAAS ST-30",
    type: "Токарный с ЧПУ",
    manufacturer: "HAAS Automation",
    year: 2020,
    axes: 2,
    controlSystem: "HAAS Control",
    spindleSpeed: "3 400 об/мин",
    tableSize: "—",
    travelX: "—",
    travelY: "—",
    travelZ: "610 мм",
    accuracy: "±0,005 мм",
    power: "22 кВт",
    weight: "5 200 кг",
    coolant: "СОЖ",
    toolCapacity: 12,
    status: "active",
    location: "Цех №1, позиция B3",
    inventoryNumber: "ИНВ-00137",
    nextMaintenance: "2026-05-20",
    notes: "",
  },
  {
    id: 3,
    name: "Токарный с ЧПУ №2",
    model: "Mazak QT-NEXUS 200",
    type: "Токарный с ЧПУ",
    manufacturer: "Yamazaki Mazak",
    year: 2018,
    axes: 2,
    controlSystem: "Mazatrol SmoothG",
    spindleSpeed: "4 000 об/мин",
    tableSize: "—",
    travelX: "—",
    travelY: "—",
    travelZ: "530 мм",
    accuracy: "±0,004 мм",
    power: "18,5 кВт",
    weight: "4 800 кг",
    coolant: "СОЖ",
    toolCapacity: 10,
    status: "maintenance",
    location: "Цех №1, позиция B5",
    inventoryNumber: "ИНВ-00138",
    nextMaintenance: "2026-04-18",
    notes: "Замена шпиндельного подшипника — плановый ремонт",
  },
  {
    id: 4,
    name: "Фрезерный ОЦ №2",
    model: "Fanuc Robodrill α-D21MiA5",
    type: "Фрезерный ОЦ",
    manufacturer: "Fanuc",
    year: 2021,
    axes: 5,
    controlSystem: "Fanuc 31i-B5",
    spindleSpeed: "24 000 об/мин",
    tableSize: "400 × 400 мм",
    travelX: "700 мм",
    travelY: "400 мм",
    travelZ: "330 мм",
    accuracy: "±0,002 мм",
    power: "15 кВт",
    weight: "3 100 кг",
    coolant: "Внутренний + воздух",
    toolCapacity: 21,
    status: "active",
    location: "Цех №2, позиция A2",
    inventoryNumber: "ИНВ-00152",
    nextMaintenance: "2026-07-01",
    notes: "",
  },
  {
    id: 5,
    name: "Шлифовальный №1",
    model: "Studer S33",
    type: "Круглошлифовальный",
    manufacturer: "Fritz Studer AG",
    year: 2017,
    axes: 3,
    controlSystem: "StuderWIN",
    spindleSpeed: "3 600 об/мин",
    tableSize: "—",
    travelX: "—",
    travelY: "—",
    travelZ: "1 000 мм",
    accuracy: "±0,001 мм",
    power: "7,5 кВт",
    weight: "3 900 кг",
    coolant: "СОЖ",
    toolCapacity: 0,
    status: "idle",
    location: "Цех №2, позиция C1",
    inventoryNumber: "ИНВ-00098",
    nextMaintenance: "2026-08-10",
    notes: "Ожидает заказ на обработку",
  },
  {
    id: 6,
    name: "Электроэрозионный №1",
    model: "Mitsubishi MV2400S",
    type: "Электроэрозионный (проволочный)",
    manufacturer: "Mitsubishi Electric",
    year: 2016,
    axes: 4,
    controlSystem: "Mitsubishi M800",
    spindleSpeed: "—",
    tableSize: "820 × 620 мм",
    travelX: "600 мм",
    travelY: "400 мм",
    travelZ: "220 мм",
    accuracy: "±0,002 мм",
    power: "5 кВт",
    weight: "2 100 кг",
    coolant: "Деионизированная вода",
    toolCapacity: 0,
    status: "decommissioned",
    location: "Склад",
    inventoryNumber: "ИНВ-00071",
    nextMaintenance: "—",
    notes: "Выведен из эксплуатации — ожидает списания",
  },
];

const EMPTY_MACHINE: Omit<Machine, "id"> = {
  name: "", model: "", type: "Фрезерный ОЦ", manufacturer: "", year: new Date().getFullYear(),
  axes: 3, controlSystem: "", spindleSpeed: "", tableSize: "", travelX: "", travelY: "", travelZ: "",
  accuracy: "", power: "", weight: "", coolant: "", toolCapacity: 0,
  status: "active", location: "", inventoryNumber: "", nextMaintenance: "", notes: "",
};

const STATUS_CONFIG = {
  active:         { label: "Работает",  color: "bg-green-100 text-green-800" },
  maintenance:    { label: "Ремонт",    color: "bg-yellow-100 text-yellow-800" },
  idle:           { label: "Простой",   color: "bg-blue-100 text-blue-800" },
  decommissioned: { label: "Списан",    color: "bg-gray-100 text-gray-500" },
};

const MACHINE_TYPES = [
  "Фрезерный ОЦ", "Токарный с ЧПУ", "Круглошлифовальный",
  "Электроэрозионный (проволочный)", "Сверлильный", "Расточной", "Зубофрезерный", "Другое",
];

const FILTER_TYPES = ["Все", ...MACHINE_TYPES];

export default function ModuleEquipment() {
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState<Omit<Machine, "id">>(EMPTY_MACHINE);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null);

  useEffect(() => {
    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => { setMachines(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = machines.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.name.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      m.manufacturer.toLowerCase().includes(q) ||
      m.inventoryNumber.toLowerCase().includes(q);
    const matchType = typeFilter === "Все" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const counts = {
    active:         machines.filter((m) => m.status === "active").length,
    maintenance:    machines.filter((m) => m.status === "maintenance").length,
    idle:           machines.filter((m) => m.status === "idle").length,
    decommissioned: machines.filter((m) => m.status === "decommissioned").length,
  };

  function openCreate() {
    setFormData(EMPTY_MACHINE);
    setIsNew(true);
    setEditMachine({ id: 0, ...EMPTY_MACHINE });
  }

  function openEdit(m: Machine) {
    setFormData({ ...m });
    setIsNew(false);
    setEditMachine(m);
    setViewMachine(null);
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.model.trim()) return;
    if (isNew) {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const { id } = await res.json();
      setMachines((prev) => [...prev, { id, ...formData }]);
    } else if (editMachine) {
      await fetch(`${API_URL}/${editMachine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setMachines((prev) => prev.map((m) => m.id === editMachine.id ? { ...m, ...formData } : m));
    }
    setEditMachine(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`${API_URL}/${deleteTarget.id}`, { method: "DELETE" });
    setMachines((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
    setViewMachine(null);
  }

  function setField<K extends keyof Omit<Machine, "id">>(key: K, value: Omit<Machine, "id">[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Icon name="Loader2" size={22} className="animate-spin mr-2" />
      Загрузка оборудования...
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Справочник оборудования</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Станки и технологическое оборудование предприятия</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Icon name="Plus" size={15} className="mr-2" />
          Добавить станок
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["active", "maintenance", "idle", "decommissioned"] as const).map((s) => (
          <Card key={s} className="border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s === "active" ? "bg-green-500" : s === "maintenance" ? "bg-yellow-500" : s === "idle" ? "bg-blue-400" : "bg-gray-400"}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
                <p className="text-xs text-muted-foreground">{STATUS_CONFIG[s].label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, модели, инв. номеру..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                typeFilter === t
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="pl-4">Наименование</TableHead>
                <TableHead>Модель</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Производитель</TableHead>
                <TableHead className="text-center">Оси</TableHead>
                <TableHead>СУ</TableHead>
                <TableHead>Инв. №</TableHead>
                <TableHead>Местонахождение</TableHead>
                <TableHead className="text-center">Статус</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => setViewMachine(m)}>
                  <TableCell className="pl-4 font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.model}</TableCell>
                  <TableCell className="text-sm">{m.type}</TableCell>
                  <TableCell className="text-sm">{m.manufacturer}</TableCell>
                  <TableCell className="text-center text-sm">{m.axes}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.controlSystem}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{m.inventoryNumber}</TableCell>
                  <TableCell className="text-sm">{m.location}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[m.status].color}`}>
                      {STATUS_CONFIG[m.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    Станки не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── View dialog ── */}
      <Dialog open={!!viewMachine && !editMachine} onOpenChange={(o) => !o && setViewMachine(null)}>
        <DialogContent className="max-w-2xl">
          {viewMachine && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">{viewMachine.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {viewMachine.model} · {viewMachine.manufacturer} · {viewMachine.year} г.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_CONFIG[viewMachine.status].color}`}>
                    {STATUS_CONFIG[viewMachine.status].label}
                  </span>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6 mt-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Технические характеристики</p>
                  <DetailRow label="Тип" value={viewMachine.type} />
                  <DetailRow label="Число осей" value={`${viewMachine.axes}`} />
                  <DetailRow label="Система управления" value={viewMachine.controlSystem} />
                  <DetailRow label="Скорость шпинделя" value={viewMachine.spindleSpeed} />
                  <DetailRow label="Размер стола" value={viewMachine.tableSize} />
                  <DetailRow label="Ход X" value={viewMachine.travelX} />
                  <DetailRow label="Ход Y" value={viewMachine.travelY} />
                  <DetailRow label="Ход Z" value={viewMachine.travelZ} />
                  <DetailRow label="Точность" value={viewMachine.accuracy} />
                  <DetailRow label="Мощность" value={viewMachine.power} />
                  <DetailRow label="Масса" value={viewMachine.weight} />
                  <DetailRow label="Охлаждение" value={viewMachine.coolant} />
                  {viewMachine.toolCapacity > 0 && (
                    <DetailRow label="Инструментальный магазин" value={`${viewMachine.toolCapacity} позиций`} />
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Эксплуатация</p>
                  <DetailRow label="Инвентарный номер" value={viewMachine.inventoryNumber} />
                  <DetailRow label="Год выпуска" value={`${viewMachine.year}`} />
                  <DetailRow label="Местонахождение" value={viewMachine.location} />
                  <DetailRow label="Следующее ТО" value={viewMachine.nextMaintenance} />
                  {viewMachine.notes && (
                    <div className="mt-3 p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">{viewMachine.notes}</div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4 gap-2">
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(viewMachine)}>
                  <Icon name="Trash2" size={14} className="mr-1.5" />
                  Удалить
                </Button>
                <Button size="sm" onClick={() => openEdit(viewMachine)}>
                  <Icon name="Pencil" size={14} className="mr-1.5" />
                  Редактировать
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit / Create dialog ── */}
      <Dialog open={!!editMachine} onOpenChange={(o) => !o && setEditMachine(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Новый станок" : "Редактировать станок"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic */}
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

            {/* Technical */}
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

            {/* Admin */}
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
            <Button variant="outline" onClick={() => setEditMachine(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={!formData.name.trim() || !formData.model.trim()}>
              {isNew ? "Добавить" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить станок?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Станок <span className="font-medium text-foreground">«{deleteTarget?.name}»</span> будет удалён из справочника.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

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