/**
 * Данные схемы архитектуры для приложения к заявке на грант.
 *
 * Вынесены отдельно от разметки: цифры и формулировки идут в официальный
 * документ, поэтому правятся здесь, а не по всей странице.
 * Все значения соответствуют фактической реализации.
 */

export interface LayerModule {
  code: string;
  title: string;
  purpose: string;
  tech: string;
}

export interface ArchLayer {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  icon: string;
  /** Классы палитры слоя: рамка, фон, акцент */
  tone: { border: string; bg: string; badge: string; text: string };
  modules: LayerModule[];
}

export const LAYERS: ArchLayer[] = [
  {
    id: 'ui',
    index: 4,
    title: 'Слой интерфейса и внешних систем',
    subtitle: 'Панель оператора, CAM, MES, 1С',
    icon: 'MonitorSmartphone',
    tone: {
      border: 'border-violet-300',
      bg: 'bg-violet-50',
      badge: 'bg-violet-600',
      text: 'text-violet-900',
    },
    modules: [
      {
        code: 'UI',
        title: 'Панель оператора',
        purpose: 'Подбор режима, светофор стабильности, журнал, протокол PDF',
        tech: 'React + TypeScript',
      },
      {
        code: 'REST',
        title: 'REST API',
        purpose: 'Восемь эндпоинтов для CAM, MES, 1С и дашбордов',
        tech: 'FastAPI + OpenAPI',
      },
      {
        code: 'DOC',
        title: 'Протокол испытаний',
        purpose: 'Формируемый PDF с таблицами, осциллограммами и подписями',
        tech: 'jsPDF + Noto Sans',
      },
    ],
  },
  {
    id: 'core',
    index: 3,
    title: 'Ядро комплекса',
    subtitle: 'Алгоритмы подбора, детекции и коррекции',
    icon: 'Cpu',
    tone: {
      border: 'border-blue-300',
      bg: 'bg-blue-50',
      badge: 'bg-blue-600',
      text: 'text-blue-900',
    },
    modules: [
      {
        code: 'M1',
        title: 'ModeSelector',
        purpose: 'Подбор режима по материалу, толщине и требованию к кромке',
        tech: '10 правил «если — то»',
      },
      {
        code: 'M2',
        title: 'StabilityDetector',
        purpose: 'Детекция нестабильности по осциллограммам тока и напряжения',
        tech: 'Признаки + пик-фактор',
      },
      {
        code: 'M3',
        title: 'AdaptiveCorrector',
        purpose: 'Коррекция параметров с ограничением шага и подтверждением',
        tech: 'Безопасные окна ±10 %',
      },
      {
        code: 'M4',
        title: 'EdgeQualityPredictor',
        purpose: 'Прогноз грата, окалины, конусности с указанием причины',
        tech: '6 типов дефектов',
      },
      {
        code: 'M5',
        title: 'CuttingEconomics',
        purpose: 'Газ, расходники, себестоимость метра реза, потери от брака',
        tech: 'Нормативы предприятия',
      },
    ],
  },
  {
    id: 'data',
    index: 2,
    title: 'Слой данных и правил',
    subtitle: 'Техкарты, правила, журнал событий',
    icon: 'Database',
    tone: {
      border: 'border-emerald-300',
      bg: 'bg-emerald-50',
      badge: 'bg-emerald-600',
      text: 'text-emerald-900',
    },
    modules: [
      {
        code: 'D1',
        title: 'База процессов',
        purpose: 'Ст3 6/8/10/12 мм и сварка АМг6: режимы, пределы, чек-листы',
        tech: 'JSON, готово к PostgreSQL',
      },
      {
        code: 'D2',
        title: 'База правил',
        purpose: 'Правила подбора и сигнатуры нестабильности',
        tech: 'Декларативный формат',
      },
      {
        code: 'D3',
        title: 'EventLogger',
        purpose: 'Журнал событий, метрики, выгрузка CSV для MES и 1С',
        tech: 'В памяти → PostgreSQL',
      },
    ],
  },
  {
    id: 'gateway',
    index: 1,
    title: 'Слой интеграции с оборудованием',
    subtitle: 'Промышленный шлюз у станка',
    icon: 'Router',
    tone: {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      badge: 'bg-amber-600',
      text: 'text-amber-900',
    },
    modules: [
      {
        code: 'G1',
        title: 'OPC UA',
        purpose: 'Стойки Siemens, Fanuc, Heidenhain: статус, подача, датчики',
        tech: 'asyncua',
      },
      {
        code: 'G2',
        title: 'Modbus TCP',
        purpose: 'Старое оборудование через модули ввода-вывода',
        tech: 'pymodbus',
      },
      {
        code: 'G3',
        title: 'MQTT',
        purpose: 'IoT-датчики, камеры, спектрометры',
        tech: 'paho-mqtt',
      },
      {
        code: 'G4',
        title: 'Симулятор',
        purpose: 'Полный контур без доступа к цеху, демонстрация и отладка',
        tech: 'Встроенный',
      },
    ],
  },
];

