/**
 * Cad2DToolbarPrimitives — переиспользуемые элементы тулбара 2D-редактора:
 * выпадающее меню, пункт меню, разделитель, кнопка-иконка и пункт-инструмент.
 * Извлечено 1:1 из Cad2DToolbar без изменения логики.
 */
import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { TOOLS, type Tool } from "@/components/smartmach/cad2d.data";

/* ── Выпадающее меню ── */
export function Dropdown({ label, icon, children, active }: {
  label: string; icon: string; children: React.ReactNode; active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors
          ${open || active
            ? "bg-blue-600/25 text-blue-300 border border-blue-500/40"
            : "text-gray-300 hover:bg-gray-700/60 border border-transparent"}`}
      >
        <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={13} />
        {label}
        <Icon name="ChevronDown" size={10} className="opacity-50" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1c2e] border border-gray-600 rounded-lg shadow-xl min-w-[180px] py-1"
          onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Пункт меню ── */
export function MenuItem({ icon, label, onClick, active, shortcut }: {
  icon: string; label: string; onClick: () => void; active?: boolean; shortcut?: string;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors text-left
        ${active ? "bg-blue-600/20 text-blue-300" : "text-gray-300 hover:bg-gray-700/60 hover:text-white"}`}>
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={13} className="flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-gray-600 text-[10px]">{shortcut}</span>}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-gray-700/60" />;
}

/* ── Кнопка-иконка ── */
export function IconBtn({ icon, title, onClick, active, disabled }: {
  icon: string; title: string; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={`w-7 h-7 flex items-center justify-center rounded transition-colors disabled:opacity-30
        ${active ? "bg-blue-600/25 text-blue-300" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={14} />
    </button>
  );
}

/* ── Разделитель ── */
export function Sep() {
  return <div className="h-5 w-px bg-gray-700 mx-1" />;
}

/* ── Кнопка инструмента (из TOOLS) ── */
export function ToolMenuItem({ id, tool, onTool, shortcut }: {
  id: Tool; tool: Tool; onTool: (t: Tool) => void; shortcut?: string;
}) {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) return null;
  return (
    <MenuItem
      icon={t.icon}
      label={t.label.split(" (")[0]}
      shortcut={shortcut ?? t.key?.toUpperCase()}
      active={tool === id}
      onClick={() => onTool(id)}
    />
  );
}
