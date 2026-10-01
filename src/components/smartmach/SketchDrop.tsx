import { useRef, useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { prepareSketch, SketchError } from "@/lib/aipart/sketch";

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

/** Загрузка эскиза: перетаскивание, выбор файла, фото с камеры телефона, вставка из буфера (Ctrl+V) */
export default function SketchDrop({ value, onChange, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = async (file: File | undefined | null) => {
    if (!file || disabled) return;
    setBusy(true); setError(null);
    try { onChange((await prepareSketch(file)).dataUrl); }
    catch (e) { setError(e instanceof SketchError ? e.message : "Не удалось обработать изображение"); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (item) { e.preventDefault(); void take(item.getAsFile()); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  if (value) {
    return (
      <div className="relative rounded-lg border bg-muted/30 p-2 flex items-center gap-3" data-testid="sketch-preview">
        <img src={value} alt="Эскиз детали" className="h-24 w-auto max-w-[200px] rounded border bg-white object-contain" />
        <div className="text-sm flex-1 min-w-0">
          <div className="font-medium flex items-center gap-1.5"><Icon name="ScanLine" size={15} />Эскиз загружен</div>
          <div className="text-xs text-muted-foreground">ИИ-конструктор прочитает виды и размеры. Текст ниже — уточнения к эскизу.</div>
        </div>
        <button className="p-1.5 text-muted-foreground hover:text-destructive" title="Убрать эскиз" disabled={disabled}
          onClick={() => onChange(null)}><Icon name="X" size={16} /></button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button" tabIndex={0} data-testid="sketch-drop"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); }}
        className={`rounded-lg border-2 border-dashed px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors
          ${over ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"} ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        <Icon name={busy ? "Loader2" : "ImagePlus"} size={22} className={`text-muted-foreground shrink-0 ${busy ? "animate-spin" : ""}`} />
        <div className="text-sm">
          <div className="font-medium">Загрузить эскиз детали</div>
          <div className="text-xs text-muted-foreground">Фото рисунка от руки, чертежа или скриншот · перетащите, выберите файл или вставьте Ctrl+V</div>
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" data-testid="sketch-input"
        onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
