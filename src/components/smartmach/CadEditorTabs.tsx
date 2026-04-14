import { lazy, Suspense } from "react";
import Icon from "@/components/ui/icon";
import { type PartInfo } from "@/components/smartmach/cad.data";

const CadEditor2D = lazy(() => import("@/components/smartmach/CadEditor2D"));
const CadEditor3D = lazy(() => import("@/components/smartmach/CadEditor3D"));

interface Props {
  mode: "2d" | "3d";
  part: PartInfo | null;
}

export default function CadEditorTabs({ mode, part }: Props) {
  return (
    <div style={{ height: 660 }}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Icon name="Loader2" size={22} className="animate-spin mr-2" />
          {mode === "2d" ? "Загрузка редактора…" : "Загрузка 3D…"}
        </div>
      }>
        {mode === "2d" ? <CadEditor2D part={part} /> : <CadEditor3D part={part} />}
      </Suspense>
    </div>
  );
}
