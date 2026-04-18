import Icon from "@/components/ui/icon";

interface Props {
  doneCount: number;
  replace: boolean;
  onClose: () => void;
  onOpenTree: () => void;
}

export default function AssemblyImportDone({ doneCount, replace, onClose, onOpenTree }: Props) {
  return (
    <div className="p-10 flex flex-col items-center justify-center text-center gap-5">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
        <Icon name="CheckCircle" size={40} className="text-emerald-500" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-foreground">Импорт завершён!</h3>
        <p className="text-muted-foreground mt-1">
          Создано <strong className="text-foreground">{doneCount}</strong> узлов
          {replace ? " (дерево было очищено перед импортом)" : ""}
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose}
          className="px-5 py-2.5 border border-border rounded-xl text-sm hover:bg-secondary/60 transition-colors font-medium">
          Закрыть
        </button>
        <button onClick={onOpenTree}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm hover:opacity-90 transition-opacity font-medium flex items-center gap-2">
          <Icon name="GitBranch" size={15} />
          Открыть дерево
        </button>
      </div>
    </div>
  );
}
