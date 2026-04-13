export const STATUS_CFG: Record<string, { label: string; color: string }> = {
  queue:     { label: "Очередь",    color: "text-gray-500   bg-gray-50   border-gray-200" },
  running:   { label: "В работе",   color: "text-blue-600   bg-blue-50   border-blue-200" },
  done:      { label: "Готово",     color: "text-green-600  bg-green-50  border-green-200" },
  error:     { label: "Ошибка",     color: "text-red-600    bg-red-50    border-red-200" },
  review:    { label: "На проверке", color: "text-purple-600 bg-purple-50 border-purple-200" },
  cancelled: { label: "Отменена",   color: "text-gray-400   bg-gray-50   border-gray-200" },
};

export const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  high:   { label: "Высокий",   color: "text-red-600   bg-red-50   border-red-200" },
  normal: { label: "Обычный",   color: "text-blue-600  bg-blue-50  border-blue-200" },
  low:    { label: "Низкий",    color: "text-gray-500  bg-gray-50  border-gray-200" },
};

export const NEXT: Record<string, string> = {
  queue: "running",
  running: "review",
  review: "done",
};
export const NEXT_LABEL: Record<string, string> = {
  queue: "Запустить",
  running: "На проверку",
  review: "Принять",
};

export const OPERATION_TYPES = [
  "Фрезерование контура",
  "Фрезерование кармана",
  "Черновое фрезерование",
  "Чистовое фрезерование",
  "5-осевое фрезерование",
  "Токарная обработка",
  "Токарно-фрезерная обработка",
  "Сверление",
  "Резьбонарезание",
  "Расточка",
  "Шлифование",
  "Электроэрозионная обработка",
];

export const POSTPROCESSORS = [
  "Fanuc",
  "Siemens 840D",
  "Heidenhain TNC",
  "HAAS",
  "Mazatrol",
  "Mitsubishi M800",
  "StuderWIN",
  "OKUMA OSP",
];

export const MATERIALS = [
  "Сталь 45",
  "Сталь 20",
  "Сталь 40Х",
  "Сталь 12Х18Н10Т (нержавейка)",
  "Алюминий АМГ6",
  "Алюминий Д16Т",
  "Титан ВТ6",
  "Чугун СЧ20",
  "Бронза БрАЖ9-4",
  "Латунь Л63",
];

export const EMPTY_FORM = {
  name: "",
  code: "",
  est_time: "",
  status: "queue",
  priority: "normal",
  part_id: "",
  machine_id: "",
  author_id: "",
  operation_type: "",
  material: "",
  tool_name: "",
  tool_diameter: "",
  spindle_speed: "",
  feed_rate: "",
  depth_of_cut: "",
  postprocessor: "",
  notes: "",
};

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
  "Какой постпроцессор выбрать для Siemens 840D?",
  "Как оптимизировать траекторию при 5-осевой обработке?",
];
