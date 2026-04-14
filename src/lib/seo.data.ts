import { type ModuleId } from "@/pages/Index";

const BASE_TITLE = "СмартМаш";
const BASE_URL = "https://smartmach.ru";
const OG_IMAGE = "https://cdn.poehali.dev/projects/4a414f55-f964-427a-bda6-0016a78c34e4/files/8833c5b1-c37d-4f95-b990-7af6a609bf94.jpg";

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  noIndex?: boolean;
}

export const PAGE_SEO: Record<string, SeoMeta> = {
  landing: {
    title: `${BASE_TITLE} — цифровая платформа управления производством`,
    description: "Российская цифровая платформа для станкостроения: проектирование деталей (CAD), расчёты (CAE), управление программами ЧПУ (CAM), жизненный цикл изделий (PLM), мониторинг оборудования.",
    keywords: "CAD CAM CAE PLM ЧПУ станкостроение производство ГОСТ цифровая платформа Россия",
    canonical: BASE_URL,
  },
  auth: {
    title: `Вход — ${BASE_TITLE}`,
    description: "Войдите в платформу СмартМаш для управления производством.",
    noIndex: true,
  },
  platform: {
    title: `Платформа — ${BASE_TITLE}`,
    description: "Цифровая платформа управления производством СмартМаш.",
    noIndex: true,
  },
  profile: {
    title: `Профиль — ${BASE_TITLE}`,
    description: "Управление профилем пользователя СмартМаш.",
    noIndex: true,
  },
};

export const MODULE_SEO: Record<ModuleId, SeoMeta> = {
  home: {
    title: `Обзор — ${BASE_TITLE}`,
    description: "Дашборд с ключевыми показателями производства: статусы программ, оборудование, задания.",
    noIndex: true,
  },
  cad: {
    title: `Проектирование (CAD) — ${BASE_TITLE}`,
    description: "Библиотека деталей, 2D-чертежи и 3D-моделирование. ГОСТ, DIN, ISO стандарты.",
    noIndex: true,
  },
  cam: {
    title: `Программы ЧПУ (CAM) — ${BASE_TITLE}`,
    description: "Управление управляющими программами для станков с ЧПУ: создание, проверка, запуск.",
    noIndex: true,
  },
  cae: {
    title: `Инженерные расчёты (CAE) — ${BASE_TITLE}`,
    description: "Прочностные расчёты, тепловой анализ, расчёт режимов резания и усталостных характеристик.",
    noIndex: true,
  },
  plm: {
    title: `Жизненный цикл изделий (PLM) — ${BASE_TITLE}`,
    description: "Управление жизненным циклом изделий: конструкторская документация, ревизии, статусы.",
    noIndex: true,
  },
  cnc: {
    title: `Мониторинг ЧПУ — ${BASE_TITLE}`,
    description: "Мониторинг и управление станками с ЧПУ в реальном времени.",
    noIndex: true,
  },
  analytics: {
    title: `Производственные задания — ${BASE_TITLE}`,
    description: "Планирование и отслеживание производственных заданий и операций.",
    noIndex: true,
  },
  equipment: {
    title: `Справочник оборудования — ${BASE_TITLE}`,
    description: "Справочник производственного оборудования: характеристики, обслуживание, история.",
    noIndex: true,
  },
  economics: {
    title: `Экономика производства — ${BASE_TITLE}`,
    description: "Экономический анализ производства: себестоимость, поставщики, точка безубыточности.",
    noIndex: true,
  },
  employees: {
    title: `Сотрудники — ${BASE_TITLE}`,
    description: "Управление персоналом производственного предприятия.",
    noIndex: true,
  },
};

export const MODULE_BREADCRUMB: Record<ModuleId, string[]> = {
  home:      ["Обзор"],
  cad:       ["Проектирование (CAD)"],
  cam:       ["Программы ЧПУ (CAM)"],
  cae:       ["Инженерные расчёты (CAE)"],
  plm:       ["Жизненный цикл (PLM)"],
  cnc:       ["Мониторинг ЧПУ"],
  analytics: ["Производственные задания"],
  equipment: ["Справочник оборудования"],
  economics: ["Экономика"],
  employees: ["Сотрудники"],
};

export { OG_IMAGE, BASE_TITLE };
