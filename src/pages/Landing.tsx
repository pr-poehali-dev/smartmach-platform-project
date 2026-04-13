import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

/* ─── данные ─────────────────────────────────────────────────── */

const MODULES = [
  {
    icon: "Box",
    label: "CAD",
    title: "3D-моделирование и библиотека деталей",
    desc: "Библиотека из 20+ типовых деталей по ГОСТ и DIN — корпуса, валы, зубчатые колёса, уплотнения. Инженер берёт готовый шаблон за основу и адаптирует под задачу, не начиная с нуля. Встроенный контроль коллизий фиксирует пересечения геометрии ещё до запуска в производство.",
    color: "bg-blue-50 text-blue-600",
    badge: "НИОКР: библиотека типовых элементов",
  },
  {
    icon: "FlaskConical",
    label: "CAE",
    title: "Инженерный анализ и прочностные расчёты",
    desc: "МКЭ-расчёты, тепловой и динамический анализ непосредственно в платформе. Инженер задаёт нагрузки, граничные условия, получает карту напряжений и коэффициент запаса прочности — без переключения между системами. Усталостный анализ выявляет зоны риска до изготовления опытного образца.",
    color: "bg-purple-50 text-purple-600",
    badge: "НИОКР: виртуальный прототип",
  },
  {
    icon: "FileCode",
    label: "CAM",
    title: "Подготовка управляющих программ ЧПУ",
    desc: "Создание и хранение программ ЧПУ с привязкой к конкретной детали и станку. Отслеживание статуса от «очередь» до «завершено», фиксация фактического времени выполнения. Это сокращает переналадку и исключает потерю программ при смене оператора.",
    color: "bg-indigo-50 text-indigo-600",
    badge: "НИОКР: цифровой маршрут обработки",
  },
  {
    icon: "GitBranch",
    label: "PLM",
    title: "Управление жизненным циклом изделий",
    desc: "Полный трекинг изделия: черновик → разработка → согласование → производство → архив. Каждое изменение фиксируется с автором и датой. Версионирование не даёт запустить в производство несогласованную документацию — критично при работе с заказчиками ОПК и требованиями ГОСТ Р 2.601.",
    color: "bg-red-50 text-red-600",
    badge: "НИОКР: контроль версий КД",
  },
  {
    icon: "Radio",
    label: "CNC",
    title: "Мониторинг станочного парка",
    desc: "Актуальный статус каждого станка: работает / простой / авария. Загрузка в процентах, текущая программа, оператор. Фиксация аварий с отметкой ответственного. Руководитель видит состояние парка в реальном времени без обхода цеха.",
    color: "bg-green-50 text-green-600",
    badge: "НИОКР: IIoT-мониторинг",
  },
  {
    icon: "ClipboardList",
    label: "Задания",
    title: "Производственные задания и сквозной цикл",
    desc: "Сквозное задание связывает изделие, деталь, станок и исполнителя в единый цифровой паспорт. Статус продвигается по цепочке CAD → CAE → CAM → CNC → Готово. Диспетчер видит загрузку по приоритетам, срокам и исполнителям — никаких листов Excel.",
    color: "bg-orange-50 text-orange-600",
    badge: "НИОКР: цифровой двойник задания",
  },
];

const PROBLEMS = [
  { icon: "FileX",     text: "КД существует в разрозненных файлах — теряются версии, нет единой точки истины" },
  { icon: "AlertTriangle", text: "Несогласованная деталь уходит в производство — брак обнаруживается только при сборке" },
  { icon: "Clock",     text: "Технолог ищет нужную программу ЧПУ вручную среди сотен файлов на сетевом диске" },
  { icon: "PhoneOff",  text: "Статус станка узнаётся по телефону — простои не фиксируются, статистика не накапливается" },
  { icon: "Layers",    text: "Нет связи между конструктором, технологом и цехом — каждый работает в своей системе" },
];

const RESULTS = [
  { value: "до 40%", label: "сокращение времени подготовки производства за счёт готовых шаблонов и цифрового маршрута" },
  { value: "×3",     label: "ускорение согласования КД — все изменения фиксируются автоматически с историей" },
  { value: "100%",   label: "прослеживаемость изменений в документации, критично для контрактов с ОПК" },
  { value: "0",      label: "потерянных программ ЧПУ — каждая привязана к детали, версии и станку" },
];

const NIOKR_ITEMS = [
  {
    icon: "Microscope",
    title: "Тема НИОКР",
    desc: "Разработка интегрированной цифровой платформы управления жизненным циклом изделий для предприятий малого и среднего станкостроения на основе отечественного программного обеспечения.",
  },
  {
    icon: "Target",
    title: "Научная новизна",
    desc: "Единая архитектура, объединяющая CAD/CAE/CAM/PLM/CNC в одной облачной системе без необходимости лицензирования зарубежного ПО. Встроенный ИИ-ассистент с предметными системными промптами для каждого этапа жизненного цикла.",
  },
  {
    icon: "Award",
    title: "Соответствие «Старт-Пром-1»",
    desc: "Проект направлен на импортозамещение в сфере промышленного ПО (CAD/CAE/CAM/PLM), относится к гражданским отраслям промышленности — станкостроение, приборостроение, машиностроение. Результат НИОКР — тиражируемый программный продукт.",
  },
  {
    icon: "BookOpen",
    title: "Федеральный проект",
    desc: "«Содействие проведению НИОКР в гражданских отраслях промышленности». Конкурс «Старт-Пром-1» (очередь 3). Платформа SmartMach разрабатывается в рамках данного направления государственной поддержки инновационных проектов.",
  },
];

