import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "done";

interface Props {
  step: Step;
  assemblyName: string;
  onBack: () => void;
  onClose: () => void;
}

const STEPS = [
  { id: "upload",  label: "Загрузка файла",  icon: "Upload"      },
  { id: "preview", label: "Проверка данных", icon: "Eye"         },
  { id: "done",    label: "Готово",           icon: "CheckCircle" },
] as const;

const STATES: Step[] = ["upload", "preview", "done"];

export default function AssemblyImportHeader({ step, assemblyName, onBack, onClose }: Props) {
  return (
    <>
      {/* Шапка */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="font-semibold text-foreground text-base">
            Импорт спецификации из Excel / CSV
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Сборка: <span className="font-medium text-foreground">{assemblyName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step === "preview" && (
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-secondary/60 transition-colors">
              <Icon name="ArrowLeft" size={13} />Другой файл
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Прогресс-шаги */}
      <div className="flex items-center gap-0 px-5 py-3 border-b border-border flex-shrink-0 bg-secondary/20">
        {STEPS.map((s, i) => {
          const current = STATES.indexOf(step);
          const mine    = STATES.indexOf(s.id as Step);
          const active  = mine === current;
          const done    = mine < current;
          return (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors",
                active && "text-primary",
                done   && "text-emerald-600",
                !active && !done && "text-muted-foreground"
              )}>
                <Icon
                  name={done ? "Check" : s.icon as Parameters<typeof Icon>[0]["name"]}
                  size={13}
                  className={done ? "text-emerald-500" : active ? "text-primary" : "text-muted-foreground"}
                />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 2 && <Icon name="ChevronRight" size={12} className="text-muted-foreground mx-1" />}
            </div>
          );
        })}
      </div>
    </>
  );
}
