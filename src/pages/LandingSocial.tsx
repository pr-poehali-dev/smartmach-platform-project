import Icon from "@/components/ui/icon";
import { FONT } from "./landing.data";
import { SectionLabel } from "./LandingHero";

/* ── Социальные доказательства ───────────────────────────────── */

function TrustSection() {
  const stats = [
    { value: "TRL 5", label: "готовность технологии по международной шкале" },
    { value: "−64%", label: "сокращение времени согласования КД в пилоте" },
    { value: "−38%", label: "снижение ошибок в управляющих программах" },
    { value: "4 станка", label: "подключено к контуру мониторинга в пилоте" },
  ];

  const quotes = [
    {
      text: "Раньше технолог вручную переносил расчётные ограничения из CAE в управляющую программу. СмартМаш делает это автоматически — это реально другой уровень.",
      name: "Главный технолог",
      company: "Пилотное предприятие, станкостроение",
      initials: "ГТ",
    },
    {
      text: "Согласование КД занимало 7 рабочих дней. После подключения системы — 2 дня. Паспорт детали теперь всегда актуален, не надо звонить конструктору.",
      name: "Начальник производства",
      company: "Участник пилотной эксплуатации",
      initials: "НП",
    },
    {
      text: "Наконец можно проследить весь путь детали: от конструкторского решения до операции на конкретном станке. Раньше это было невозможно в принципе.",
      name: "Директор по качеству",
      company: "Машиностроительный завод",
      initials: "ДК",
    },
  ];

  return (
    <section id="trust" className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="Результаты и отзывы" />
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
          Реальные цифры<br />из пилотной эксплуатации
        </h2>
        <p className="text-muted-foreground text-base mb-12 max-w-2xl">
          Данные получены в ходе пилотного внедрения на производственном предприятии станкостроения.
          Обработано 12 деталей, 4 станка подключено к системе мониторинга.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((s) => (
            <div key={s.value} className="bg-white rounded-2xl border border-border p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-2" style={FONT}>{s.value}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {quotes.map((q) => (
            <div key={q.name} className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4">
              <Icon name="Quote" size={20} className="text-primary/30" />
              <p className="text-sm text-foreground leading-relaxed flex-1">«{q.text}»</p>
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{q.initials}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground" style={FONT}>{q.name}</div>
                  <div className="text-xs text-muted-foreground">{q.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Кейсы ───────────────────────────────────────────────────── */

function CasesSection({ onContact }: { onContact: () => void }) {
  const cases = [
    {
      tag: "Станкостроение",
      tagColor: "bg-blue-50 text-blue-700",
      title: "Сокращение цикла подготовки производства на серийной детали",
      problem: "Время согласования КД занимало 7 дней: 3 отдела, ручная передача файлов, потери версий.",
      solution: "Подключили контур КД→CAE→CAM с цифровым паспортом и автоматической валидацией версий.",
      results: [
        { value: "−64%", label: "время согласования КД" },
        { value: "с 7 до 2", label: "дней на согласование" },
        { value: "−38%", label: "ошибки в УП" },
      ],
      icon: "Box",
      color: "border-blue-100",
    },
    {
      tag: "Машиностроение",
      tagColor: "bg-purple-50 text-purple-700",
      title: "Устранение потерь при передаче данных CAE→CAM",
      problem: "Технолог вручную переносил расчётные ограничения из прочностных расчётов в управляющие программы. Ошибки выявлялись при пробном запуске станка.",
      solution: "CAE и CAM объединены в единый контур: ограничения из расчётов автоматически становятся параметрами УП.",
      results: [
        { value: "0", label: "ручных передач данных CAE→CAM" },
        { value: "100%", label: "трассируемость от КД до МЕС" },
        { value: "до 40%", label: "сокращение подготовки производства" },
      ],
      icon: "FlaskConical",
      color: "border-purple-100",
    },
    {
      tag: "Приборостроение",
      tagColor: "bg-green-50 text-green-700",
      title: "Мониторинг станков и контроль исполнения заданий",
      problem: "Производственные задания существовали отдельно от документации. Статус изготовления детали никак не отражался в жизненном цикле изделия.",
      solution: "Контур MES интегрирован с цифровым паспортом: телеметрия станков пишется в паспорт детали в реальном времени.",
      results: [
        { value: "4", label: "станка в контуре мониторинга" },
        { value: "в 3 раза", label: "быстрее согласование изменений" },
        { value: "TRL 5", label: "подтверждённый уровень готовности" },
      ],
      icon: "Radio",
      color: "border-green-100",
    },
  ];

  return (
    <section id="cases" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="Кейсы" />
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
          Как СмартМаш решает<br />задачи производства
        </h2>
        <p className="text-muted-foreground text-base mb-12 max-w-2xl">
          Три сценария из пилотной эксплуатации — проблема, решение и измеримый результат.
        </p>

        <div className="space-y-6">
          {cases.map((c, i) => (
            <div key={i} className={`bg-white rounded-2xl border-2 p-6 sm:p-8 ${c.color}`}>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.tagColor}`}>{c.tag}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4" style={FONT}>{c.title}</h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="X" size={10} className="text-red-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">Проблема</div>
                        <p className="text-sm text-foreground leading-relaxed">{c.problem}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="Check" size={10} className="text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">Решение</div>
                        <p className="text-sm text-foreground leading-relaxed">{c.solution}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:w-56 flex flex-col gap-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Результат</div>
                  {c.results.map((r) => (
                    <div key={r.label} className="bg-slate-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-primary" style={FONT}>{r.value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onContact}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            style={FONT}
          >
            Обсудить ваш сценарий внедрения
            <Icon name="ArrowRight" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Экспорт ─────────────────────────────────────────────────── */

interface LandingSocialProps {
  onContact: () => void;
}

export default function LandingSocial({ onContact }: LandingSocialProps) {
  return (
    <>
      <TrustSection />
      <CasesSection onContact={onContact} />
    </>
  );
}
