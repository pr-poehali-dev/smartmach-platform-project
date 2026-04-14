import { lazy, Suspense, useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { type PartInfo } from "@/components/smartmach/cad.data";

const CadEditor2D = lazy(() => import("@/components/smartmach/CadEditor2D"));
const CadEditor3D = lazy(() => import("@/components/smartmach/CadEditor3D"));

interface Props {
  mode: "2d" | "3d";
  part: PartInfo | null;
}

export default function CadEditorTabs({ mode, part }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* ── выход из fullscreen по Esc ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  /* ── блокировка прокрутки страницы в fullscreen ── */
  useEffect(() => {
    document.body.style.overflow = fullscreen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  return (
    <div
      ref={wrapRef}
      className={fullscreen
        ? "fixed inset-0 z-[9999] flex flex-col bg-[#12131f]"
        : "relative"
        }
      style={fullscreen ? undefined : { height: 660 }}
    >
      {/* Кнопка fullscreen */}
      <button
        onClick={() => setFullscreen((v) => !v)}
        title={fullscreen ? "Свернуть (Esc)" : "На весь экран"}
        className={`absolute z-10 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors
          ${fullscreen
            ? "top-2 right-2 bg-gray-800/90 text-gray-300 hover:bg-gray-700 border border-gray-600"
            : "top-1 right-1 bg-gray-800/70 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700/50"
          }`}
      >
        <Icon name={fullscreen ? "Minimize2" : "Maximize2"} size={13} />
        {fullscreen ? "Свернуть" : "На весь экран"}
      </button>

      <Suspense fallback={
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <Icon name="Loader2" size={22} className="animate-spin mr-2" />
          {mode === "2d" ? "Загрузка редактора…" : "Загрузка 3D…"}
        </div>
      }>
        <div className={fullscreen ? "flex-1 overflow-hidden" : "h-full"}>
          {mode === "2d" ? <CadEditor2D part={part} /> : <CadEditor3D part={part} />}
        </div>
      </Suspense>
    </div>
  );
}
