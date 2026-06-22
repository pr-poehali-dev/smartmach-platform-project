/**
 * Cad3DObjectsList — дерево объектов сцены в левой панели 3D-редактора:
 * выбор, переименование, перемещение, блокировка, видимость и удаление.
 * Извлечено 1:1 из Cad3DLeftPanel без изменения логики.
 */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import { SHAPES, type SceneObject } from "@/components/smartmach/cad3d.types";

interface Props {
  objects: SceneObject[];
  selected: string | null;
  secScene: boolean;
  onToggleSecScene: () => void;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onRenameObject: (id: string, label: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export default function Cad3DObjectsList({
  objects, selected, secScene, onToggleSecScene,
  onSelect, onToggleVisibility, onToggleLock, onRemove, onClearAll,
  onRenameObject, onMoveUp, onMoveDown,
}: Props) {
  const [renameId, setRenameId]  = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  return (
    <div className="flex-1 min-h-0 flex flex-col border-b border-gray-700/60">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <button onClick={onToggleSecScene}
          className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200">
          Сцена ({objects.length})
          <Icon name={secScene ? "ChevronUp" : "ChevronDown"} size={11} />
        </button>
        {objects.length > 0 && (
          <button onClick={onClearAll} title="Очистить всё"
            className="text-gray-600 hover:text-red-400 transition-colors">
            <Icon name="Trash2" size={11} />
          </button>
        )}
      </div>

      {secScene && (
        <div className="flex-1 overflow-y-auto px-1 pb-2 space-y-0.5">
          {objects.length === 0 ? (
            <p className="text-[11px] text-gray-600 text-center py-4 px-2">
              Добавьте первый объект
            </p>
          ) : (
            objects.map((obj, idx) => (
              <div key={obj.id}
                onClick={() => onSelect(obj.id)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors group
                  ${selected === obj.id ? "bg-blue-900/50 border border-blue-700/50" : "hover:bg-gray-800"}`}>

                {/* Иконка типа */}
                <Icon name={SHAPES.find((s) => s.id === obj.type)?.icon as Parameters<typeof Icon>[0]["name"] ?? "Box"}
                  size={11} className="text-gray-500 flex-shrink-0" />

                {/* Название */}
                <div className="flex-1 min-w-0">
                  {renameId === obj.id ? (
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onBlur={() => { onRenameObject(obj.id, renameVal || obj.label); setRenameId(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { onRenameObject(obj.id, renameVal || obj.label); setRenameId(null); }
                        if (e.key === "Escape") setRenameId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-gray-800 border border-blue-500 rounded px-1 py-0 text-[11px] text-white outline-none"
                    />
                  ) : (
                    <span
                      className={`text-[11px] truncate block ${obj.visible ? "text-gray-200" : "text-gray-600 line-through"}`}
                      onDoubleClick={(e) => { e.stopPropagation(); setRenameId(obj.id); setRenameVal(obj.label); }}>
                      {obj.label}
                    </span>
                  )}
                </div>

                {/* Контролы */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onMoveUp(obj.id); }} title="Вверх"
                    disabled={idx === 0}
                    className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-200 disabled:opacity-20">
                    <Icon name="ChevronUp" size={9} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onMoveDown(obj.id); }} title="Вниз"
                    disabled={idx === objects.length - 1}
                    className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-200 disabled:opacity-20">
                    <Icon name="ChevronDown" size={9} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onToggleLock(obj.id); }} title="Заблокировать"
                    className={`w-4 h-4 flex items-center justify-center ${obj.locked ? "text-yellow-400" : "text-gray-500 hover:text-gray-200"}`}>
                    <Icon name={obj.locked ? "Lock" : "Unlock"} size={9} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(obj.id); }} title="Видимость"
                    className={`w-4 h-4 flex items-center justify-center ${obj.visible ? "text-gray-400 hover:text-gray-200" : "text-gray-600"}`}>
                    <Icon name={obj.visible ? "Eye" : "EyeOff"} size={9} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onRemove(obj.id); }} title="Удалить"
                    className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-red-400">
                    <Icon name="X" size={9} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
