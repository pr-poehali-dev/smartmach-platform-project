/**
 * MachineDrawingSaveDialog — модальное окно сохранения чертежа станка МАТ-1.
 * Извлечено 1:1 из MachineDrawingEditor без изменения логики.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";

export interface SaveDialogProps {
  preview: string;
  paperSize: string;
  theme: "light" | "dark";
  initialName: string;
  initialDescription: string;
  saving: boolean;
  error: string | null;
  onSave: (name: string, desc: string) => void;
  onClose: () => void;
}

export default function MachineDrawingSaveDialog({ preview, paperSize, theme, initialName, initialDescription, saving, error, onSave, onClose }: SaveDialogProps) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDescription);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1c2e] border border-gray-600 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">Сохранить чертёж</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex gap-4">
            <div className="w-36 h-24 rounded-lg overflow-hidden border border-gray-600 bg-gray-900 flex-shrink-0">
              <img src={preview} alt="preview" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Название чертежа *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Станина, вид спереди"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span>Формат: <b className="text-gray-300">{paperSize}</b></span>
                <span>·</span>
                <span>Фон: <b className="text-gray-300">{theme === "dark" ? "Тёмный" : "Светлый"}</b></span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Описание (необязательно)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Рабочий чертёж станины для сварной конструкции..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              <Icon name="AlertCircle" size={13} />{error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Отмена</button>
            <button
              onClick={() => onSave(name.trim() || "Чертёж", desc.trim())}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              {saving
                ? <><Icon name="Loader2" size={13} className="animate-spin" />Сохраняю…</>
                : <><Icon name="Save" size={13} />Сохранить</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
