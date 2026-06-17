import Icon from "@/components/ui/icon";
import { FONT, EFFECTS, ABOUT_ITEMS, TECH_STACK } from "./landing.data";
import { SectionLabel } from "./LandingHero";

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

/* ── Как работает внедрение ──────────────────────────────────── */

function OnboardingSection({ onContact }: { onContact: () => void }) {
  const steps = [
    {
      num: "01",
      icon: "MessageSquare",
      title: "Консультация и диагностика",
      desc: "Проводим встречу с технологами и руководством. Анализируем текущий процесс: как передаются данные между КД, CAE, CAM и производством, где возникают потери.",
      duration: "1–2 дня",
    },
    {
      num: "02",
      icon: "FileSearch",
      title: "Аудит и техническое задание",
      desc: "Описываем существующий процесс «как есть» и проектируем целевой «как будет». Фиксируем требования к интеграциям с вашими системами.",
      duration: "3–5 дней",
    },
    {
      num: "03",
      icon: "Settings",
      title: "Настройка и конфигурация",
      desc: "Разворачиваем систему, настраиваем под ваши станки и номенклатуру деталей. Загружаем справочники оборудования и материалов.",
      duration: "1–3 недели",
    },
    {
      num: "04",
      icon: "FlaskConical",
      title: "Пилотный запуск",
      desc: "Запускаем систему на ограниченном наборе деталей и станков. Проверяем работу контуров КД→CAE→CAM→MES, фиксируем результаты.",
      duration: "2–4 недели",
    },
    {
      num: "05",
      icon: "GraduationCap",
      title: "Обучение персонала",
      desc: "Проводим обучение конструкторов, технологов и операторов. Предоставляем инструкции и видеоматериалы. Сопровождаем первые самостоятельные работы.",
      duration: "1–2 смены",
    },
    {
      num: "06",
      icon: "Rocket",
      title: "Промышленная эксплуатация",
      desc: "Переводим систему в рабочий режим на весь объём производства. Обеспечиваем поддержку, обновления и развитие по мере роста задач.",
      duration: "постоянно",
    },
  ];

  return (
    <section id="onboarding" className="py-20 px-6 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="Процесс внедрения" light />
        <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={FONT}>
          Как проходит внедрение<br />СмартМаш
        </h2>
        <p className="text-slate-400 text-base mb-12 max-w-2xl">
          Структурированный процесс от диагностики до промышленной эксплуатации.
          Сроки зависят от тарифа и масштаба производства.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {steps.map((step) => (
            <div key={step.num} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Icon name={step.icon as Parameters<typeof Icon>[0]["name"]} size={18} className="text-primary" />
                </div>
                <span className="text-3xl font-bold text-white/10" style={FONT}>{step.num}</span>
              </div>
              <h3 className="font-bold text-white mb-2 text-sm" style={FONT}>{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{step.desc}</p>
              <div className="flex items-center gap-1.5">
                <Icon name="Clock" size={12} className="text-slate-500" />
                <span className="text-xs text-slate-500">{step.duration}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-bold text-white mb-1" style={FONT}>Готовы обсудить внедрение?</div>
            <div className="text-sm text-slate-400">Расскажите о вашем производстве — подберём оптимальный план</div>
          </div>
          <button
            onClick={onContact}
            className="flex-shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            style={FONT}
          >
            Получить план внедрения
            <Icon name="ArrowRight" size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Экспорт ─────────────────────────────────────────────────── */

interface LandingCompanyProps {
  onContact: () => void;
}

export default function LandingCompany({ onContact }: LandingCompanyProps) {
  return (
    <>
      <AboutSection />
      <EffectsSection />
      <OnboardingSection onContact={onContact} />
    </>
  );
}
