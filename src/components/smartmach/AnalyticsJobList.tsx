import Icon from "@/components/ui/icon";
import { JOB_STATUS, PRIO } from "@/components/smartmach/analytics.types";
import { type Job } from "@/lib/manufacture";

interface Props {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdvance: (job: Job) => void;
}

export default function AnalyticsJobList({ jobs, loading, error, onRetry, onAdvance }: Props) {
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
              <div key={j.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="ClipboardList" size={16} className="text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {j.product_name ?? j.part_name ?? `Задание #${j.id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[j.part_name, j.machine_name, j.assignee_name,
                      j.qty > 1 ? `${j.qty} шт.` : null,
                      j.due_date ? `до ${j.due_date.slice(0, 10)}` : null,
                    ].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${pcfg.color}`}>
                  {pcfg.label}
                </span>
                {canAdvance && (
                  <button onClick={() => onAdvance(j)}
                    className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90 flex-shrink-0 flex items-center gap-1">
                    <Icon name="ChevronRight" size={12} />Далее
                  </button>
                )}
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full flex-shrink-0 ${scfg.color}`}>
                  {scfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
