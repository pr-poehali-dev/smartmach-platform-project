import Icon from "@/components/ui/icon";
import { STATUS_CFG, NEXT_LABEL } from "@/components/smartmach/cam.data";
import { type Program } from "@/lib/manufacture";

interface Props {
  program: Program;
  onClose: () => void;
  onAdvance: (p: Program) => void;
  onNavigateToJob?: (opts: { partId?: number; programId?: number }) => void;
}

export default function CamProgramDetail({ program, onClose, onAdvance, onNavigateToJob }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">{program.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[program.part_name, program.machine_name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium border px-2.5 py-1 rounded-full ${STATUS_CFG[program.status]?.color ?? ""}`}>
              {STATUS_CFG[program.status]?.label}
            </span>
            <button onClick={onClose}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Key params grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: "Clock",       label: "Время",    value: program.est_time },
              { icon: "User",        label: "Автор",    value: program.author_name },
              { icon: "Calendar",    label: "Создана",  value: program.created_at  ? new Date(program.created_at).toLocaleDateString("ru")  : null },
              { icon: "Play",        label: "Запущена", value: program.started_at  ? new Date(program.started_at).toLocaleDateString("ru")  : null },
              { icon: "CheckCircle", label: "Завершена",value: program.finished_at ? new Date(program.finished_at).toLocaleDateString("ru") : null },
            ].filter((r) => r.value).map((r) => (
              <div key={r.label} className="bg-secondary/40 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Icon name={r.icon as Parameters<typeof Icon>[0]["name"]} size={12} />{r.label}
                </div>
                <p className="text-sm font-medium">{r.value}</p>
              </div>
            ))}
          </div>

          {/* G-code preview */}
          {program.code && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">G-код</p>
              <pre className="bg-gray-950 text-green-400 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-48 leading-relaxed">
                {program.code}
              </pre>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {onNavigateToJob && (
              <button
                onClick={() => {
                  onNavigateToJob({
                    programId: program.id,
                    partId: program.part_id ?? undefined,
                  });
                  onClose();
                }}
                className="flex items-center gap-2 border border-orange-300 text-orange-700 bg-orange-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
                <Icon name="ClipboardList" size={15} />
                Создать задание
              </button>
            )}
            {NEXT_LABEL[program.status] && (
              <button onClick={() => { onAdvance(program); onClose(); }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 ml-auto">
                <Icon name="ArrowRight" size={15} />
                {NEXT_LABEL[program.status]}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}