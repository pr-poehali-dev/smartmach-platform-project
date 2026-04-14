import { useState } from "react";
import Icon from "@/components/ui/icon";
import { PAPER_SIZES } from "@/components/smartmach/cad2d.data";
import { type GostFrameOptions } from "@/components/smartmach/useCad2DCanvas";

interface Props {
  onApply: (opts: GostFrameOptions) => void;
  onClose: () => void;
  currentPaper: string;
}

const SCALES  = ["1:1", "1:2", "1:5", "1:10", "1:20", "1:50", "1:100", "2:1", "5:1", "10:1"];
const LITERAS = ["", "О", "ОО", "ОИ", "И", "Э", "П"];

export default function Cad2DGostDialog({ onApply, onClose, currentPaper }: Props) {
  const [paper,          setPaper]          = useState(currentPaper);
  const [name,           setName]           = useState("");
  const [number,         setNumber]         = useState("");
  const [company,        setCompany]        = useState("");
  const [designer,       setDesigner]       = useState("");
  const [checker,        setChecker]        = useState("");
  const [normController, setNormController] = useState("");
  const [approver,       setApprover]       = useState("");
  const [material,       setMaterial]       = useState("");
  const [litera,         setLitera]         = useState("");
  const [scale,          setScale]          = useState("1:1");
  const [mass,           setMass]           = useState("");
  const [sheet,          setSheet]          = useState("1");
  const [sheets,         setSheets]         = useState("1");

  const handleApply = () => {
    onApply({
      paperSize: paper,
      drawingNumber: number,
      drawingName: name,
      company, designer, checker,
      normController, approver,
      material, litera,
      scale, mass, sheet, sheets,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1c2e] border border-gray-600 rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">

        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-sm font-semibold text-white">Рамка по ГОСТ Р 2.104-2023</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Основная надпись, форма 1 — первый лист</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[75vh]">

          {/* Формат листа */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1.5">
              Формат листа (ГОСТ 2.301)
            </label>
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

          {/* Гр.1 и Гр.2 */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-300 border-b border-gray-700 pb-1">
              Идентификация документа
            </p>
            <Field label="Гр.1  Наименование изделия" value={name} onChange={setName}
              placeholder="Вал ведомый" />
            <Field label="Гр.2  Обозначение документа (ГОСТ 2.201)" value={number} onChange={setNumber}
              placeholder="АБВГ.123456.001 СБ" />
          </div>

          {/* Гр.3, Гр.4 */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-300 border-b border-gray-700 pb-1">
              Материал и литера
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Гр.3  Материал (для деталей)" value={material} onChange={setMaterial}
                placeholder="Сталь 45 ГОСТ 1050" />
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">
                  Гр.4  Литера (стадия разработки)
                </label>
                <select value={litera} onChange={(e) => setLitera(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-blue-500">
                  {LITERAS.map((l) => <option key={l} value={l}>{l || "— (не указана)"}</option>)}
                </select>
                <p className="text-[9px] text-gray-600 mt-0.5">О=опытный, ОО=серийный, И=изготовление</p>
              </div>
            </div>
          </div>

          {/* Гр.5,6,7,8 */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-300 border-b border-gray-700 pb-1">
              Масса, масштаб, листы
            </p>
            <div className="grid grid-cols-4 gap-2">
              <Field label="Гр.5  Масса, кг" value={mass} onChange={setMass} placeholder="0.500" />
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Гр.6  Масштаб</label>
                <select value={scale} onChange={(e) => setScale(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-blue-500">
                  {SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <Field label="Гр.7  Лист №" value={sheet}  onChange={setSheet}  placeholder="1" />
              <Field label="Гр.8  Листов" value={sheets} onChange={setSheets} placeholder="1" />
            </div>
          </div>

          {/* Гр.9 */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-300 border-b border-gray-700 pb-1">
              Организация (Гр.9)
            </p>
            <Field label="Наименование организации / предприятия" value={company} onChange={setCompany}
              placeholder="ООО «Машиностроительный завод»" />
          </div>

          {/* Гр.10-11 — подписи */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-300 border-b border-gray-700 pb-1">
              Подписи (Гр.10-11) — фамилии
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Разработал"   value={designer}       onChange={setDesigner}       placeholder="Иванов И.И." />
              <Field label="Проверил"     value={checker}        onChange={setChecker}        placeholder="Петров П.П." />
              <Field label="Нормоконтроль" value={normController} onChange={setNormController} placeholder="Сидоров С.С." />
              <Field label="Утвердил"     value={approver}       onChange={setApprover}       placeholder="Козлов А.В." />
            </div>
            <p className="text-[9px] text-gray-600">
              Т.контр. (технический контроль) — заполняется при необходимости после размещения рамки.
            </p>
          </div>

          {/* Предпросмотр — схема штампа */}
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <p className="text-[10px] text-gray-500 mb-2 font-medium">
              Схема штампа ГОСТ Р 2.104-2023, форма 1 (185×55мм)
            </p>
            {/* Упрощённая схема */}
            <div className="relative bg-white border-2 border-gray-800 font-mono overflow-hidden"
              style={{ height: 72, fontSize: 7 }}>
              {/* Левый блок подписей ~22% */}
              <div className="absolute inset-y-0 left-0 border-r border-gray-500 flex flex-col justify-around px-1"
                style={{ width: "22%", fontSize: 6, color: "#555" }}>
                <span>Разраб.</span><span>Пров.</span><span>Т.контр.</span><span>Н.контр.</span><span>Утв.</span>
              </div>
              {/* Центральный блок наименования */}
              <div className="absolute border-r border-gray-400 flex flex-col items-center justify-center text-center"
                style={{ left: "22%", top: 0, width: "35%", height: "55%", borderBottom: "1px solid #aaa" }}>
                <div className="font-bold text-[7px] text-gray-800 truncate w-full text-center px-1">
                  {name || "Наименование"}
                </div>
              </div>
              <div className="absolute border-r border-gray-400 flex items-center justify-center"
                style={{ left: "22%", top: "55%", width: "35%", height: "45%", fontSize: 6, color: "#666" }}>
                {number || "XXXXXX.XXX.XXX"}
              </div>
              {/* Правый блок: масса/масштаб/лист/листов/орг */}
              <div className="absolute border-l border-gray-400 grid grid-cols-1 gap-0"
                style={{ left: "57%", top: 0, right: 0, bottom: 0, fontSize: 6 }}>
                <div className="border-b border-gray-300 flex items-center justify-around px-0.5 text-[5px] text-gray-500">
                  <span>М:{mass||"—"}</span>
                  <span>{scale}</span>
                  <span>{sheet}/{sheets}</span>
                </div>
                <div className="flex items-center justify-center text-[6px] text-gray-600 flex-1">
                  {company || "Организация"}
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-1.5">
              Таблица изменений (графы 14–18) отрисовывается автоматически для форматов А3 и крупнее.
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700">
          <p className="text-[10px] text-gray-600">ГОСТ Р 2.104-2023 · ГОСТ 2.303 · ГОСТ 2.304</p>
          <div className="flex gap-2">
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
