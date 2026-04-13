import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

/* ────────────────────────────────────────────────────────────────
   ДАННЫЕ
──────────────────────────────────────────────────────────────── */

const MODULES = [
  {
    icon: "Box",
    abbr: "КПД",
    title: "Конструкторская подготовка",
    sub: "Проектирование деталей",
    desc: "Библиотека из 20 типовых деталей по ГОСТ и ДИН — корпуса, валы, зубчатые колёса, уплотнения, фланцы, пружины. Конструктор берёт готовую деталь за основу и адаптирует под задачу. Встроенная проверка геометрических коллизий выявляет ошибки ещё до изготовления.",
    color: "bg-blue-50 text-blue-700",
    border: "border-blue-100",
    badge: "НИОКР: библиотека типовых элементов",
  },
  {
    icon: "FlaskConical",
    abbr: "РПК",
    title: "Расчётно-прочностная проверка",
    sub: "Инженерный анализ",
    desc: "Конечно-элементные расчёты, тепловой и динамический анализ. Конструктор задаёт нагрузки и граничные условия, получает карту напряжений и коэффициент запаса прочности. Усталостный расчёт выявляет опасные зоны до изготовления опытного образца.",
    color: "bg-purple-50 text-purple-700",
    border: "border-purple-100",
    badge: "НИОКР: виртуальный прототип",
  },
  {
    icon: "FileCode",
    abbr: "УПО",
    title: "Управляющие программы обработки",
    sub: "Подготовка программ для станков с ЧПУ",
    desc: "Создание и хранение управляющих программ с привязкой к конкретной детали и станку. Отслеживание статуса от «Очередь» до «Выполнено». Исключается потеря программ при смене оператора — каждая программа привязана к детали, версии и оборудованию.",
    color: "bg-indigo-50 text-indigo-700",
    border: "border-indigo-100",
    badge: "НИОКР: цифровой маршрут обработки",
  },
  {
    icon: "GitBranch",
    abbr: "ЖЦИ",
    title: "Жизненный цикл изделия",
    sub: "Управление версиями конструкторской документации",
    desc: "Полное отслеживание изделия: черновик → разработка → согласование → производство → архив. Каждое изменение фиксируется с указанием автора и даты. Несогласованная документация не может быть передана в производство.",
    color: "bg-red-50 text-red-700",
    border: "border-red-100",
    badge: "НИОКР: контроль версий КД",
  },
  {
    icon: "Radio",
    abbr: "МСП",
    title: "Мониторинг станочного парка",
    sub: "Состояние оборудования в реальном времени",
    desc: "Текущий статус каждого станка: работает / простой / авария. Загрузка в процентах, текущая программа, имя оператора. Аварии фиксируются с отметкой ответственного. Руководитель видит состояние всего парка без обхода цеха.",
    color: "bg-green-50 text-green-700",
    border: "border-green-100",
    badge: "НИОКР: промышленный интернет вещей",
  },
  {
    icon: "ClipboardList",
    abbr: "СПЗ",
    title: "Сквозные производственные задания",
    sub: "Полный цикл от эскиза до готовой детали",
    desc: "Производственное задание связывает изделие, деталь, станок и исполнителя в единый цифровой паспорт. Статус последовательно проходит: Проектирование → Расчёт → Программа → Обработка → Готово. Диспетчер видит всё по приоритетам и срокам.",
    color: "bg-orange-50 text-orange-700",
    border: "border-orange-100",
    badge: "НИОКР: цифровой двойник задания",
  },
];

const PROBLEMS = [
  { icon: "FileX",         text: "Конструкторская документация существует в разрозненных файлах — версии теряются, нет единого источника истины" },
  { icon: "AlertTriangle", text: "Несогласованная деталь уходит в производство — брак обнаруживается только при финальной сборке" },
  { icon: "Clock",         text: "Технолог ищет нужную программу для станка вручную среди сотен файлов на сетевом диске" },
  { icon: "PhoneOff",      text: "Статус станка узнаётся по телефону — простои не фиксируются, статистика не накапливается" },
  { icon: "Layers",        text: "Нет связи между конструктором, технологом и цехом — каждый работает в своей изолированной системе" },
];

