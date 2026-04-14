import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";
import { type GostFrameOptions } from "@/components/smartmach/useCad2DCanvas";

interface Props {
  onApply: (opts: GostFrameOptions) => void;
  onClose: () => void;
  currentPaper: string;
}

const SCALES = ["1:1", "1:2", "1:5", "1:10", "1:20", "1:50", "1:100", "2:1", "5:1", "10:1"];

export default function Cad2DGostDialog({ onApply, onClose, currentPaper }: Props) {
  const [paper,  setPaper]  = useState(currentPaper);
  const [name,   setName]   = useState("");
  const [number, setNumber] = useState("");
  const [company, setCompany] = useState("");
  const [designer, setDesigner] = useState("");
  const [checker,  setChecker]  = useState("");
  const [scale,  setScale]  = useState("1:1");
  const [mass,   setMass]   = useState("");
  const [sheet,  setSheet]  = useState("1");
  const [sheets, setSheets] = useState("1");

  const handleApply = () => {
    onApply({ paperSize: paper, drawingNumber: number, drawingName: name, company, designer, checker, scale, mass, sheet, sheets });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1c2e] border border-gray-600 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-white">Рамка по ГОСТ 2.104-2006</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Основная надпись (форма 1)</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* Формат листа */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1.5">Формат листа</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.keys(PAPER_SIZES).filter((k) => k !== "Свободно").map((k) => (
                <button key={k} onClick={() => setPaper(k)}
                  className={`py-1.5 rounded text-[11px] font-medium transition-colors border
                    ${paper === k
                      ? "bg-blue-600 text-white border-blue-500"
                      : "text-gray-300 border-gray-600 hover:border-gray-500 hover:text-white"}`}>
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Основная надпись */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1.5">
              Основная надпись
            </p>

            <Field label="Наименование документа" value={name} onChange={setName}
              placeholder="Вал редуктора" />
            <Field label="Обозначение (номер чертежа)" value={number} onChange={setNumber}
              placeholder="XXXXXX.XXX.XXX СБ" />
            <Field label="Предприятие / организация" value={company} onChange={setCompany}
              placeholder="ООО «Завод»" />

            <div className="grid grid-cols-2 gap-2">
              <Field label="Разработал" value={designer} onChange={setDesigner} placeholder="Иванов И.И." />
              <Field label="Проверил"   value={checker}  onChange={setChecker}  placeholder="Петров П.П." />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Масштаб</label>
                <select value={scale} onChange={(e) => setScale(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-blue-500">
                  {SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <Field label="Масса (кг)" value={mass} onChange={setMass} placeholder="0.5" />
              <div className="grid grid-cols-2 gap-1">
                <Field label="Лист" value={sheet}  onChange={setSheet}  placeholder="1" />
                <Field label="Листов" value={sheets} onChange={setSheets} placeholder="1" />
              </div>
            </div>
          </div>

          {/* Предпросмотр схемы */}
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <p className="text-[10px] text-gray-500 mb-2">Схема основной надписи (ГОСТ 2.104-2006, форма 1)</p>
            <div className="border border-gray-500 bg-white rounded text-[8px] text-gray-800 font-mono leading-none" style={{ height: 80, position: "relative", overflow: "hidden" }}>
              <div className="absolute inset-0 border-l-4 border-gray-400" style={{ left: "10%", top: 0, bottom: 0 }} />
              <div className="absolute border border-gray-400 text-center flex items-center justify-center text-[7px] text-gray-600"
                style={{ right: 0, bottom: 0, width: "62%", height: "70%" }}>
                <div>
                  <div className="font-bold text-[8px]">{name || "Наименование"}</div>
                  <div className="text-[7px] text-gray-500">{number || "Обозначение"}</div>
                  <div className="grid grid-cols-3 gap-1 text-[6px] mt-1">
                    <span>{scale}</span>
                    <span>Лист {sheet}/{sheets}</span>
                    <span>{company || "Предприятие"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-700">
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">
            Отмена
          </button>
          <button onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors">
            <Icon name="Check" size={13} />
            Применить рамку
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500" />
    </div>
  );
}
