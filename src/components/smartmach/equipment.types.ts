export interface Machine {
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

export const INITIAL_MACHINES: Machine[] = [
  {
    id: 1, name: "Фрезерный ОЦ №1", model: "DMG MORI DMU 50", type: "Фрезерный ОЦ",
    manufacturer: "DMG MORI", year: 2019, axes: 5, controlSystem: "Siemens 840D SL",
    spindleSpeed: "18 000 об/мин", tableSize: "630 × 500 мм", travelX: "500 мм", travelY: "450 мм", travelZ: "400 мм",
    accuracy: "±0,003 мм", power: "18 кВт", weight: "7 500 кг", coolant: "СОЖ + воздух", toolCapacity: 30,
    status: "active", location: "Цех №1, позиция A1", inventoryNumber: "ИНВ-00124",
    nextMaintenance: "2026-06-15", notes: "Плановое ТО выполнено 01.03.2026",
  },
  {
    id: 2, name: "Токарный с ЧПУ №1", model: "HAAS ST-30", type: "Токарный с ЧПУ",
    manufacturer: "HAAS Automation", year: 2020, axes: 2, controlSystem: "HAAS Control",
    spindleSpeed: "3 400 об/мин", tableSize: "—", travelX: "—", travelY: "—", travelZ: "610 мм",
    accuracy: "±0,005 мм", power: "22 кВт", weight: "5 200 кг", coolant: "СОЖ", toolCapacity: 12,
    status: "active", location: "Цех №1, позиция B3", inventoryNumber: "ИНВ-00137",
    nextMaintenance: "2026-05-20", notes: "",
  },
  {
    id: 3, name: "Токарный с ЧПУ №2", model: "Mazak QT-NEXUS 200", type: "Токарный с ЧПУ",
    manufacturer: "Yamazaki Mazak", year: 2018, axes: 2, controlSystem: "Mazatrol SmoothG",
    spindleSpeed: "4 000 об/мин", tableSize: "—", travelX: "—", travelY: "—", travelZ: "530 мм",
    accuracy: "±0,004 мм", power: "18,5 кВт", weight: "4 800 кг", coolant: "СОЖ", toolCapacity: 10,
    status: "maintenance", location: "Цех №1, позиция B5", inventoryNumber: "ИНВ-00138",
    nextMaintenance: "2026-04-18", notes: "Замена шпиндельного подшипника — плановый ремонт",
  },
  {
    id: 4, name: "Фрезерный ОЦ №2", model: "Fanuc Robodrill α-D21MiA5", type: "Фрезерный ОЦ",
    manufacturer: "Fanuc", year: 2021, axes: 5, controlSystem: "Fanuc 31i-B5",
    spindleSpeed: "24 000 об/мин", tableSize: "400 × 400 мм", travelX: "700 мм", travelY: "400 мм", travelZ: "330 мм",
    accuracy: "±0,002 мм", power: "15 кВт", weight: "3 100 кг", coolant: "Внутренний + воздух", toolCapacity: 21,
    status: "active", location: "Цех №2, позиция A2", inventoryNumber: "ИНВ-00152",
    nextMaintenance: "2026-07-01", notes: "",
  },
  {
    id: 5, name: "Шлифовальный №1", model: "Studer S33", type: "Круглошлифовальный",
    manufacturer: "Fritz Studer AG", year: 2017, axes: 3, controlSystem: "StuderWIN",
    spindleSpeed: "3 600 об/мин", tableSize: "—", travelX: "—", travelY: "—", travelZ: "1 000 мм",
    accuracy: "±0,001 мм", power: "7,5 кВт", weight: "3 900 кг", coolant: "СОЖ", toolCapacity: 0,
    status: "idle", location: "Цех №2, позиция C1", inventoryNumber: "ИНВ-00098",
    nextMaintenance: "2026-08-10", notes: "Ожидает заказ на обработку",
  },
  {
    id: 6, name: "Электроэрозионный №1", model: "Mitsubishi MV2400S", type: "Электроэрозионный (проволочный)",
    manufacturer: "Mitsubishi Electric", year: 2016, axes: 4, controlSystem: "Mitsubishi M800",
    spindleSpeed: "—", tableSize: "820 × 620 мм", travelX: "600 мм", travelY: "400 мм", travelZ: "220 мм",
    accuracy: "±0,002 мм", power: "5 кВт", weight: "2 100 кг", coolant: "Деионизированная вода", toolCapacity: 0,
    status: "decommissioned", location: "Склад", inventoryNumber: "ИНВ-00071",
    nextMaintenance: "—", notes: "Выведен из эксплуатации — ожидает списания",
  },
];

export const EMPTY_MACHINE: Omit<Machine, "id"> = {
  name: "", model: "", type: "Фрезерный ОЦ", manufacturer: "", year: new Date().getFullYear(),
  axes: 3, controlSystem: "", spindleSpeed: "", tableSize: "", travelX: "", travelY: "", travelZ: "",
  accuracy: "", power: "", weight: "", coolant: "", toolCapacity: 0,
  status: "active", location: "", inventoryNumber: "", nextMaintenance: "", notes: "",
};

export const STATUS_CONFIG = {
  active:         { label: "Работает", color: "bg-green-100 text-green-800" },
  maintenance:    { label: "Ремонт",   color: "bg-yellow-100 text-yellow-800" },
  idle:           { label: "Простой",  color: "bg-blue-100 text-blue-800" },
  decommissioned: { label: "Списан",   color: "bg-gray-100 text-gray-500" },
};

export const MACHINE_TYPES = [
  "Фрезерный ОЦ", "Токарный с ЧПУ", "Круглошлифовальный",
  "Электроэрозионный (проволочный)", "Сверлильный", "Расточной", "Зубофрезерный", "Другое",
];

export const FILTER_TYPES = ["Все", ...MACHINE_TYPES];