const RESULTS = [
  { value: "до 40%", label: "сокращение времени подготовки производства за счёт готовых шаблонов и цифрового маршрута" },
  { value: "в 3 раза", label: "быстрее согласование документации — все изменения фиксируются автоматически с историей" },
  { value: "100%", label: "прослеживаемость изменений в документации, обязательно для контрактов с ОПК" },
  { value: "0", label: "потерянных программ для станков — каждая привязана к детали, версии и оборудованию" },
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
    desc: "Единая архитектура, объединяющая модули проектирования, расчётов, подготовки программ, управления жизненным циклом и мониторинга станков в одной облачной системе без зарубежных лицензий. Встроенный искусственный интеллект с контекстом для каждого этапа.",
  },
  {
    icon: "Award",
    title: "Соответствие «Старт-Пром-1»",
    desc: "Проект направлен на импортозамещение промышленного программного обеспечения, относится к гражданским отраслям — станкостроение, приборостроение, машиностроение. Результат НИОКР — тиражируемый программный продукт.",
  },
  {
    icon: "BookOpen",
    title: "Федеральный проект",
    desc: "«Содействие проведению научно-исследовательских и опытно-конструкторских работ в гражданских отраслях промышленности». Конкурс «Старт-Пром-1» (очередь 3). Платформа разрабатывается в рамках данного направления государственной поддержки.",
  },
];

const TECH_STACK = [
  "Российское облако", "Открытый исходный код (компоненты)", "Отечественная СУБД",
  "Облачные функции", "Программный интерфейс (API)", "Искусственный интеллект (ГПТ-4о)",
  "Объектное хранилище", "Веб-технологии (без установки)",
];

/* ────────────────────────────────────────────────────────────────
   ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
──────────────────────────────────────────────────────────────── */

