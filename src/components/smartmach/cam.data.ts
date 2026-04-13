export interface CamSystem {
  name: string;
  vendor: string;
  category: "professional" | "universal" | "free";
  origin: string;
  axes: string;
  integrations: string[];
  price: string;
  bestFor: string;
  features: string[];
  link: string;
}

export const CAM_SYSTEMS: CamSystem[] = [
  {
    name: "Mastercam",
    vendor: "CNC Software",
    category: "professional",
    origin: "США",
    axes: "2D — 5-осевая",
    integrations: ["SOLIDWORKS", "NX", "CATIA"],
    price: "от $7 000/год",
    bestFor: "Крупные предприятия, сложная 5-осевая обработка",
    features: ["Многоосевая обработка (2D–5D)", "Динамическое движение инструмента", "Высокоскоростная обработка", "Лазерная и плазменная резка", "Электроэрозионная обработка"],
    link: "https://www.mastercam.com",
  },
  {
    name: "SolidCAM",
    vendor: "SolidCAM Ltd",
    category: "professional",
    origin: "Израиль",
    axes: "2D — 5-осевая",
    integrations: ["SOLIDWORKS (встроен)", "Inventor"],
    price: "от $5 000/год",
    bestFor: "Предприятия на базе SOLIDWORKS",
    features: ["Встроен в SOLIDWORKS", "Ассоциативная связь модель → УП", "Токарно-фрезерные центры", "iMachining — оптимизация режимов резания", "5-осевое фрезерование"],
    link: "https://www.solidcam.com",
  },
  {
    name: "SprutCAM",
    vendor: "SPRUT Technology",
    category: "professional",
    origin: "Россия",
    axes: "3D — 6-осевая",
    integrations: ["SOLIDWORKS", "Компас-3D", "NX"],
    price: "от 150 000 ₽/год",
    bestFor: "Российские предприятия, роботизированные ячейки",
    features: ["Российская разработка (импортозамещение)", "3–5-осевое фрезерование", "Программирование роботов (6 осей)", "EDM, лазер, плазма", "Swiss-станки"],
    link: "https://www.sprutcam.com",
  },
  {
    name: "PowerMILL",
    vendor: "Autodesk",
    category: "professional",
    origin: "Великобритания",
    axes: "3D — 5-осевая",
    integrations: ["Fusion 360", "Inventor", "SolidWorks"],
    price: "от $10 000/год",
    bestFor: "Высокоскоростная обработка сложных поверхностей",
    features: ["Плавные траектории без заострённых углов", "3- и 5-осевое фрезерование", "Поддержка поворотной оси", "Минимизация нагрузки на шпиндель", "Интеграция с PowerShape"],
    link: "https://www.autodesk.com/products/powermill",
  },
  {
    name: "Siemens NX CAM",
    vendor: "Siemens",
    category: "professional",
    origin: "Германия / США",
    axes: "2D — 5-осевая",
    integrations: ["NX CAD", "NX CAE", "Teamcenter"],
    price: "по запросу (от $15 000)",
    bestFor: "Крупные предприятия, единая PLM-среда",
    features: ["Полная интеграция CAD/CAM/CAE", "Многоосевая обработка", "Постпроцессоры для любых контроллеров", "Синхронное моделирование", "Управление данными через Teamcenter"],
    link: "https://www.plm.automation.siemens.com/nx",
  },
  {
    name: "Fusion 360",
    vendor: "Autodesk",
    category: "universal",
    origin: "США",
    axes: "2D — 5-осевая",
    integrations: ["Облако Autodesk", "Inventor", "AutoCAD"],
    price: "от $545/год (есть бесплатный план)",
    bestFor: "Малый бизнес, стартапы, образование",
    features: ["Облачный CAD/CAM/CAE в одном окне", "Поддержка 2D–5-осевой обработки", "Симуляция столкновений", "Совместная работа в облаке", "Бесплатный план для хобби и стартапов"],
    link: "https://www.autodesk.com/fusion",
  },
  {
    name: "FreeCAD + Path",
    vendor: "Сообщество (open source)",
    category: "free",
    origin: "Открытый исходный код",
    axes: "2D — 2.5D",
    integrations: ["Независимый", "Экспорт DXF/STEP/STL"],
    price: "Бесплатно",
    bestFor: "Обучение, DIY-проекты, некоммерческое использование",
    features: ["Полностью бесплатный", "Параметрическое 3D-моделирование", "Path Workbench — генерация G-кода", "Расширяется через Python-макросы", "Экспорт в форматы DXF, STEP, STL"],
    link: "https://www.freecad.org",
  },
  {
    name: "CAMotics",
    vendor: "Camotics.org (open source)",
    category: "free",
    origin: "США",
    axes: "2D — 4-осевая",
    integrations: ["Любые CAM-системы (читает G-код)"],
    price: "Бесплатно",
    bestFor: "Симуляция и проверка G-кода",
    features: ["Симуляция траекторий инструмента", "Расчёт времени выполнения", "Редактирование G-кода (ASCII)", "2D/3D-визуализация обработки", "Открытый исходный код"],
    link: "https://camotics.org",
  },
];

export const CAT_CONFIG = {
  professional: { label: "Профессиональные", color: "bg-purple-100 text-purple-800" },
  universal:    { label: "Универсальные",    color: "bg-blue-100 text-blue-800" },
  free:         { label: "Бесплатные / Open Source", color: "bg-green-100 text-green-800" },
};

export const STATUS_CFG: Record<string, { label: string; color: string }> = {
  queue:   { label: "Очередь",  color: "text-gray-500   bg-gray-50   border-gray-200" },
  running: { label: "В работе", color: "text-blue-600   bg-blue-50   border-blue-200" },
  done:    { label: "Готово",   color: "text-green-600  bg-green-50  border-green-200" },
  error:   { label: "Ошибка",   color: "text-red-600    bg-red-50    border-red-200" },
};

export const NEXT: Record<string, string> = { queue: "running", running: "done" };
export const NEXT_LABEL: Record<string, string> = { queue: "Запустить", running: "Завершить" };

export const EMPTY_FORM = { name: "", code: "", est_time: "", status: "queue", part_id: "", machine_id: "", author_id: "" };

export const AI_SYSTEM = `Ты — технолог-программист ЧПУ в системе СмартМаш. 
Помогаешь с написанием управляющих программ (G-код), выбором режимов резания (подача, скорость, глубина), 
стратегиями обработки (черновая, чистовая, многоосевая), выбором инструмента, оптимизацией программ ЧПУ. 
Отвечай с конкретными режимами и рекомендациями по материалам.`;

export const AI_SUGGESTIONS = [
  "Какие режимы резания для фрезеровки Стали 45?",
  "Как написать цикл сверления в управляющей программе?",
  "Как работает коррекция на радиус инструмента?",
  "Как рассчитать скорость подачи для токарной операции?",
  "Какую стратегию обработки выбрать для кармана?",
];
