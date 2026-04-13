import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const MACHINES: Machine[] = [
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

const STATUS_CONFIG = {
  active:         { label: "Работает",    color: "bg-green-100 text-green-800" },
  maintenance:    { label: "Ремонт",      color: "bg-yellow-100 text-yellow-800" },
  idle:           { label: "Простой",     color: "bg-blue-100 text-blue-800" },
  decommissioned: { label: "Списан",      color: "bg-gray-100 text-gray-500" },
};

const TYPES = ["Все", "Фрезерный ОЦ", "Токарный с ЧПУ", "Круглошлифовальный", "Электроэрозионный (проволочный)"];

export default function ModuleEquipment() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [selected, setSelected] = useState<Machine | null>(null);

  const filtered = MACHINES.filter((m) => {
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
    active:      MACHINES.filter((m) => m.status === "active").length,
    maintenance: MACHINES.filter((m) => m.status === "maintenance").length,
    idle:        MACHINES.filter((m) => m.status === "idle").length,
    decommissioned: MACHINES.filter((m) => m.status === "decommissioned").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Справочник оборудования</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Станки и технологическое оборудование предприятия</p>
        </div>
        <Button variant="outline" size="sm">
          <Icon name="Download" size={15} className="mr-2" />
          Экспорт
        </Button>
      </div>

      {/* KPI cards */}
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
          {TYPES.map((t) => (
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
                <TableRow
                  key={m.id}
                  className="cursor-pointer hover:bg-secondary/30"
                  onClick={() => setSelected(m)}
                >
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">{selected.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{selected.model} · {selected.manufacturer} · {selected.year} г.</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selected.status].color}`}>
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-6 mt-2">
                {/* Column 1: Technical specs */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Технические характеристики</p>
                  <DetailRow label="Тип" value={selected.type} />
                  <DetailRow label="Число осей" value={`${selected.axes}`} />
                  <DetailRow label="Система управления" value={selected.controlSystem} />
                  <DetailRow label="Скорость шпинделя" value={selected.spindleSpeed} />
                  <DetailRow label="Размер стола" value={selected.tableSize} />
                  <DetailRow label="Ход X" value={selected.travelX} />
                  <DetailRow label="Ход Y" value={selected.travelY} />
                  <DetailRow label="Ход Z" value={selected.travelZ} />
                  <DetailRow label="Точность позиционирования" value={selected.accuracy} />
                  <DetailRow label="Мощность" value={selected.power} />
                  <DetailRow label="Масса станка" value={selected.weight} />
                  <DetailRow label="Охлаждение" value={selected.coolant} />
                  {selected.toolCapacity > 0 && (
                    <DetailRow label="Ёмкость инструментального магазина" value={`${selected.toolCapacity} позиций`} />
                  )}
                </div>

                {/* Column 2: Admin info */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Сведения об эксплуатации</p>
                  <DetailRow label="Инвентарный номер" value={selected.inventoryNumber} />
                  <DetailRow label="Год выпуска" value={`${selected.year}`} />
                  <DetailRow label="Местонахождение" value={selected.location} />
                  <DetailRow label="Следующее ТО" value={selected.nextMaintenance} />
                  {selected.notes && (
                    <div className="mt-3 p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
                      {selected.notes}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
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
