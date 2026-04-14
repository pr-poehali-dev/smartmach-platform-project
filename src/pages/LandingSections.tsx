import Icon from "@/components/ui/icon";
import { FONT, MODULES, CHALLENGES, EFFECTS, ABOUT_ITEMS, TECH_STACK } from "./landing.data";
import { SectionLabel } from "./LandingHero";

/* ── Задачи производства ─────────────────────────────────────── */

interface ChallengesSectionProps {
  onEnter: () => void;
}

function ChallengesSection({ onEnter }: ChallengesSectionProps) {
  return (
    <section id="challenges" className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="Научно-техническая проблема" />
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
          Разрыв контуров КД–CAE–CAM–MES<br />как системная проблема
        </h2>
        <p className="text-muted-foreground text-base mb-10 max-w-2xl">
          В отечественном станкостроении отсутствует механизм автоматической проверки
          совместимости версий и технологических ограничений между контурами конструкторской
          документации, расчётов, управляющих программ и производственного исполнения.
          Ручная синхронизация приводит к системным потерям и невозможности обеспечить
          полную трассируемость изменений.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHALLENGES.map((p) => (
            <div key={p.text} className="bg-white rounded-xl border border-border p-5 flex gap-3">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name={p.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-red-500" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
          <div className="bg-primary text-primary-foreground rounded-xl p-5 flex flex-col justify-between">
            <div className="text-sm leading-relaxed opacity-90">
              «СмартМаш» устраняет разрыв между контурами через единую цифровую модель изделия с автоматической валидацией согласованности данных на каждом переходе КД→CAE→CAM→MES.
            </div>
            <button onClick={onEnter}
              className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors w-fit"
              style={FONT}>
              Открыть систему <Icon name="ArrowRight" size={12} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Модули ──────────────────────────────────────────────────── */

function ModulesSection() {
  return (
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
              {i < MODULES.length - 1 && <Icon name="ChevronRight" size={14} className="text-muted-foreground" />}
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
                  <h3 className="text-lg font-bold text-foreground mb-1" style={FONT}>{m.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{m.sub}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── НИОКР ───────────────────────────────────────────────────── */

function NiocrSection() {
  const novelty = [
    {
      icon: "GitMerge",
      title: "Сквозное связывание данных КД–CAE–CAM–MES",
      desc: "Разработан подход к автоматической проверке совместимости версий и технологических ограничений без ручной синхронизации между контурами.",
    },
    {
      icon: "FileCheck",
      title: "Единый цифровой паспорт изделия",
      desc: "Реализован механизм трассируемости изменений от конструкторских решений до управляющих программ и производственных заданий.",
    },
    {
      icon: "ScanSearch",
      title: "Алгоритмы автоматизированной проверки",
      desc: "Предложены алгоритмы проверки технологичности и обнаружения геометрических коллизий до выпуска управляющих программ.",
    },
    {
      icon: "Network",
      title: "Интеграция в едином цифровом контуре",
      desc: "Управление документацией, расчётами, станками и заданиями объединены в единый контур без дублирования данных.",
    },
  ];

  const pilot = [
    { value: "12", label: "деталей обработано в ходе пилотной эксплуатации" },
    { value: "4",  label: "станка подключено к контуру мониторинга МЕС" },
    { value: "−64%", label: "сокращение времени согласования КД: с 7 до 2 дней" },
    { value: "−38%", label: "снижение доли ошибок в управляющих программах" },
  ];

  return (
    <section id="niocr" className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="НИОКР" />
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
          Научно-техническая новизна<br />и результаты пилотной эксплуатации
        </h2>
        <p className="text-muted-foreground text-base mb-12 max-w-3xl">
          Цель НИОКР — разработка методического и программного обеспечения для сквозной интеграции
          контуров КД–CAE–CAM–MES на основе единой цифровой модели изделия. Текущая стадия —
          <span className="font-semibold text-foreground"> TRL 5</span>; переход к TRL 6 планируется
          при расширении испытаний на 2–3 предприятиях.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {novelty.map((item, i) => (
            <div key={item.title} className="bg-white rounded-2xl border border-border p-6 flex gap-4">
              <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={20} className="text-primary" />
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground tracking-wider mb-1">НОВИЗНА {i + 1}</div>
                <h3 className="font-bold text-foreground mb-1 text-sm" style={FONT}>{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Icon name="FlaskConical" size={18} className="text-slate-400" />
            <span className="text-sm font-bold text-white" style={FONT}>Результаты пилотной эксплуатации</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {pilot.map((p) => (
              <div key={p.value}>
                <div className="text-3xl font-bold text-primary mb-1" style={FONT}>{p.value}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{p.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <p className="text-sm text-slate-400 max-w-xl">
              Ожидаемые результаты при промышленном масштабировании: сокращение времени согласования КД
              в 2–3 раза, снижение доли ошибок в УП на 30–40%, рост прослеживаемости до 100% по всем
              стадиям жизненного цикла.
            </p>
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 flex-shrink-0">
              <Icon name="TrendingUp" size={16} className="text-primary" />
              <span className="text-sm font-bold text-white" style={FONT}>TRL 5 → TRL 6</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── О компании ──────────────────────────────────────────────── */

function AboutSection() {
  return (
    <section id="about" className="py-20 px-6 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="О разработчике" light />
        <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={FONT}>
          ООО «МАТ-Лабс» —<br />российский разработчик
        </h2>
        <p className="text-slate-400 text-base mb-12 max-w-2xl">
          Мы создаём промышленное программное обеспечение для предприятий, которым нужна
          надёжная отечественная альтернатива зарубежным системам управления производством.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {ABOUT_ITEMS.map((item) => (
            <div key={item.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                <Icon name={item.icon as Parameters<typeof Icon>[0]["name"]} size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-white mb-2" style={FONT}>{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Server" size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-white" style={FONT}>Технологическая основа</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((s) => (
              <span key={s} className="text-xs bg-white/10 text-slate-300 border border-white/10 px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Эффект ──────────────────────────────────────────────────── */

function EffectsSection() {
  return (
    <section id="effects" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="Что даёт система" />
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
          Измеримый эффект<br />для предприятия
        </h2>
        <p className="text-muted-foreground text-base mb-12 max-w-2xl">
          Оценки основаны на анализе производственных процессов малых и средних предприятий
          станкостроения и опросах технологов и руководителей производства.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {EFFECTS.map((r) => (
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
              Встроенный нейросетевой помощник в каждом модуле
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Интегрированный помощник знает контекст каждого раздела: в модуле проектирования
              консультирует по допускам и материалам, в расчётном — помогает трактовать результаты
              конечно-элементного анализа, в разделе оборудования — расшифровывает коды аварий.
              Снижает порог входа для новых специалистов и ускоряет решение нестандартных задач.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Экспорт ─────────────────────────────────────────────────── */

interface LandingSectionsProps {
  onEnter: () => void;
}

export default function LandingSections({ onEnter }: LandingSectionsProps) {
  return (
    <>
      <ChallengesSection onEnter={onEnter} />
      <ModulesSection />
      <NiocrSection />
      <AboutSection />
      <EffectsSection />
    </>
  );
}