export interface ApiEndpoint {
  method: 'GET' | 'POST';
  path: string;
  purpose: string;
  consumer: string;
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/recommend',
    purpose: 'Подбор режима: материал, толщина, требование к кромке',
    consumer: 'CAM, технолог',
  },
  {
    method: 'POST',
    path: '/api/v1/stability',
    purpose: 'Детекция нестабильности и прогноз качества кромки',
    consumer: 'Шлюз, ЧПУ',
  },
  {
    method: 'POST',
    path: '/api/v1/cam/augment',
    purpose: 'Привязка режимов к сегментам траектории',
    consumer: 'CAM (SmartMach)',
  },
  {
    method: 'POST',
    path: '/api/v1/cost',
    purpose: 'Себестоимость задания и сходимость режима',
    consumer: 'Планирование, 1С',
  },
  {
    method: 'GET',
    path: '/api/v1/events',
    purpose: 'Журнал событий и производственные метрики',
    consumer: 'MES, дашборды',
  },
  {
    method: 'GET',
    path: '/api/v1/events/export',
    purpose: 'Выгрузка журнала в CSV',
    consumer: '1С, Excel',
  },
  {
    method: 'GET',
    path: '/api/v1/machine/transports',
    purpose: 'Доступные транспорты и статус драйверов',
    consumer: 'Наладка',
  },
  {
    method: 'POST',
    path: '/api/v1/machine/status',
    purpose: 'Состояние станка через выбранный транспорт',
    consumer: 'Панель, шлюз',
  },
];

export interface FlowStep {
  n: number;
  actor: string;
  action: string;
  layer: string;
}

export const DATA_FLOW: FlowStep[] = [
  { n: 1, actor: 'Технолог', action: 'Задаёт: Ст3, 8 мм, кромка без грата', layer: 'ui' },
  { n: 2, actor: 'ModeSelector', action: 'Возвращает режим и прогноз качества кромки', layer: 'core' },
  { n: 3, actor: 'CAM-адаптер', action: 'Привязывает режимы к сегментам траектории', layer: 'core' },
  { n: 4, actor: 'Шлюз', action: 'Передаёт параметры в ЧПУ, читает датчики', layer: 'gateway' },
  { n: 5, actor: 'StabilityDetector', action: 'Анализирует осциллограммы в процессе резки', layer: 'core' },
  { n: 6, actor: 'AdaptiveCorrector', action: 'Вырабатывает коррекцию в безопасных пределах', layer: 'core' },
  { n: 7, actor: 'Оператор', action: 'Подтверждает критические изменения', layer: 'ui' },
  { n: 8, actor: 'EventLogger', action: 'Фиксирует событие и пересчитывает метрики', layer: 'data' },
];

export interface KpiItem {
  label: string;
  baseline: string;
  achieved: string;
  note: string;
}

export const KPI: KpiItem[] = [
  {
    label: 'Пробные проходы',
    baseline: '3–5 проходов',
    achieved: '2 коррекции',
    note: 'Проверено на Ст3 10 мм при отклонённом режиме',
  },
  {
    label: 'Доля брака по кромке',
    baseline: '12 %',
    achieved: '2 %',
    note: 'Снижение на 10 процентных пунктов',
  },
  {
    label: 'Себестоимость метра реза',
    baseline: '53 ₽/м',
    achieved: '29 ₽/м',
    note: 'Задание 250 м, 60 пробивок',
  },
  {
    label: 'Индекс стабильности',
    baseline: 'не измерялся',
    achieved: '0–100',
    note: 'Измеримый показатель для протоколов',
  },
];

export interface ProjectLink {
  name: string;
  role: string;
  module: string;
}

export const PROJECT_LINKS: ProjectLink[] = [
  {
    name: 'SmartMach',
    role: 'Сквозная автоматизация: геометрия и траектории из CAM',
    module: 'CAM-адаптер, /cam/augment',
  },
  {
    name: 'MAT-Labs',
    role: 'Техкарты, чек-листы и правила контроля качества',
    module: 'База процессов и правил',
  },
  {
    name: 'Учисьпро',
    role: 'Курсы и тренажёры по разбору дефектов на реальных кейсах',
    module: 'Журнал событий, сценарии',
  },
];
