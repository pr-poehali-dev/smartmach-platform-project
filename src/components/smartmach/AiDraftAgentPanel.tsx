/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AiDraftAgentPanel — панель ИИ-агента-инженера внутри редактора чертежей.
 * Пользователь описывает деталь словами — агент генерирует готовый чертёж
 * на холсте: контур, осевые, размеры по ГОСТ.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAiDraftAgent } from "@/components/smartmach/useAiDraftAgent";
import { renderAiDraft, type AiDraft } from "@/components/smartmach/aiDraftSchema";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";

interface Props {
  fabricRef: React.MutableRefObject<any>;
  paperSize: string;
  onApplied: (draft: AiDraft) => void; // после рендера (для метаданных рамки)
  onClose: () => void;
  saveHistory: () => void;
}

const EXAMPLES = [
  "Вал ступенчатый ∅40 и ∅30, общая длина 200, фаски 2×45°",
  "Фланец круглый ∅120, толщина 15, 4 отверстия ∅12 по окружности ∅90",
  "Втулка ∅50 наружный, ∅30 внутренний, длина 60",
  "Пластина 100×60, толщина 8, отверстие ∅20 в центре, скругления R10",
  "Зубчатое колесо ∅80, ширина 20, посадочное отверстие ∅25",
];

export default function AiDraftAgentPanel({ fabricRef, paperSize, onApplied, onClose, saveHistory }: Props) {
  const { draft, isLoading } = useAiDraftAgent();
  const [input, setInput] = useState("");
  const [lastObjects, setLastObjects] = useState<any[]>([]);
  const [lastDraft, setLastDraft] = useState<AiDraft | null>(null);

  async function handleGenerate(text: string) {
    const desc = text.trim();
    if (!desc || isLoading) return;

    const tid = toast.loading("Агент проектирует чертёж…");
    const res = await draft(desc);

    if (!res.success || !res.draft) {
      toast.error(res.error ?? "Не удалось спроектировать", { id: tid });
      return;
    }

    const fc = fabricRef.current;
    if (!fc) { toast.error("Холст не готов", { id: tid }); return; }

    // Расчёт рабочего поля и масштаба (как в ГОСТ-рамке)
    const [pw, ph] = PAPER_SIZES[paperSize] ?? [1122, 794];
    const isVert = ph > pw;
    const mX = isVert ? ph / 297 : pw / 297;   // px на мм
    const originX = 20 * mX;                     // левое поле 20мм
    const originY = 5 * mX;                      // верхнее поле 5мм

    try {
      const fabricModule = await import("fabric");
      // Удаляем предыдущую генерацию, если перегенерируем
      if (lastObjects.length) {
        lastObjects.forEach((o) => fc.remove(o));
      }
      const added = await renderAiDraft(fabricModule, fc, res.draft, originX, originY, mX);
      setLastObjects(added);
      setLastDraft(res.draft);
      saveHistory();
      onApplied(res.draft);
      toast.success(`Готово: ${res.draft.title} · ${added.length} элементов`, { id: tid });
    } catch {
      toast.error("Ошибка отрисовки чертежа", { id: tid });
    }
  }

  function handleUndo() {
    const fc = fabricRef.current;
    if (!fc || !lastObjects.length) return;
    lastObjects.forEach((o) => fc.remove(o));
    fc.renderAll();
    setLastObjects([]);
    setLastDraft(null);
    saveHistory();
    toast("Сгенерированный чертёж убран");
  }

  return (
    <div className="absolute top-3 right-3 z-30 w-[340px] max-w-[calc(100%-24px)] bg-[#161827] border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: "calc(100% - 24px)" }}>

      {/* Шапка */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-violet-600/20 to-blue-600/20">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <Icon name="Sparkles" size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            ИИ-инженер
            <span className="text-[9px] font-bold bg-violet-500/30 text-violet-200 px-1.5 py-0.5 rounded">BETA</span>
          </div>
          <div className="text-[11px] text-violet-200/70">Чертёж по описанию · автоматически</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <Icon name="X" size={16} />
        </button>
      </div>

      {/* Тело */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="text-xs text-gray-400 leading-relaxed">
          Опишите деталь — агент спроектирует чертёж с контуром, осевыми и размерами по ГОСТ
          прямо на холсте.
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate(input); }}
          placeholder="Например: вал ступенчатый ∅40 и ∅30, длина 200, две проточки, фаски 2×45°"
          rows={3}
          disabled={isLoading}
          className="w-full bg-[#0f1020] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/60 resize-none disabled:opacity-60"
        />

        <button
          onClick={() => handleGenerate(input)}
          disabled={isLoading || !input.trim()}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition-opacity"
        >
          {isLoading
            ? <><Icon name="Loader" size={15} className="animate-spin" />Проектирую…</>
            : <><Icon name="Wand2" size={15} />Спроектировать чертёж</>}
        </button>

        {lastDraft && !isLoading && (
          <div className="bg-[#0f1020] border border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Icon name="CircleCheck" size={14} className="text-green-400" />
              <span className="text-sm font-semibold text-white truncate">{lastDraft.title}</span>
            </div>
            {lastDraft.material && (
              <div className="text-[11px] text-gray-400">Материал: {lastDraft.material}</div>
            )}
            {lastDraft.notes && lastDraft.notes.length > 0 && (
              <ul className="text-[11px] text-gray-400 space-y-0.5 list-disc list-inside">
                {lastDraft.notes.slice(0, 4).map((n, i) => <li key={i} className="truncate">{n}</li>)}
              </ul>
            )}
            <button onClick={handleUndo}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 py-1.5 rounded-lg transition-colors">
              <Icon name="Undo2" size={12} />Убрать сгенерированное
            </button>
          </div>
        )}

        {/* Примеры */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Примеры запросов</div>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setInput(ex); }}
              disabled={isLoading}
              className={cn(
                "w-full text-left text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-2 text-gray-300 transition-colors leading-snug disabled:opacity-50"
              )}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-white/10 bg-[#0f1020]">
        <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
          <Icon name="Info" size={11} />
          Проверяйте результат — ИИ может ошибаться в размерах
        </div>
      </div>
    </div>
  );
}
