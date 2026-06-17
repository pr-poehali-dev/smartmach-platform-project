// ─── Спецификация станка МАТ-1 по ГОСТ 2.106-2019 ────────────────
// Разделы спецификации: Документация, Сборочные единицы, Детали,
// Стандартные изделия, Материалы.

export interface SpecItem {
  zone?: string;     // зона
  pos?: number;      // поз. (для деталей/сб.ед./стандартных)
  designation: string; // обозначение
  name: string;        // наименование
  qty: number | string;// кол.
  note?: string;       // примечание
}

export interface SpecSection {
  title: string;       // заголовок раздела
  items: SpecItem[];
}

export const MACHINE_SPEC: SpecSection[] = [
  {
    title: "Документация",
    items: [
      { designation: "МАТ-1.000.000 СБ", name: "Сборочный чертёж", qty: "—" },
      { designation: "МАТ-1.000.000 ВО", name: "Чертёж общего вида", qty: "—" },
      { designation: "МАТ-1.000.000 ПЗ", name: "Пояснительная записка", qty: "—" },
      { designation: "МАТ-1.000.000 РЭ", name: "Руководство по эксплуатации", qty: "—" },
    ],
  },
  {
    title: "Сборочные единицы",
    items: [
      { pos: 1, designation: "МАТ-1.100.000", name: "Модуль токарный", qty: 1 },
      { pos: 2, designation: "МАТ-1.200.000", name: "Модуль фрезерный", qty: 1 },
      { pos: 3, designation: "МАТ-1.300.000", name: "Модуль лазерный", qty: 1, note: "опция" },
      { pos: 4, designation: "МАТ-1.400.000", name: "Система ЧПУ", qty: 1 },
      { pos: 5, designation: "МАТ-1.500.000", name: "Система СОЖ", qty: 1 },
    ],
  },
  {
    title: "Детали",
    items: [
      { pos: 10, designation: "МАТ-1.000.001", name: "Станина", qty: 1, note: "СЧ20" },
      { pos: 11, designation: "МАТ-1.000.002", name: "Направляющая профильная", qty: 4, note: "HIWIN HGR20" },
      { pos: 12, designation: "МАТ-1.000.003", name: "Кожух защитный", qty: 1 },
      { pos: 13, designation: "МАТ-1.000.004", name: "Опора антивибрационная", qty: 4 },
      { pos: 14, designation: "МАТ-1.000.005", name: "Каретка инструментальная", qty: 1 },
    ],
  },
  {
    title: "Стандартные изделия",
    items: [
      { pos: 20, designation: "—", name: "Двигатель асинхронный 2,2 кВт", qty: 1, note: "с ЧП Delta" },
      { pos: 21, designation: "—", name: "ШВП SFU1605 L=600", qty: 3, note: "X, Y, Z" },
      { pos: 22, designation: "—", name: "Патрон трёхкулачковый ∅160", qty: 1, note: "ГОСТ 2675" },
      { pos: 23, designation: "—", name: "Цанговый патрон ER25", qty: 1 },
      { pos: 24, designation: "—", name: "Контроллер ЧПУ (Raspberry Pi 4)", qty: 1 },
      { pos: 25, designation: "—", name: "Экран сенсорный 10\"", qty: 1 },
      { pos: 26, designation: "—", name: "Концевой выключатель", qty: 6, note: "по осям" },
      { pos: 27, designation: "—", name: "Кнопка аварийного останова", qty: 1, note: "грибовидная" },
    ],
  },
  {
    title: "Материалы",
    items: [
      { designation: "—", name: "Лист стальной Ст3 S=8 ГОСТ 19903", qty: "0,8 м²" },
      { designation: "—", name: "Профиль стальной 40×40 ГОСТ 8639", qty: "12 м" },
      { designation: "—", name: "СОЖ эмульсия Incool", qty: "5 л" },
    ],
  },
];

// ─── Журнал испытаний ────────────────────────────────────────────

export interface TestRecord {
  id: number;
  date: string;        // дата проведения
  category: string;    // категория испытания
  title: string;       // что испытывали
  method: string;      // методика / стандарт
  expected: string;    // ожидаемый результат
  actual: string;      // фактический результат
  status: "passed" | "failed" | "pending"; // статус
  engineer: string;    // исполнитель
}

export const MACHINE_TESTS_SEED: TestRecord[] = [
  {
    id: 1, date: "2026-02-14", category: "Геометрия",
    title: "Точность позиционирования оси X",
    method: "ГОСТ 8-82, лазерный интерферометр",
    expected: "±0,05 мм на 500 мм",
    actual: "±0,043 мм",
    status: "passed", engineer: "Соколов А.В.",
  },
  {
    id: 2, date: "2026-02-14", category: "Геометрия",
    title: "Повторяемость позиционирования",
    method: "ГОСТ 8-82, 10 циклов",
    expected: "±0,02 мм",
    actual: "±0,017 мм",
    status: "passed", engineer: "Соколов А.В.",
  },
  {
    id: 3, date: "2026-02-18", category: "Шпиндель",
    title: "Биение шпинделя токарного модуля",
    method: "Индикатор ИЧ-10, 2000 об/мин",
    expected: "не более 0,01 мм",
    actual: "0,008 мм",
    status: "passed", engineer: "Иванова М.С.",
  },
  {
    id: 4, date: "2026-02-20", category: "Нагрузка",
    title: "Нагрузочный тест фрезерной головки",
    method: "Фрезерование Ст45, t=3 мм, 90 мин",
    expected: "без перегрева, ≤65°C",
    actual: "62°C, стабильно",
    status: "passed", engineer: "Соколов А.В.",
  },
  {
    id: 5, date: "2026-02-25", category: "Безопасность",
    title: "Срабатывание аварийного останова",
    method: "ГОСТ Р МЭК 60204-1, время отклика",
    expected: "останов ≤ 0,5 с",
    actual: "0,3 с",
    status: "passed", engineer: "Петров К.Н.",
  },
  {
    id: 6, date: "2026-03-02", category: "Лазер",
    title: "Калибровка мощности лазерного модуля",
    method: "Измеритель мощности, 500 Вт",
    expected: "отклонение ≤ 3%",
    actual: "идёт настройка оптики",
    status: "pending", engineer: "Иванова М.С.",
  },
  {
    id: 7, date: "2026-03-05", category: "ЧПУ",
    title: "Прогон тестовой G-программы (контур)",
    method: "Эталонная деталь «звезда», DXF→G-code",
    expected: "соответствие контура ±0,05 мм",
    actual: "отклонение 0,11 мм на дугах",
    status: "failed", engineer: "Петров К.Н.",
  },
];

export const TEST_CATEGORIES = [
  "Геометрия", "Шпиндель", "Нагрузка", "Безопасность", "Лазер", "ЧПУ", "Прочее",
];
