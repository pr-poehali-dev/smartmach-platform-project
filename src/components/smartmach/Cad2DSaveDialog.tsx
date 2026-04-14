import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { apiGet, apiPost } from "@/lib/api";
import { mGetPartsList, type Part } from "@/lib/manufacture";

interface Props {
  canvasDataUrl: string;
  paperSize: string;
  theme: "light" | "dark";
  gostMeta?: Record<string, string> | null;
  onClose: () => void;
  onSaved: (drawingId: number, url: string) => void;
}

interface Drawing {
  id: number;
  name: string;
  paper_size: string;
  theme: string;
  file_url: string;
  created_at: string;
  author_name: string;
  part_name?: string;
  part_code?: string;
}

export default function Cad2DSaveDialog({
  canvasDataUrl, paperSize, theme, gostMeta, onClose, onSaved,
}: Props) {
  const [name,     setName]     = useState(gostMeta?.drawingName || "Чертёж");
  const [partId,   setPartId]   = useState<number | null>(null);
  const [parts,    setParts]    = useState<Part[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  const [partSearch, setPartSearch] = useState("");
  const [tab, setTab] = useState<"save" | "list">("save");

  useEffect(() => {
    mGetPartsList().then(setParts).catch(() => {});
    loadDrawings();
  }, []);

  const loadDrawings = async () => {
    setLoadingDrawings(true);
    try {
      const list = await apiGet<Drawing[]>("drawings");
      setDrawings(list);
    } catch { /* ignore */ }
    finally { setLoadingDrawings(false); }
  };

  const filteredParts = parts.filter((p) =>
    !partSearch || p.name.toLowerCase().includes(partSearch.toLowerCase()) || p.code.toLowerCase().includes(partSearch.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost<{ id: number; file_url: string }>("drawings", {
        image: canvasDataUrl,
        name: name.trim() || "Чертёж",
        part_id: partId,
        paper_size: paperSize,
        theme,
        gost_meta: gostMeta,
      });
      onSaved(res.id, res.file_url);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1c2e] border border-gray-600 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Чертежи</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-5">
          {([["save", "Сохранить чертёж"], ["list", "Сохранённые чертежи"]] as [string, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as "save" | "list")}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors
                ${tab === id ? "border-blue-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Сохранить */}
        {tab === "save" && (
          <div className="px-5 py-5 space-y-4">

            {/* Превью */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden border border-gray-600 bg-gray-900">
                <img src={canvasDataUrl} alt="preview" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Название чертежа</label>
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Вал редуктора, чертёж общего вида"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span>Формат: <b className="text-gray-300">{paperSize}</b></span>
                  <span>·</span>
                  <span>Фон: <b className="text-gray-300">{theme === "dark" ? "Тёмный" : "Светлый"}</b></span>
                </div>
              </div>
            </div>

            {/* Привязка к детали */}
            <div>
              <label className="block text-[11px] text-gray-400 mb-2">Привязать к детали (необязательно)</label>
              <input
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Поиск детали по коду или названию..."
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 mb-2"
              />
              <div className="max-h-40 overflow-y-auto border border-gray-700 rounded-lg">
                {/* Без привязки */}
                <button
                  onClick={() => setPartId(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors
                    ${partId === null ? "bg-blue-600/20 text-blue-300" : "text-gray-400 hover:bg-gray-800"}`}>
                  <Icon name="Minus" size={12} />
                  Без привязки к детали
                </button>
                {filteredParts.slice(0, 50).map((p) => (
                  <button key={p.id}
                    onClick={() => setPartId(p.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors border-t border-gray-700/50
                      ${partId === p.id ? "bg-blue-600/20 text-blue-300" : "text-gray-300 hover:bg-gray-800"}`}>
                    <span className="font-mono text-gray-500 w-24 shrink-0 truncate">{p.code}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-gray-600 text-[10px] shrink-0">{p.category}</span>
                  </button>
                ))}
                {filteredParts.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-600 text-center">Детали не найдены</div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                <Icon name="AlertCircle" size={13} />
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors">
                {saving
                  ? <><Icon name="Loader2" size={13} className="animate-spin" />Сохраняю...</>
                  : <><Icon name="Save" size={13} />Сохранить в библиотеку</>}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Список */}
        {tab === "list" && (
          <div className="px-5 py-4">
            {loadingDrawings ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Icon name="Loader2" size={20} className="animate-spin mr-2" />Загрузка...
              </div>
            ) : drawings.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-xs">
                Чертежей пока нет. Сохраните первый!
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {drawings.map((d) => (
                  <div key={d.id}
                    className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                      className="w-16 h-10 flex-shrink-0 rounded overflow-hidden border border-gray-600 bg-gray-900">
                      <img src={d.file_url} alt={d.name} className="w-full h-full object-contain" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{d.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span>{d.paper_size}</span>
                        <span>·</span>
                        <span>{d.author_name}</span>
                        {d.part_name && <><span>·</span><span className="text-blue-400">{d.part_code} {d.part_name}</span></>}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {new Date(d.created_at).toLocaleDateString("ru")}
                    </div>
                    <a href={d.file_url} download target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                      <Icon name="Download" size={13} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
