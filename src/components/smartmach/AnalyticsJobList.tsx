import Icon from "@/components/ui/icon";
import { JOB_STATUS, PRIO } from "@/components/smartmach/analytics.types";
import { type Job } from "@/lib/manufacture";

interface Props {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdvance: (job: Job) => void;
  onNavigateToPart?:    () => void;
  onNavigateToProgram?: (programId: number) => void;
}

export default function AnalyticsJobList({
  jobs, loading, error, onRetry, onAdvance,
  onNavigateToPart, onNavigateToProgram,
}: Props) {
  const ORDER = ["new", "cad", "cae", "cam", "cnc", "done"];

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/40">
        <span className="text-sm font-semibold">Задания</span>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground text-sm">
          <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
        </div>
      ) : error ? (
        <div className="p-10 text-center text-red-500 text-sm">
          <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error}
          <button onClick={onRetry} className="mt-2 block mx-auto text-xs underline">Повторить</button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground text-sm">
          <Icon name="ClipboardList" size={36} className="mx-auto mb-2 opacity-20" />Заданий пока нет. Создайте первое.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jobs.map((j) => {
            const scfg = JOB_STATUS[j.status] ?? JOB_STATUS.new;
            const pcfg = PRIO[j.priority] ?? PRIO.normal;
            const canAdvance = ORDER.indexOf(j.status) < ORDER.length - 1;

            return (
              <div key={j.id} className="px-3 sm:px-4 py-3 hover:bg-secondary/20 transition-colors">
                {/* Верхняя строка */}
                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    <Icon name="ClipboardList" size={16} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {j.product_name ?? j.part_name ?? `Задание #${j.id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[
                        j.machine_name,
                        j.assignee_name,
                        j.qty > 1 ? `${j.qty} шт.` : null,
                        j.due_date ? `до ${j.due_date.slice(0, 10)}` : null,
                      ].filter(Boolean).join(" · ")}
                    </div>
                    {/* Статусы на мобиле — под текстом */}
                    <div className="flex items-center gap-1.5 mt-1 sm:hidden flex-wrap">
                      <span className={`text-[11px] font-medium border px-1.5 py-0.5 rounded-full ${scfg.color}`}>
                        {scfg.label}
                      </span>
                      <span className={`text-[11px] font-medium border px-1.5 py-0.5 rounded-full ${pcfg.color}`}>
                        {pcfg.label}
                      </span>
                    </div>
                  </div>
                  {/* Статусы на десктопе */}
                  <span className={`hidden sm:inline text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${pcfg.color}`}>
                    {pcfg.label}
                  </span>
                  {canAdvance && (
                    <button onClick={() => onAdvance(j)}
                      className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90 flex-shrink-0 flex items-center gap-1">
                      <Icon name="ChevronRight" size={12} /><span className="hidden sm:inline">Далее</span>
                    </button>
                  )}
                  <span className={`hidden sm:inline text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${scfg.color}`}>
                    {scfg.label}
                  </span>
                </div>

                {/* Нижняя строка — ссылки на деталь и программу */}
                {(j.part_name || j.program_name) && (
                  <div className="flex items-center gap-2 mt-1.5 pl-11 flex-wrap">
                    {j.part_name && onNavigateToPart && (
                      <button
                        onClick={onNavigateToPart}
                        className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        <Icon name="Box" size={11} />
                        {j.part_name}
                      </button>
                    )}
                    {j.part_name && !onNavigateToPart && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Icon name="Box" size={11} />{j.part_name}
                      </span>
                    )}
                    {j.program_name && onNavigateToProgram && j.program_id && (
                      <>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <button
                          onClick={() => onNavigateToProgram(j.program_id!)}
                          className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                        >
                          <Icon name="FileCode" size={11} />
                          {j.program_name}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}