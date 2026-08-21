import Icon from '@/components/ui/icon';
import {
  API_ENDPOINTS,
  DATA_FLOW,
  KPI,
  LAYERS,
  PROJECT_LINKS,
} from './architecture.data';

/**
 * Схема архитектуры программного комплекса — приложение к заявке на грант.
 *
 * Страница рассчитана на два применения: скриншот в документы и печать
 * в PDF через браузер. Поэтому вёрстка держит фиксированную ширину полосы
 * набора, а служебные элементы скрываются при печати.
 */
export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      {/* Панель действий — не попадает в печать и в скриншот документа */}
      <div className="mx-auto mb-6 flex max-w-[1180px] items-center justify-between gap-3 px-6 print:hidden">
        <a
          href="/hybrid-control"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <Icon name="ArrowLeft" size={15} />
          Панель оператора
        </a>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Icon name="Printer" size={15} />
          Печать или сохранение в PDF
        </button>
      </div>

      <div className="doc-print mx-auto max-w-[1180px] bg-white px-10 py-10 shadow-sm print:max-w-none print:px-0 print:py-0 print:shadow-none">
        {/* ─── Заголовок ─── */}
        <header className="border-b-2 border-foreground pb-5">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>Приложение к заявке · ФСИ «Старт-Станкостроение»</span>
            <span>Направление: производственные технологии для станкостроения</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
            Программный комплекс адаптивного управления
            <br />
            гибридным лазерно-плазменным процессом
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Архитектура программного обеспечения для модернизации существующего
            станочного парка. Комплекс не требует замены оборудования: подбирает
            режимы резки, диагностирует нестабильность процесса и дефекты кромки,
            вырабатывает коррекции в безопасных пределах.
          </p>
        </header>

        {/* ─── Схема слоёв ─── */}
        <section className="mt-7">
          <h2 className="mb-1 text-base font-bold text-foreground">
            1. Уровни программного комплекса
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Данные поднимаются снизу вверх: от датчиков через ядро к оператору.
            Команды идут в обратном направлении.
          </p>

          <div className="space-y-2.5">
            {LAYERS.map((layer, i) => (
              <div key={layer.id}>
                <div
                  className={`rounded-lg border-2 ${layer.tone.border} ${layer.tone.bg} p-3.5`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${layer.tone.badge} text-sm font-bold text-white`}
                    >
                      {layer.index}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2.5">
                        <h3 className={`text-sm font-bold ${layer.tone.text}`}>
                          {layer.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {layer.subtitle}
                        </span>
                      </div>

                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {layer.modules.map((m) => (
                          <div
                            key={m.code}
                            className="rounded border border-black/10 bg-white/80 p-2"
                          >
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className={`rounded px-1 py-0.5 font-mono text-[9px] font-bold text-white ${layer.tone.badge}`}
                              >
                                {m.code}
                              </span>
                              <span className="text-xs font-semibold text-foreground">
                                {m.title}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                              {m.purpose}
                            </p>
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                              {m.tech}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Стрелка двустороннего обмена между слоями */}
                {i < LAYERS.length - 1 && (
                  <div className="flex items-center justify-center gap-2 py-1 text-muted-foreground">
                    <Icon name="ArrowUp" size={13} />
                    <span className="text-[10px] uppercase tracking-wide">
                      данные
                    </span>
                    <span className="text-[10px]">·</span>
                    <span className="text-[10px] uppercase tracking-wide">
                      команды
                    </span>
                    <Icon name="ArrowDown" size={13} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Поток данных ─── */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-1 text-base font-bold text-foreground">
            2. Поток данных при резке стали
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Полный цикл от постановки задачи технологом до фиксации результата
            в журнале.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {DATA_FLOW.map((s) => {
              const layer = LAYERS.find((l) => l.id === s.layer);
              return (
                <div
                  key={s.n}
                  className="flex items-start gap-2.5 rounded-md border border-border bg-card p-2.5"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${layer?.tone.badge ?? 'bg-muted-foreground'}`}
                  >
                    {s.n}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground">
                      {s.actor}
                    </div>
                    <div className="text-[11px] leading-snug text-muted-foreground">
                      {s.action}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── API ─── */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-1 text-base font-bold text-foreground">
            3. Программные интерфейсы
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            REST API с описанием OpenAPI. Комплекс встраивается в существующую
            экосистему предприятия без изменения смежных систем.
          </p>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60">
                <th className="border border-border px-2 py-1.5 text-left font-semibold">
                  Метод
                </th>
                <th className="border border-border px-2 py-1.5 text-left font-semibold">
                  Эндпоинт
                </th>
                <th className="border border-border px-2 py-1.5 text-left font-semibold">
                  Назначение
                </th>
                <th className="border border-border px-2 py-1.5 text-left font-semibold">
                  Потребитель
                </th>
              </tr>
            </thead>
            <tbody>
              {API_ENDPOINTS.map((e) => (
                <tr key={e.path}>
                  <td className="border border-border px-2 py-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-white ${
                        e.method === 'GET' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                    >
                      {e.method}
                    </span>
                  </td>
                  <td className="border border-border px-2 py-1.5 font-mono text-[11px] text-foreground">
                    {e.path}
                  </td>
                  <td className="border border-border px-2 py-1.5 text-muted-foreground">
                    {e.purpose}
                  </td>
                  <td className="border border-border px-2 py-1.5 text-muted-foreground">
                    {e.consumer}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2.5 rounded border border-amber-200 bg-amber-50 p-2 text-[11px] leading-snug text-amber-900">
            <strong>Отказоустойчивость интеграции.</strong> Драйверы промышленных
            протоколов подключаются по мере необходимости: при отсутствии драйвера
            транспорт сообщает о недоступности, а комплекс продолжает работу.
            Это позволяет разворачивать систему поэтапно и демонстрировать её
            без доступа к оборудованию.
          </p>
        </section>

        {/* ─── Результаты ─── */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-1 text-base font-bold text-foreground">
            4. Достигнутые показатели
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Значения получены расчётом на технологической базе комплекса
            для резки Ст3 10 мм и подлежат подтверждению на пилотных установках.
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {KPI.map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
              >
                <div className="text-[11px] font-medium text-emerald-900">
                  {k.label}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground line-through">
                    {k.baseline}
                  </span>
                  <Icon name="ArrowRight" size={11} className="text-emerald-600" />
                  <span className="font-mono text-sm font-bold text-emerald-700">
                    {k.achieved}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                  {k.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Связь с проектами ─── */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="mb-1 text-base font-bold text-foreground">
            5. Связь с действующими проектами заявителя
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Результаты НИОКР используются в трёх направлениях, что расширяет
            рынок сбыта и ускоряет коммерциализацию.
          </p>

          <div className="grid gap-2.5 sm:grid-cols-3">
            {PROJECT_LINKS.map((p) => (
              <div key={p.name} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-1.5">
                  <Icon name="Link2" size={13} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">{p.name}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  {p.role}
                </p>
                <p className="mt-1.5 rounded bg-muted/60 px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
                  {p.module}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-8 border-t border-border pt-3 text-[10px] text-muted-foreground">
          Схема отражает фактическую реализацию программного комплекса.
          Значения показателей получены расчётом на технологической базе
          и подлежат подтверждению в ходе пилотных испытаний.
        </footer>
      </div>
    </div>
  );
}