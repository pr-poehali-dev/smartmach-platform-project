import { useState, useEffect } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { demoStatus, demoLoad, demoClear } from "@/lib/techcard";

interface Props {
  onChanged?: () => void;
  variant?: "default" | "outline";
}

/** «Заполнить примером» / «Убрать пример» — работает только с помеченными записями примера. */
export default function DemoDataButton({ onChanged, variant = "outline" }: Props) {
  const [loaded, setLoaded] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    demoStatus().then((r) => setLoaded(r.loaded)).catch(() => setLoaded(null));
  }, []);

  if (loaded === null) return null;

  const fill = async () => {
    setBusy(true);
    try {
      const r = await demoLoad();
      setLoaded(true);
      toast.success(`Пример загружен: ${r.parts} деталей, ${r.equipment} станков, ${r.programs} программ ЧПУ, техкарта`);
      onChanged?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось загрузить пример"); }
    finally { setBusy(false); }
  };

  const clear = async () => {
    if (!confirm("Удалить данные примера? Ваши собственные записи не затрагиваются.")) return;
    setBusy(true);
    try {
      await demoClear();
      setLoaded(false);
      toast.success("Пример удалён");
      onChanged?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось удалить пример"); }
    finally { setBusy(false); }
  };

  return loaded ? (
    <Button size="sm" variant="ghost" onClick={clear} disabled={busy} title="Удалить данные примера">
      <Icon name={busy ? "Loader2" : "Eraser"} size={15} className={`mr-1.5 ${busy ? "animate-spin" : ""}`} />
      Убрать пример
    </Button>
  ) : (
    <Button size="sm" variant={variant} onClick={fill} disabled={busy}>
      <Icon name={busy ? "Loader2" : "Sparkles"} size={15} className={`mr-1.5 ${busy ? "animate-spin" : ""}`} />
      Заполнить примером
    </Button>
  );
}
