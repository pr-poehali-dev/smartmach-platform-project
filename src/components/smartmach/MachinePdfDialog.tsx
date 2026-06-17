import { useState } from "react";
import Icon from "@/components/ui/icon";
import { DEFAULT_SIGNATURES, type PackageSignatures } from "@/components/smartmach/machinePdfExport";

interface Props {
  drawingsCount: number;
  exporting: boolean;
  onExport: (sign: PackageSignatures) => void;
  onClose: () => void;
}

const LS_KEY = "mat1_pdf_signatures";

function loadSaved(): PackageSignatures {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_SIGNATURES, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SIGNATURES;
}

const PEOPLE: { key: keyof PackageSignatures; label: string; placeholder: string }[] = [
  { key: "designer",    label: "Разработал",    placeholder: "Соколов А.В." },
  { key: "checker",     label: "Проверил",      placeholder: "Иванова М.С." },
  { key: "normControl", label: "Нормоконтроль", placeholder: "Петров К.Н." },
  { key: "approver",    label: "Утвердил",      placeholder: "Директор" },
];

export default function MachinePdfDialog({ drawingsCount, exporting, onExport, onClose }: Props) {
  const [sign, setSign] = useState<PackageSignatures>(loadSaved);

  const f = (k: keyof PackageSignatures, v: string) => setSign((p) => ({ ...p, [k]: v }));

  function handleExport() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(sign)); } catch { /* ignore */ }
    onExport(sign);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <Icon name="FileDown" size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Экспорт пакета в PDF</h2>
              <p className="text-xs text-muted-foreground">Титульный лист с подписями · {drawingsCount} чертежей</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>

        {/* Тело */}
        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Реквизиты документа */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Наименование изделия</label>
              <input value={sign.docName} onChange={(e) => f("docName", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Обозначение</label>
              <input value={sign.docNumber} onChange={(e) => f("docNumber", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Организация</label>
              <input value={sign.company} onChange={(e) => f("company", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Подписи */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="PenLine" size={14} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Ответственные лица</span>
            </div>
            <div className="space-y-2">
              {PEOPLE.map((p) => (
                <div key={p.key} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-muted-foreground flex-shrink-0">{p.label}</span>
                  <input
                    value={sign[p.key]}
                    onChange={(e) => f(p.key, e.target.value)}
                    placeholder={p.placeholder}
                    className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2.5">
            <Icon name="Info" size={13} className="text-primary flex-shrink-0 mt-0.5" />
            <p>Подписи оформляются на титульном листе по ГОСТ Р 2.105. Данные сохраняются для следующего экспорта.</p>
          </div>
        </div>

        {/* Подвал */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-secondary/20">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">
            Отмена
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium">
            <Icon name={exporting ? "Loader" : "FileDown"} size={15} className={exporting ? "animate-spin" : ""} />
            {exporting ? "Формирую…" : "Скачать PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