function NavBar({ onEnter }: { onEnter: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/97 shadow-sm border-b border-border" : "bg-transparent"}`}
      style={{ backdropFilter: scrolled ? "blur(8px)" : "none" }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="Settings" size={16} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight" style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
            СмартМаш
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground" style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
          <a href="#problem" className="hover:text-foreground transition-colors">Проблема</a>
          <a href="#modules" className="hover:text-foreground transition-colors">Модули</a>
          <a href="#niokr" className="hover:text-foreground transition-colors">НИОКР</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Контакты</a>
        </nav>
        <button onClick={onEnter}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
          Открыть систему
          <Icon name="ArrowRight" size={14} />
        </button>
      </div>
    </header>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-primary/8 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4"
      style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
      <Icon name="Sparkles" size={11} />
      {text}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ФОРМА ЗАЯВКИ
──────────────────────────────────────────────────────────────── */

function ContactForm() {
  const [form, setForm] = useState({ name: "", org: "", phone: "", question: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("https://functions.poehali.dev/4ce7351a-e815-4a1d-8871-0dbc0ba4cb70", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      setForm({ name: "", org: "", phone: "", question: "" });
    } catch {
      setStatus("err");
    }
  }

  const inputCls = "w-full border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white transition-shadow";

  return (
    <section id="contact" className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Левая колонка — текст */}
          <div>
            <SectionLabel text="Связаться с нами" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight"
              style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
              Обсудим внедрение<br />на вашем предприятии
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">
              Если вы руководитель производства, технический директор или участвуете в проекте
              цифровизации — оставьте заявку. Мы проведём демонстрацию системы и обсудим
              возможности совместного участия в НИОКР.
            </p>

            <div className="space-y-4">
              {[
                { icon: "CheckCircle", text: "Бесплатная демонстрация системы в вашем браузере" },
                { icon: "CheckCircle", text: "Консультация по внедрению в технологический процесс" },
                { icon: "CheckCircle", text: "Возможность участия в апробации в рамках НИОКР" },
                { icon: "CheckCircle", text: "Подготовка технического задания под ваше предприятие" },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-3">
                  <Icon name="CheckCircle" size={18} className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Award" size={16} className="text-amber-600" />
                <span className="text-sm font-bold text-amber-800">Конкурс «Старт-Пром-1»</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Проект реализуется в рамках Федерального проекта «Содействие проведению
                научно-исследовательских и опытно-конструкторских работ в гражданских отраслях
                промышленности», очередь 3.
              </p>
            </div>
          </div>

          {/* Правая колонка — форма */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8">
            {status === "ok" ? (
              <div className="py-10 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="CheckCircle" size={32} className="text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2"
                  style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
                  Заявка отправлена!
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Мы свяжемся с вами в ближайшее время.
                </p>
                <button onClick={() => setStatus("idle")}
                  className="text-sm text-primary underline hover:no-underline">
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-foreground mb-6"
                  style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
                  Оставить заявку
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Ваше имя *
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={e => f("name", e.target.value)}
                      placeholder="Иван Петрович Сидоров"
                      className={inputCls}
                      style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Организация
                    </label>
                    <input
                      value={form.org}
                      onChange={e => f("org", e.target.value)}
                      placeholder="ООО «Завод Пример»"
                      className={inputCls}
                      style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Телефон или электронная почта *
                    </label>
                    <input
                      required
                      value={form.phone}
                      onChange={e => f("phone", e.target.value)}
                      placeholder="+7 (900) 000-00-00 или email@example.ru"
                      className={inputCls}
                      style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Вопрос или комментарий
                    </label>
                    <textarea
                      value={form.question}
                      onChange={e => f("question", e.target.value)}
                      placeholder="Опишите вашу задачу или задайте вопрос…"
                      rows={3}
                      className={`${inputCls} resize-none`}
                      style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}
                    />
                  </div>
                  {status === "err" && (
                    <p className="text-sm text-red-500 flex items-center gap-2">
                      <Icon name="AlertTriangle" size={14} />
                      Не удалось отправить. Попробуйте ещё раз.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
                    {status === "sending" ? (
                      <>
                        <Icon name="Loader" size={16} className="animate-spin" />
                        Отправляем…
                      </>
                    ) : (
                      <>
                        <Icon name="Send" size={16} />
                        Отправить заявку
                      </>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    Нажимая кнопку, вы соглашаетесь на обработку персональных данных
                    в соответствии с Федеральным законом № 152-ФЗ.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   ГЛАВНАЯ СТРАНИЦА
──────────────────────────────────────────────────────────────── */

const FONT = { fontFamily: "'PT Sans', Arial, sans-serif" };

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden" style={FONT}>
      <NavBar onEnter={() => navigate("/platform")} />

      {/* ── ВЕРХНИЙ БЛОК ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/4 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1.5 text-xs font-medium mb-6">
              <Icon name="Award" size={13} />
              Конкурс «Старт-Пром-1» · Очередь 3 · Федеральный проект НИОКР
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6"
              style={{ fontFamily: "'PT Sans', Arial, sans-serif" }}>
              Цифровая система<br />
              <span className="text-primary">управления производством</span><br />
              в станкостроении
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              «СмартМаш» объединяет проектирование деталей, прочностные расчёты, подготовку
              программ для станков, управление жизненным циклом изделий и мониторинг оборудования
              в одной российской системе — без зарубежных лицензий.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate("/platform")}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                <Icon name="Play" size={16} />
                Открыть демонстрационную версию
              </button>
              <a href="#contact"
                className="flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-secondary/60 transition-colors">
                Оставить заявку
                <Icon name="ArrowRight" size={16} />
              </a>
            </div>
          </div>

          {/* Схематичный вид интерфейса */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
                <div className="flex gap-1.5">
                  {["bg-red-400", "bg-yellow-400", "bg-green-400"].map((c, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${c}`} />
                  ))}
                </div>
                <div className="flex-1 bg-secondary/60 rounded-md h-5 mx-4 flex items-center px-3">
                  <span className="text-xs text-muted-foreground">smartmach.platform · Панель управления</span>
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
                    {[
                      ["Box",           "bg-blue-50 text-blue-600",   "Деталей"],
                      ["Cpu",           "bg-indigo-50 text-indigo-600","Станков"],
                      ["ClipboardList", "bg-orange-50 text-orange-600","Заданий"],
                      ["CheckCircle",   "bg-green-50 text-green-600",  "Готово"],
                    ].map(([ic, cl, lb]) => (
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
                      <div key={m.abbr} className="bg-white border border-border rounded-xl p-3 flex gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.color}`}>
                          <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={13} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{m.abbr}</div>
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
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
            Как устроено производство<br />без единой цифровой системы
          </h2>
          <p className="text-muted-foreground text-base mb-10 max-w-2xl">
            Малые и средние предприятия станкостроения работают в условиях, где конструктор,
            технолог и цех используют несовместимые инструменты. Это приводит к потерям времени,
            браку и невозможности роста.
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
                «СмартМаш» решает все эти задачи в единой системе — от эскиза до выхода готовой детали со станка.
              </div>
              <button onClick={() => navigate("/platform")}
                className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors w-fit">
                Открыть систему <Icon name="ArrowRight" size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── МОДУЛИ ───────────────────────────────────────────── */}
      <section id="modules" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionLabel text="Возможности системы" />
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
            Шесть взаимосвязанных модулей
          </h2>
          <p className="text-muted-foreground text-base mb-12 max-w-2xl">
            Каждый модуль решает конкретную задачу и передаёт данные следующему.
            Вместе они образуют сквозной цифровой производственный цикл.
          </p>

          {/* Схема цикла */}
          <div className="flex items-center justify-center gap-1 flex-wrap mb-10 p-4 bg-slate-50 rounded-2xl border border-border">
            {MODULES.map((m, i) => (
              <div key={m.abbr} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold ${m.color} ${m.border}`}>
                  <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={14} />
                  {m.abbr}
                </div>
                {i < MODULES.length - 1 && (
                  <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {MODULES.map((m, i) => (
              <div key={m.abbr}
                className={`bg-white rounded-2xl border p-6 flex flex-col sm:flex-row gap-5 hover:shadow-md transition-shadow ${m.border}`}>
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${m.color}`}>
                    <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-muted-foreground tracking-wider">МОДУЛЬ {i + 1}</span>
                      <span className="text-xs bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-full">{m.badge}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1" style={FONT}>
                      {m.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">{m.sub}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
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
          <div className="inline-flex items-center gap-1.5 bg-amber-400/15 text-amber-400 border border-amber-400/30 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-6">
            <Icon name="Award" size={11} />
            НИОКР · Старт-Пром-1 · Очередь 3
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={FONT}>
            Разработка в рамках<br />федерального проекта
          </h2>
          <p className="text-slate-400 text-base mb-12 max-w-2xl">
            «СмартМаш» создаётся как результат научно-исследовательских и опытно-конструкторских
            работ по программе «Содействие проведению НИОКР в гражданских отраслях промышленности».
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
            {NIOKR_ITEMS.map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
                <div className="w-10 h-10 bg-amber-400/15 rounded-xl flex items-center justify-center mb-4">
                  <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={20} className="text-amber-400" />
                </div>
                <h3 className="font-bold text-white mb-2" style={FONT}>{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Code" size={16} className="text-slate-400" />
              <span className="text-sm font-bold text-white">Технологический стек</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TECH_STACK.map((s) => (
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
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
            Измеримый эффект<br />для предприятия
          </h2>
          <p className="text-muted-foreground text-base mb-12 max-w-2xl">
            Оценки основаны на анализе процессов малых и средних предприятий станкостроения
            и опросах технологов и руководителей производства в исследовательской части НИОКР.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {RESULTS.map((r) => (
              <div key={r.value} className="bg-slate-50 rounded-2xl border border-border p-6">
                <div className="text-4xl font-bold text-primary mb-3" style={FONT}>{r.value}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary/5 to-blue-50 rounded-2xl border border-primary/15 p-8 flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Sparkles" size={22} className="text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2" style={FONT}>
                Встроенный искусственный интеллект в каждом модуле
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Интегрированный помощник на основе нейронной сети знает контекст каждого раздела:
                в модуле проектирования консультирует по допускам и материалам,
                в расчётном — помогает трактовать результаты конечно-элементного анализа,
                в разделе оборудования — расшифровывает коды аварий.
                Это снижает порог входа для новых специалистов и ускоряет решение нестандартных задач.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ФОРМА ЗАЯВКИ ─────────────────────────────────────── */}
      <ContactForm />

      {/* ── ПРИЗЫВ К ДЕЙСТВИЮ ────────────────────────────────── */}
      <section className="py-24 px-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={FONT}>
            Посмотрите систему в работе
          </h2>
          <p className="text-primary-foreground/70 text-base mb-8 leading-relaxed">
            Демонстрационная версия полностью функциональна: можно добавлять детали,
            запускать расчёты, управлять станками и создавать производственные задания.
          </p>
          <button onClick={() => navigate("/platform")}
            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg">
            <Icon name="Play" size={16} />
            Открыть «СмартМаш»
          </button>
          <p className="mt-4 text-xs text-primary-foreground/50">
            Разрабатывается в рамках конкурса «Старт-Пром-1» (очередь 3),
            Федеральный проект «Содействие проведению НИОКР в гражданских отраслях промышленности»
          </p>
        </div>
      </section>

      {/* ── НИЖНИЙ КОЛОНТИТУЛ ────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Icon name="Settings" size={12} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground" style={FONT}>СмартМаш</span>
            <span className="text-xs text-muted-foreground ml-1">· Цифровая система управления производством</span>
          </div>
          <div className="text-center sm:text-right space-y-1">
            <p className="text-xs text-muted-foreground">
              НИОКР · «Старт-Пром-1», очередь 3
            </p>
            <p className="text-xs text-muted-foreground">
              Федеральный проект «Содействие проведению НИОКР в гражданских отраслях промышленности»
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}