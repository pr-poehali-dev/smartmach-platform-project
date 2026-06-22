/**
 * MachineDrawingTopBar — верхняя полоса редактора чертежей станка МАТ-1:
 * кнопка «назад», имя чертежа, статус автосохранения, кнопки «ИИ-инженер» и «Сохранить».
 * Извлечено 1:1 из MachineDrawingEditor без изменения логики.
 */
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface Props {
  drawingName?: string;
  autoSaveStatus: "idle" | "saving" | "saved";
  showAgent: boolean;
  onBack: () => void;
  onToggleAgent: () => void;
  onSave: () => void;
}

export default function MachineDrawingTopBar({ drawingName, autoSaveStatus, showAgent, onBack, onToggleAgent, onSave }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-[#0f1020]">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
      >
        <Icon name="ChevronLeft" size={14} />
        К списку чертежей
      </button>
      <div className="w-px h-4 bg-gray-700" />
      <span className="text-xs font-semibold text-gray-200 flex-1 truncate">
        {drawingName ?? "Новый чертёж"}
      </span>
      <div className={cn(
        "flex items-center gap-1.5 text-[10px] transition-all",
        autoSaveStatus === "saving" ? "text-yellow-400" :
        autoSaveStatus === "saved"  ? "text-green-400" : "text-gray-600"
      )}>
        {autoSaveStatus === "saving" && <Icon name="Loader2" size={11} className="animate-spin" />}
        {autoSaveStatus === "saved"  && <Icon name="CheckCircle2" size={11} />}
        {autoSaveStatus === "saving" ? "Сохранение…" :
         autoSaveStatus === "saved"  ? "Сохранено"  : ""}
      </div>
      <button
        onClick={onToggleAgent}
        className={cn(
          "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
          showAgent
            ? "bg-violet-500 text-white"
            : "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90"
        )}
      >
        <Icon name="Sparkles" size={13} />
        ИИ-инженер
      </button>
      <button
        onClick={onSave}
        className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
      >
        <Icon name="Save" size={13} />
        Сохранить
      </button>
    </div>
  );
}
