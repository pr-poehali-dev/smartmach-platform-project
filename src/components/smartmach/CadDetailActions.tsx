/**
 * CadDetailActions — кнопки действий над выбранной деталью (2D / 3D / ЧПУ).
 * Извлечено из CadLibraryGrid, устраняет дублирование между мобильным и xl-видом.
 */
import Icon from "@/components/ui/icon";
import { type Part } from "@/lib/manufacture";

interface Props {
  part: Part;
  onOpenEditor: (t: "2d" | "3d") => void;
  onNavigateToCam?: (partId: number) => void;
}

export default function CadDetailActions({ part, onOpenEditor, onNavigateToCam }: Props) {
  return (
    <>
      <button onClick={() => onOpenEditor("2d")} title="Открыть в 2D чертёж"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium">
        <Icon name="PenLine" size={12} />2D
      </button>
      <button onClick={() => onOpenEditor("3d")} title="Открыть в 3D модель"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-medium">
        <Icon name="Box" size={12} />3D
      </button>
      {onNavigateToCam && !part.is_template && (
        <button onClick={() => onNavigateToCam(part.id)} title="Создать ЧПУ-программу для этой детали"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium">
          <Icon name="FileCode" size={12} />ЧПУ
        </button>
      )}
    </>
  );
}
