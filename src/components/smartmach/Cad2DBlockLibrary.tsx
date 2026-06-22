/**
 * Cad2DBlockLibrary — выдвижная панель библиотеки параметрических блоков.
 * Поиск, фильтр по категориям и вставка элемента на холст одним кликом.
 */
import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { BLOCK_CATEGORIES, BLOCKS, searchBlocks, type BlockDef } from "@/components/smartmach/cad2d.blocks";

const CAT_ICON: Record<string, string> = {
  "Крепёж": "Bolt",
  "Резьба и фаски": "Spline",
  "Подшипники": "CircleDot",
  "Профили проката": "Columns3",
  "Базовая геометрия": "Shapes",
  "Элементы валов": "Cylinder",
  "Зубчатые колёса": "Cog",
  "Обозначения": "Tag",
  "Сварка и пайка": "Flame",
  "Электросхемы": "Zap",
  "Гидравлика и пневматика": "Gauge",
  "Сантехника и трубы": "Pipette",
  "Станок МАТ-1": "Hammer",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (blockId: string) => void;
}

export default function Cad2DBlockLibrary({ open, onClose, onInsert }: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("Все");

  const list = useMemo<BlockDef[]>(() => {
    let res = query.trim() ? searchBlocks(query) : BLOCKS;
    if (cat !== "Все") res = res.filter((b) => b.category === cat);
    return res;
  }, [query, cat]);

  if (!open) return null;

  return (
    <div className="absolute inset-y-0 left-0 z-40 w-72 bg-[#15162a] border-r border-gray-700/60 flex flex-col shadow-2xl">
      {/* Шапка */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700/60">
        <div className="flex items-center gap-2">
          <Icon name="LibraryBig" size={15} className="text-blue-400" />
          <span className="text-sm font-semibold text-gray-200">Библиотека блоков</span>
          <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{BLOCKS.length}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/60 text-gray-400 hover:text-white">
          <Icon name="X" size={15} />
        </button>
      </div>

      {/* Поиск */}
      <div className="px-3 py-2 border-b border-gray-700/60">
        <div className="relative">
          <Icon name="Search" size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: болт, подшипник, ГОСТ…"
            className="w-full bg-gray-800 border border-gray-700 rounded pl-7 pr-2 py-1.5 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Категории */}
      <div className="px-2 py-2 border-b border-gray-700/60 flex flex-wrap gap-1">
        {["Все", ...BLOCK_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors
              ${cat === c ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}
          >
            {c !== "Все" && <Icon name={(CAT_ICON[c] ?? "Box") as Parameters<typeof Icon>[0]["name"]} size={10} />}
            {c}
          </button>
        ))}
      </div>

      {/* Список блоков */}
      <div className="flex-1 overflow-y-auto p-2">
        {list.length === 0 ? (
          <p className="text-[11px] text-gray-600 text-center py-8">Ничего не найдено</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {list.map((b) => (
              <button
                key={b.id}
                onClick={() => onInsert(b.id)}
                title={`${b.name}${b.standard ? ` · ${b.standard}` : ""}`}
                className="flex flex-col items-start gap-1 p-2 rounded-lg bg-gray-800/60 border border-gray-700/50 hover:border-blue-500/60 hover:bg-gray-800 transition-all text-left group"
              >
                <div className="flex items-center gap-1.5 w-full">
                  <Icon name={(CAT_ICON[b.category] ?? "Box") as Parameters<typeof Icon>[0]["name"]} size={12}
                    className="text-blue-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-200 font-medium truncate group-hover:text-white">{b.name}</span>
                </div>
                {b.standard && <span className="text-[9px] text-gray-500 truncate w-full">{b.standard}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-700/60 text-[10px] text-gray-500">
        Клик по элементу — вставка в центр холста
      </div>
    </div>
  );
}