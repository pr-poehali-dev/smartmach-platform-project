import Icon from "@/components/ui/icon";
import { FONT } from "./landing.data";
import { SectionLabel } from "./LandingHero";

const PLANS = [
  {
    id: "start",
    badge: "START",
    target: "Для небольших цехов и пилотов",
    color: "border-slate-200",
    badgeColor: "bg-slate-100 text-slate-600",
    highlight: false,
    price: "95 000",
    onetime: "450 000",
    launch: "2–4 недели",
    limits: "до 5 станков, до 10 пользователей",
    support: "8/5, 1 рабочий чат",
    modules: ["КПД", "УПО", "ЖЦИ", "МСП (базовый мониторинг)"],
    features: ["Цифровой паспорт детали", "Версии КД", "Хранение УП", "Базовые отчёты"],
  },
  {
    id: "pro",
    badge: "PRO",
    target: "Для средних производств",
    color: "border-primary",
    badgeColor: "bg-primary text-primary-foreground",
    highlight: true,
    price: "240 000",
    onetime: "1 200 000",
    launch: "1–2 месяца",
    limits: "до 20 станков, до 50 пользователей",
    support: "8/5 + обучение (до 2 смен)",
    modules: ["КПД", "РПК", "УПО", "ЖЦИ", "МСП", "СПЗ"],
    features: ["Расширенная аналитика", "Контроль загрузки", "Трассируемость", "Роли доступа"],
  },
  {
    id: "enterprise",
    badge: "ENTERPRISE",
    target: "Для крупных заводов / холдингов",
    color: "border-slate-700",
    badgeColor: "bg-slate-900 text-white",
    highlight: false,
    price: "490 000",
    onetime: "3 500 000",
    launch: "2–4 месяца",
    limits: "от 21 станка, пользователей без лимита",
    support: "24/7, персональный менеджер",
    modules: ["Все модули", "ERP/PLM/MES/SCADA интеграции", "SLA"],
    features: ["Кастомные отчёты", "BI-выгрузка", "API", "Выделенный контур"],
  },
];

const ADD_ONS = [
  { icon: "Plug", title: "Интеграции с ERP/PLM/MES", price: "от 300 000 ₽", note: "разово" },
  { icon: "GraduationCap", title: "Обучение и сертификация", price: "от 120 000 ₽", note: "разово" },
  { icon: "BarChart3", title: "Расширенная аналитика", price: "от 60 000 ₽", note: "в месяц" },
];

interface LandingPricingProps {
  onContact: () => void;
}

export default function LandingPricing({ onContact }: LandingPricingProps) {
  return (
    <section id="pricing" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <SectionLabel text="Тарифы" />
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={FONT}>
          Выберите тариф<br />под масштаб производства
        </h2>
        <p className="text-muted-foreground text-base mb-12 max-w-2xl">
          Фиксированная подписка + разовое внедрение. Все тарифы включают обновления платформы
          и доступ к новым версиям модулей без дополнительной оплаты.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col ${plan.color} ${plan.highlight ? "shadow-lg" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full" style={FONT}>
                    Популярный
                  </span>
                </div>
              )}

              <div className="mb-5">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${plan.badgeColor}`} style={FONT}>
                  {plan.badge}
                </span>
                <p className="text-sm text-muted-foreground mt-2">{plan.target}</p>
              </div>

              <div className="mb-5 pb-5 border-b border-border">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground" style={FONT}>{plan.price}</span>
                  <span className="text-sm text-muted-foreground">₽/мес</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  + {plan.onetime} ₽ внедрение · запуск {plan.launch}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Icon name="Server" size={12} />
                  <span>{plan.limits}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon name="Headphones" size={12} />
                  <span>{plan.support}</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-bold text-muted-foreground tracking-wider mb-2">МОДУЛИ</div>
                <div className="flex flex-wrap gap-1">
                  {plan.modules.map((m) => (
                    <span key={m} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{m}</span>
                  ))}
                </div>
              </div>

              <div className="mb-6 flex-1">
                <div className="text-xs font-bold text-muted-foreground tracking-wider mb-2">ФУНКЦИИ</div>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <Icon name="Check" size={13} className="text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onContact}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${plan.highlight ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-slate-100 text-foreground hover:bg-slate-200"}`}
                style={FONT}
              >
                Обсудить внедрение
              </button>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Plus" size={16} className="text-muted-foreground" />
            <span className="text-sm font-bold text-foreground" style={FONT}>Дополнительные опции</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ADD_ONS.map((a) => (
              <div key={a.title} className="flex items-start gap-3 bg-white rounded-xl border border-border p-4">
                <div className="w-8 h-8 bg-primary/8 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name={a.icon as Parameters<typeof Icon>[0]["name"]} size={15} className="text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{a.title}</div>
                  <div className="text-sm font-bold text-primary">{a.price}</div>
                  <div className="text-xs text-muted-foreground">{a.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
