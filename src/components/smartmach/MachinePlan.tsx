import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { MACHINE_PLANS } from "./machine.data";

const STATUS_CFG = {
  done:    { label: "Завершён",  color: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500"  },
  active:  { label: "В работе",  color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500"   },
  pending: { label: "Ожидание", color: "bg-slate-100 text-slate-500 border-slate-200",  dot: "bg-slate-300"  },
};

export default function MachinePlan() {
  const doneCount  = MACHINE_PLANS.filter((p) => p.status === "done").length;
  const totalCount = MACHINE_PLANS.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Общий прогресс */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Общий прогресс реализации</div>
            <div className="text-xs text-muted-foreground mt-0.5">Завершено {doneCount} из {totalCount} этапов</div>
          </div>
          <div className="text-3xl font-bold text-primary">{pct}%</div>
        </div>
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Этапы */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="ListOrdered" size={15} className="text-primary" />
          <span className="text-sm font-semibold">План реализации</span>
        </div>

        <div className="p-5 space-y-4">
          {MACHINE_PLANS.map((step, i) => {
            const cfg = STATUS_CFG[step.status as keyof typeof STATUS_CFG];
            const isLast = i === MACHINE_PLANS.length - 1;

            return (
              <div key={step.phase} className="flex gap-4">
                {/* Линия-таймлайн */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                    step.status === "done"
                      ? "bg-green-50 border-green-200"
                      : step.status === "active"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-slate-50 border-slate-200"
                  )}>
                    <Icon
                      name={step.status === "done" ? "CheckCheck" : step.icon as Parameters<typeof Icon>[0]["name"]}
                      size={16}
                      className={cn(
                        step.status === "done" ? "text-green-600" :
                        step.status === "active" ? "text-blue-600" : "text-slate-400"
                      )}
                    />
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 flex-1 mt-1 min-h-4",
                      step.status === "done" ? "bg-green-200" : "bg-border"
                    )} />
                  )}
                </div>

                {/* Контент */}
                <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Этап {step.phase}</span>
                      <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.color)}>
                        {cfg.label}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon name="Clock" size={11} />
                        {step.duration}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Целевые результаты */}
      <div className="bg-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Target" size={16} className="text-slate-400" />
          <span className="text-sm font-semibold">Ожидаемые результаты</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "Снижение стоимости многофункционального станка на 30–40% относительно аналогов",
            "Сокращение времени переналадки между операциями за счёт модульности",
            "Расширение возможностей малых мастерских без закупки нескольких станков",
            "Простота обучения операторов — интуитивный интерфейс ЧПУ",
          ].map((r) => (
            <div key={r} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="Check" size={11} className="text-primary" />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
