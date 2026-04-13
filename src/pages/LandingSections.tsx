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
        <SectionLabel text="Какие задачи решает система" />
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
          Типичные трудности<br />на производственном предприятии
        </h2>
        <p className="text-muted-foreground text-base mb-10 max-w-2xl">
          Малые и средние предприятия станкостроения работают в условиях, где конструктор,
          технолог и цех используют несовместимые инструменты. Это приводит к потерям времени,
          браку и невозможности роста.
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
              «СмартМаш» решает все эти задачи в единой системе — от эскиза до выхода готовой детали со станка.
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
      <AboutSection />
      <EffectsSection />
    </>
  );
}
