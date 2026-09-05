/**
 * DrawingRevisions — история версий чертежа по ГОСТ 2.503.
 * Показывает все ревизии, позволяет сравнить две и откатиться к любой.
 */
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { apiGet, apiPost } from "@/lib/api";
import { toast } from "sonner";

export interface Revision {
  id: number;
  rev_no: number;
  rev_letter: string | null;
  name: string;
  paper_size: string | null;
  theme: string | null;
  file_url: string | null;
  file_size: number | null;
  change_note: string | null;
  change_reason: string | null;
  objects_count: number;
  is_current: boolean;
  created_at: string;
  author_name: string | null;
}

interface DiffChange { kind: string; was: number; now: number; delta: number }
interface DiffResult {
  a: Revision; b: Revision;
  changes: DiffChange[];
  objects_delta: number;
  name_changed: boolean;
  paper_changed: boolean;
}

interface Props {
  drawingId: number;
  onClose: () => void;
  onRestored?: () => void;
}

const KIND_RU: Record<string, string> = {
  line: "Линии", circle: "Окружности", rect: "Прямоугольники",
  polyline: "Ломаные", polygon: "Многоугольники", path: "Контуры",
  "i-text": "Надписи", text: "Надписи", textbox: "Надписи",
  group: "Группы", ellipse: "Эллипсы", dimension: "Размеры",
  hatch: "Штриховка", arc: "Дуги", объект: "Прочее",
};

const kindLabel = (k: string) => KIND_RU[k] ?? k;

export default function DrawingRevisions({ drawingId, onClose, onRestored }: Props) {
  const [revs, setRevs]       = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [picked, setPicked]   = useState<number[]>([]);
  const [diff, setDiff]       = useState<DiffResult | null>(null);
  const [diffing, setDiffing] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setRevs(await apiGet<Revision[]>("drawings", "", { revisions: drawingId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить историю");
    } finally { setLoading(false); }
  }, [drawingId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: number) => {
    setDiff(null);
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id)
        : prev.length >= 2 ? [prev[1], id] : [...prev, id]);
  };

  const compare = async () => {
    if (picked.length !== 2) return;
    setDiffing(true);
    try {
      const [a, b] = [...picked].sort((x, y) => {
        const ra = revs.find((r) => r.id === x)?.rev_no ?? 0;
        const rb = revs.find((r) => r.id === y)?.rev_no ?? 0;
        return ra - rb;
      });
      setDiff(await apiGet<DiffResult>("drawings", "", { diff_a: a, diff_b: b }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сравнения");
    } finally { setDiffing(false); }
  };

  const restore = async (rev: Revision) => {
    if (!confirm(`Вернуться к версии ${rev.rev_no}? Текущая работа сохранится как отдельная версия — ничего не потеряется.`)) return;
    setRestoring(rev.id);
    try {
      await apiPost("drawings", { change_note: `Возврат к версии ${rev.rev_no}` }, { restore: rev.id });
      toast.success(`Чертёж возвращён к версии ${rev.rev_no}`);
      await load();
      onRestored?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось откатить");
    } finally { setRestoring(null); }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleString("ru", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1c2e] border border-gray-600 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[88vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-white">История версий</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Изменения по ГОСТ 2.503 — каждое сохранение фиксируется</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <Icon name="X" size={16} />
          </button>
        </div>

        {picked.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-950/30 border-b border-gray-700">
            <span className="text-[11px] text-gray-400">
              Выбрано для сравнения: {picked.length} из 2
            </span>
            <button onClick={compare} disabled={picked.length !== 2 || diffing}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-[11px] font-medium">
              {diffing ? <Icon name="Loader2" size={12} className="animate-spin" /> : <Icon name="GitCompare" size={12} />}
              Сравнить
            </button>
            <button onClick={() => { setPicked([]); setDiff(null); }}
              className="px-2.5 py-1.5 text-[11px] text-gray-400 hover:text-white">Сбросить</button>
          </div>
        )}

        {diff && (
          <div className="px-5 py-3 bg-gray-900/60 border-b border-gray-700 text-[11px]">
            <p className="text-gray-300 font-medium mb-2">
              Версия {diff.a.rev_no} → версия {diff.b.rev_no}
            </p>
            {diff.changes.length === 0 && !diff.name_changed && !diff.paper_changed ? (
              <p className="text-gray-500">Графика не менялась</p>
            ) : (
              <div className="space-y-1">
                {diff.name_changed && (
                  <p className="text-gray-400">Название: <span className="text-gray-500">{diff.a.name}</span> → <span className="text-white">{diff.b.name}</span></p>
                )}
                {diff.paper_changed && (
                  <p className="text-gray-400">Формат: <span className="text-gray-500">{diff.a.paper_size}</span> → <span className="text-white">{diff.b.paper_size}</span></p>
                )}
                {diff.changes.map((c) => (
                  <p key={c.kind} className="text-gray-400">
                    {kindLabel(c.kind)}: {c.was} → {c.now}
                    <span className={c.delta > 0 ? "text-green-400 ml-1.5" : "text-red-400 ml-1.5"}>
                      {c.delta > 0 ? `+${c.delta}` : c.delta}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Icon name="Loader2" size={20} className="animate-spin mr-2" />Загружаю историю...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              <Icon name="AlertCircle" size={13} />{error}
            </div>
          ) : revs.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-xs">Версий пока нет</div>
          ) : (
            <div className="space-y-2">
              {revs.map((r) => {
                const sel = picked.includes(r.id);
                return (
                  <div key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                      ${sel ? "bg-blue-950/40 border-blue-600" : "bg-gray-800/60 border-gray-700/50 hover:border-gray-600"}`}>

                    <button onClick={() => toggle(r.id)}
                      className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center
                        ${sel ? "bg-blue-600 border-blue-500" : "border-gray-600 hover:border-gray-400"}`}>
                      {sel && <Icon name="Check" size={11} className="text-white" />}
                    </button>

                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                        className="w-16 h-10 shrink-0 rounded overflow-hidden border border-gray-600 bg-gray-900">
                        <img src={r.file_url} alt={`Версия ${r.rev_no}`} className="w-full h-full object-contain" />
                      </a>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">Версия {r.rev_no}</span>
                        {r.rev_letter && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400 text-[10px] font-mono border border-amber-700/40">
                            изм. {r.rev_letter}
                          </span>
                        )}
                        {r.is_current && (
                          <span className="px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 text-[10px] border border-green-700/40">
                            текущая
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {r.change_note || "Без описания изменений"}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-0.5">
                        <span>{fmt(r.created_at)}</span>
                        {r.author_name && <><span>·</span><span>{r.author_name}</span></>}
                        <span>·</span>
                        <span>{r.objects_count} объектов</span>
                      </div>
                    </div>

                    {!r.is_current && (
                      <button onClick={() => restore(r)} disabled={restoring === r.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-40 transition-colors">
                        {restoring === r.id
                          ? <Icon name="Loader2" size={12} className="animate-spin" />
                          : <Icon name="RotateCcw" size={12} />}
                        Вернуть
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
