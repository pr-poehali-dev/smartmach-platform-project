import Icon from "@/components/ui/icon";
import { type PartInfo } from "@/components/smartmach/cad.data";
import { type Part } from "@/lib/manufacture";
import CadLibraryPartList from "@/components/smartmach/CadLibraryPartList";
import CadDetailPanelCard from "@/components/smartmach/CadDetailPanelCard";

type LibTab = "templates" | "mine";

interface Props {
  grouped: Record<string, Part[]>;
  selected: Part | null;
  tab: LibTab;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  saving: boolean;
  selectedPartInfo: PartInfo | null;
  onSelect: (p: Part | null) => void;
  onRetry: () => void;
  onPageChange: (p: number) => void;
  onOpenEditor: (t: "2d" | "3d") => void;
  onUseAsBase: (p: Part) => void;
  onStatusChange: (p: Part, status: string) => void;
  onNavigateToCam?: (partId: number) => void;
}

export default function CadLibraryGrid({
  grouped, selected, tab, loading, error,
  page, totalPages,
  onSelect, onRetry, onPageChange, onOpenEditor,
  onUseAsBase, onStatusChange, onNavigateToCam,
}: Props) {
  if (loading) return (
    <div className="py-16 text-center text-muted-foreground text-sm">
      <Icon name="Loader" size={32} className="mx-auto mb-3 opacity-30 animate-spin" />Загрузка…
    </div>
  );

  if (error) return (
    <div className="py-16 text-center text-red-500 text-sm">
      <Icon name="AlertTriangle" size={32} className="mx-auto mb-3" />{error}
      <button onClick={onRetry} className="mt-2 block mx-auto text-xs underline text-muted-foreground">Повторить</button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">

      <CadLibraryPartList
        grouped={grouped}
        selected={selected}
        tab={tab}
        page={page}
        totalPages={totalPages}
        onSelect={onSelect}
        onPageChange={onPageChange}
      />

      <CadDetailPanelCard
        selected={selected}
        tab={tab}
        onSelect={onSelect}
        onOpenEditor={onOpenEditor}
        onUseAsBase={onUseAsBase}
        onStatusChange={onStatusChange}
        onNavigateToCam={onNavigateToCam}
      />

    </div>
  );
}