const STACK = [
  "React + TypeScript", "Python 3.11", "PostgreSQL", "Cloud Functions",
  "REST API", "ИИ-ассистент (GPT-4o)", "S3-хранилище", "Отечественное облако",
];

/* ─── компоненты ─────────────────────────────────────────────── */

function NavBar({ onEnter }: { onEnter: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-sm border-b border-border" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="Settings" size={16} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">SmartMach</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#problem" className="hover:text-foreground transition-colors">Проблема</a>
          <a href="#modules" className="hover:text-foreground transition-colors">Модули</a>
          <a href="#niokr" className="hover:text-foreground transition-colors">НИОКР</a>
          <a href="#results" className="hover:text-foreground transition-colors">Результаты</a>
        </nav>
        <button onClick={onEnter}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          Открыть платформу
          <Icon name="ArrowRight" size={14} />
        </button>
      </div>
    </header>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-primary/8 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
      <Icon name="Sparkles" size={11} />
      {text}
    </div>
  );
}

/* ─── главная страница ──────────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      <NavBar onEnter={() => navigate("/platform")} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/4 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1.5 text-xs font-medium mb-6">
              <Icon name="Award" size={13} />
              Конкурс «Старт-Пром-1» · Очередь 3 · Федеральный проект НИОКР
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
              Цифровая платформа<br />
              <span className="text-primary">управления производством</span><br />
              для станкостроения
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              SmartMach объединяет CAD, CAE, CAM, PLM и мониторинг ЧПУ-станков в одной системе.
              Российское ПО для предприятий малого и среднего станкостроения —
              без зарубежных лицензий, без разрозненных инструментов.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate("/platform")}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                <Icon name="Play" size={16} />
                Открыть демо-платформу
              </button>
              <a href="#modules"
                className="flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-secondary/60 transition-colors">
                Изучить возможности
                <Icon name="ChevronDown" size={16} />
              </a>
            </div>
          </div>

          {/* превью платформы */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
                <div className="flex gap-1.5">
                  {["bg-red-400", "bg-yellow-400", "bg-green-400"].map((c, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${c}`} />
                  ))}
                </div>
                <div className="flex-1 bg-secondary/60 rounded-md h-5 mx-4 flex items-center px-3">
                  <span className="text-xs text-muted-foreground">smartmach.platform / dashboard</span>
                </div>
              </div>
              <div className="grid grid-cols-6 h-64">
                <div className="col-span-1 border-r border-border bg-secondary/20 p-3 space-y-2">
                  {["Settings", "Box", "FlaskConical", "FileCode", "GitBranch", "Radio"].map((icon, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${i === 0 ? "bg-primary/10" : ""}`}>
                      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={13} className={i === 0 ? "text-primary" : "text-muted-foreground"} />
                      <div className={`h-2 rounded flex-1 ${i === 0 ? "bg-primary/30" : "bg-secondary"}`} />
                    </div>
                  ))}
                </div>
                <div className="col-span-5 p-5 space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {[["Box", "bg-blue-50 text-blue-600", "Деталей", "0"],
                      ["Cpu", "bg-indigo-50 text-indigo-600", "Станков", "0"],
                      ["ClipboardList", "bg-orange-50 text-orange-600", "Заданий", "0"],
                      ["CheckCircle", "bg-green-50 text-green-600", "Готово", "0"]].map(([ic, cl, lb]) => (
                        <div key={lb} className="bg-white border border-border rounded-xl p-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${cl}`}>
                            <Icon name={ic as Parameters<typeof Icon>[0]["name"]} size={13} />
                          </div>
                          <div className="h-4 w-8 bg-foreground/10 rounded mb-1" />
                          <div className="text-xs text-muted-foreground">{lb}</div>
                        </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {MODULES.slice(0, 3).map((m) => (
                      <div key={m.label} className="bg-white border border-border rounded-xl p-3 flex gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.color}`}>
                          <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={13} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{m.label}</div>
                          <div className="h-2 w-16 bg-secondary rounded mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-primary/10 blur-xl rounded-full" />
          </div>
        </div>
      </section>

      {/* ── ПРОБЛЕМА ─────────────────────────────────────────── */}
      <section id="problem" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <SectionLabel text="Почему это важно" />
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Как устроено производство<br />без цифровой платформы
          </h2>
          <p className="text-muted-foreground text-base mb-10 max-w-2xl">
            Малые и средние предприятия станкостроения работают в условиях, где конструктор,
            технолог и цех используют несовместимые инструменты. Это приводит к потерям времени,
            браку и невозможности масштабирования.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROBLEMS.map((p) => (
              <div key={p.text} className="bg-white rounded-xl border border-border p-5 flex gap-3">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name={p.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-red-500" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{p.text}</p>
              </div>
            ))}
            <div className="bg-primary text-primary-foreground rounded-xl p-5 flex flex-col justify-between">
              <div className="text-sm leading-relaxed opacity-90">
                SmartMach решает все эти задачи в единой системе — от эскиза до выхода детали с ЧПУ-станка.
              </div>
              <button onClick={() => navigate("/platform")}
                className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors w-fit">
                Смотреть платформу <Icon name="ArrowRight" size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── МОДУЛИ ───────────────────────────────────────────── */}
      <section id="modules" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionLabel text="Функциональность" />
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Шесть интегрированных модулей
          </h2>
          <p className="text-muted-foreground text-base mb-12 max-w-2xl">
            Каждый модуль решает конкретную задачу и передаёт данные следующему.
            Вместе они формируют сквозной цифровой цикл производства.
          </p>
          <div className="space-y-4">
            {MODULES.map((m, i) => (
              <div key={m.label}
                className="bg-white rounded-2xl border border-border p-6 flex flex-col sm:flex-row gap-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${m.color}`}>
                    <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Модуль {i + 1}</span>
                      <span className="text-xs bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full">{m.badge}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{m.label} — {m.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color} opacity-40 group-hover:opacity-100 transition-opacity`}>
                    <span className="text-sm font-bold">{i + 1}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── НИОКР ────────────────────────────────────────────── */}
      <section id="niokr" className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-amber-400/15 text-amber-400 border border-amber-400/30 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-6">
            <Icon name="Award" size={11} />
            НИОКР · Старт-Пром-1 · Очередь 3
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Разработка в рамках<br />федерального проекта
          </h2>
          <p className="text-slate-400 text-base mb-12 max-w-2xl">
            SmartMach создаётся как результат научно-исследовательских и опытно-конструкторских работ
            по программе «Содействие проведению НИОКР в гражданских отраслях промышленности».
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {NIOKR_ITEMS.map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
                <div className="w-10 h-10 bg-amber-400/15 rounded-xl flex items-center justify-center mb-4">
                  <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={20} className="text-amber-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Code" size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-white">Технологический стек</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STACK.map((s) => (
                <span key={s} className="text-xs bg-white/10 text-slate-300 border border-white/10 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── РЕЗУЛЬТАТЫ ───────────────────────────────────────── */}
      <section id="results" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionLabel text="Ожидаемые результаты" />
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Измеримый эффект<br />для предприятия
          </h2>
          <p className="text-muted-foreground text-base mb-12 max-w-2xl">
            Оценки основаны на анализе процессов малых и средних предприятий станкостроения,
            опросах технологов и руководителей производства в ходе исследовательской части НИОКР.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {RESULTS.map((r) => (
              <div key={r.value} className="bg-slate-50 rounded-2xl border border-border p-6">
                <div className="text-4xl font-bold text-primary mb-3">{r.value}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.label}</p>
              </div>
            ))}
          </div>

          {/* ИИ-блок */}
          <div className="mt-10 bg-gradient-to-r from-primary/5 to-blue-50 rounded-2xl border border-primary/15 p-8 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Sparkles" size={22} className="text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">ИИ-ассистент в каждом модуле</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Встроенный GPT-4o ассистент знает контекст каждого модуля: в CAD помогает с допусками и материалами,
                в CAE — с интерпретацией МКЭ, в CNC — с кодами ошибок Fanuc и Siemens.
                Это снижает порог входа для новых специалистов и ускоряет решение нестандартных задач прямо
                в рабочем интерфейсе, без переключения в браузер.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Посмотрите платформу в действии</h2>
          <p className="text-primary-foreground/70 text-base mb-8 leading-relaxed">
            Демо-версия полностью функциональна: можно добавлять детали, запускать расчёты,
            управлять станками и создавать производственные задания.
          </p>
          <button onClick={() => navigate("/platform")}
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg">
            <Icon name="Play" size={16} />
            Открыть SmartMach Platform
          </button>
          <p className="mt-4 text-xs text-primary-foreground/50">
            Разрабатывается в рамках конкурса «Старт-Пром-1» (очередь 3),
            Федеральный проект «Содействие проведению НИОКР в гражданских отраслях промышленности»
          </p>
        </div>
      </section>

      {/* ── ФУТЕР ────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Icon name="Settings" size={12} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">SmartMach</span>
            <span className="text-xs text-muted-foreground ml-1">· Цифровая платформа станкостроения</span>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            НИОКР · «Старт-Пром-1» очередь 3 · Федеральный проект по содействию проведению НИОКР в гражданских отраслях
          </p>
        </div>
      </footer>
    </div>
  );
}
