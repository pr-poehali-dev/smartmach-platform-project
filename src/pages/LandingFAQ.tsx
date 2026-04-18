import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Icon from "@/components/ui/icon";
import { FONT } from "./landing.data";
import { SectionLabel } from "./LandingHero";

const FAQ_ITEMS = [
  {
    q: "Сколько времени занимает внедрение СмартМаш?",
    a: "Тариф START запускается за 2–4 недели: настройка аккаунта, импорт справочников и обучение команды. Тариф PRO — 1–2 месяца с учётом интеграции с существующими процессами. ENTERPRISE — 2–4 месяца при подключении ERP/SCADA.",
  },
  {
    q: "Нужно ли устанавливать что-то на серверы предприятия?",
    a: "Нет. СмартМаш — полностью облачный SaaS. Работает через браузер на любом устройстве. Никаких установок, серверов и системных администраторов не требуется. Все данные хранятся в защищённом российском дата-центре.",
  },
  {
    q: "Соответствует ли платформа требованиям импортозамещения?",
    a: "Да. СмартМаш разработан ООО «МАТ-Лабс» (Россия), работает на российской инфраструктуре и находится в процессе включения в Реестр российского программного обеспечения Минцифры РФ. Платформа не зависит от иностранных компонентов.",
  },
  {
    q: "Можно ли импортировать данные из существующих систем (1С, Excel, КОМПАС)?",
    a: "Да. Платформа поддерживает импорт спецификаций из Excel и CSV с умным распознаванием заголовков (русский и английский язык). Для 1С и КОМПАС доступна интеграция через API в тарифе PRO и выше.",
  },
  {
    q: "Как обеспечивается безопасность конструкторской документации?",
    a: "Данные шифруются при передаче (TLS 1.3) и хранении. Доступ управляется ролями: конструктор, технолог, руководитель, наблюдатель. Все действия фиксируются в журнале событий с привязкой к пользователю. Данные не передаются третьим лицам.",
  },
  {
    q: "Чем СмартМаш отличается от MS Project или Advanta?",
    a: "MS Project и Advanta — универсальные системы управления проектами. СмартМаш специализирован для машиностроения: содержит BOM (дерево состава изделия), цифровой паспорт детали, управление программами ЧПУ, расчёт себестоимости по изделиям и трассируемость изменений от КД до MES. Это не просто Гант — это полный производственный контур.",
  },
  {
    q: "Есть ли бесплатный пробный период?",
    a: "Да. Демонстрационная версия платформы доступна без регистрации по кнопке «Открыть систему». Для полноценного пилота на вашем производстве свяжитесь с нами — мы предоставим тестовый доступ на 30 дней.",
  },
  {
    q: "Какие результаты уже достигнуты на пилотных проектах?",
    a: "По результатам пилотной эксплуатации (12 деталей, 4 станка с ЧПУ): время согласования конструкторской документации сократилось с 7 до 2 дней (−64%), доля ошибок в управляющих программах снизилась на 38%. Текущая стадия технологической готовности — TRL 5.",
  },
];

// JSON-LD для Google Rich Results (FAQ)
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": FAQ_ITEMS.map(item => ({
    "@type": "Question",
    "name": item.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.a,
    },
  })),
};

export default function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      {/* JSON-LD — инжектируется в <head> через react-helmet */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(FAQ_JSON_LD)}
        </script>
      </Helmet>

      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="Частые вопросы" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground" style={FONT}>
              Всё, что важно знать
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Ответы на вопросы, которые чаще всего задают руководители предприятий
            </p>
          </div>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={i}
                  className="border border-border rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-foreground text-sm leading-snug" style={FONT}>
                      {item.q}
                    </span>
                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isOpen ? "bg-primary text-primary-foreground rotate-45" : "bg-secondary text-muted-foreground"
                    }`}>
                      <Icon name="Plus" size={13} />
                    </div>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96" : "max-h-0"}`}>
                    <div className="px-5 pb-5 pt-1">
                      <p className="text-muted-foreground text-sm leading-relaxed" style={FONT}>
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA под FAQ */}
          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Не нашли ответ? Напишите нам напрямую
            </p>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 border border-border text-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary/60 transition-colors"
              style={FONT}
            >
              <Icon name="MessageCircle" size={15} />
              Задать вопрос
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
