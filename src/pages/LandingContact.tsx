import { useState, FormEvent } from "react";
import Icon from "@/components/ui/icon";
import { FONT } from "./landing.data";
import { apiPost } from "@/lib/api";
import { SectionLabel } from "./LandingHero";

/* ── ContactForm ─────────────────────────────────────────────── */

function ContactForm() {
  const [form, setForm] = useState({ name: "", org: "", phone: "", question: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await apiPost("leads", form);
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

          {/* Левая колонка */}
          <div>
            <SectionLabel text="Связаться с нами" />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight" style={FONT}>
              Обсудим внедрение<br />на вашем предприятии
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">
              Если вы руководитель производства, технический директор или отвечаете за цифровизацию —
              оставьте заявку. Мы проведём демонстрацию системы и обсудим, как она решает задачи
              именно вашего предприятия.
            </p>

            <div className="space-y-4 mb-10">
              {[
                "Бесплатная демонстрация системы в вашем браузере",
                "Консультация по внедрению в технологический процесс",
                "Подготовка технического задания под ваше предприятие",
                "Поддержка на этапе запуска и обучение персонала",
              ].map(text => (
                <div key={text} className="flex items-start gap-3">
                  <Icon name="CheckCircle" size={18} className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{text}</span>
                </div>
              ))}
            </div>

            <div className="p-5 bg-white border border-border rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="Building2" size={15} className="text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground" style={FONT}>ООО «МАТ-Лабс»</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Российский разработчик промышленного программного обеспечения.
                Создаём цифровые инструменты для производственных предприятий.
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
                <h3 className="text-lg font-bold text-foreground mb-2" style={FONT}>Заявка получена!</h3>
                <p className="text-sm text-muted-foreground mb-6">Мы свяжемся с вами в течение одного рабочего дня.</p>
                <button onClick={() => setStatus("idle")} className="text-sm text-primary underline hover:no-underline">
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-foreground mb-6" style={FONT}>Оставить заявку</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide" style={FONT}>Ваше имя *</label>
                    <input required value={form.name} onChange={e => f("name", e.target.value)}
                      placeholder="Иван Петрович Сидоров" className={inputCls} style={FONT} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide" style={FONT}>Организация</label>
                    <input value={form.org} onChange={e => f("org", e.target.value)}
                      placeholder="ООО «Завод Пример»" className={inputCls} style={FONT} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide" style={FONT}>Телефон или электронная почта *</label>
                    <input required value={form.phone} onChange={e => f("phone", e.target.value)}
                      placeholder="+7 (900) 000-00-00 или email@example.ru" className={inputCls} style={FONT} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide" style={FONT}>Вопрос или комментарий</label>
                    <textarea value={form.question} onChange={e => f("question", e.target.value)}
                      placeholder="Опишите вашу задачу или задайте вопрос…" rows={3}
                      className={`${inputCls} resize-none`} style={FONT} />
                  </div>
                  {status === "err" && (
                    <p className="text-sm text-red-500 flex items-center gap-2">
                      <Icon name="AlertTriangle" size={14} />
                      Не удалось отправить. Попробуйте ещё раз.
                    </p>
                  )}
                  <button type="submit" disabled={status === "sending"}
                    className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    style={FONT}>
                    {status === "sending" ? (
                      <><Icon name="Loader" size={16} className="animate-spin" />Отправляем…</>
                    ) : (
                      <><Icon name="Send" size={16} />Отправить заявку</>
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

/* ── CtaSection ──────────────────────────────────────────────── */

function CtaSection({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="py-24 px-6 bg-primary text-primary-foreground">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={FONT}>
          Посмотрите систему в работе
        </h2>
        <p className="text-primary-foreground/70 text-base mb-8 leading-relaxed">
          Демонстрационная версия полностью функциональна: можно добавлять детали,
          запускать расчёты, управлять станками и создавать производственные задания.
        </p>
        <button onClick={onEnter}
          className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg"
          style={FONT}>
          <Icon name="Play" size={16} />
          Открыть «СмартМаш»
        </button>
        <p className="mt-5 text-xs text-primary-foreground/50">
          Разработано ООО «МАТ-Лабс» · Российское программное обеспечение для промышленности
        </p>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-border bg-white">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <Icon name="Settings" size={12} className="text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-sm text-foreground" style={FONT}>СмартМаш</span>
            <span className="text-xs text-muted-foreground ml-2">· продукт ООО «МАТ-Лабс»</span>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-xs text-muted-foreground">
            Российская цифровая система управления производством для станкостроения
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ── Экспорт ─────────────────────────────────────────────────── */

interface LandingContactProps {
  onEnter: () => void;
}

export default function LandingContact({ onEnter }: LandingContactProps) {
  return (
    <>
      <ContactForm />
      <CtaSection onEnter={onEnter} />
      <Footer />
    </>
  );
}