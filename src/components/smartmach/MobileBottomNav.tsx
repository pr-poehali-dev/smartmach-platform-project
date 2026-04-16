import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ModuleId } from "@/pages/Index";

const BOTTOM_ITEMS: { id: ModuleId; label: string; icon: string }[] = [
  { id: "home",      label: "Обзор",   icon: "LayoutDashboard" },
  { id: "cnc",       label: "Станки",  icon: "Radio" },
  { id: "analytics", label: "Задания", icon: "ClipboardList" },
  { id: "cam",       label: "ЧПУ",     icon: "Cpu" },
  { id: "cad",       label: "Детали",  icon: "Box" },
];

const FAB_ACTIONS: { id: ModuleId; label: string; icon: string; color: string }[] = [
  { id: "analytics", label: "Новое задание",   icon: "ClipboardList", color: "bg-orange-500" },
  { id: "cnc",       label: "Статус станка",   icon: "Radio",         color: "bg-green-600" },
  { id: "cam",       label: "Новая программа", icon: "Cpu",           color: "bg-purple-600" },
  { id: "cad",       label: "Новая деталь",    icon: "Box",           color: "bg-blue-600" },
];

interface Props {
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
}

export default function MobileBottomNav({ active, onNavigate }: Props) {
  const [fabOpen, setFabOpen] = useState(false);

  function handleFabAction(id: ModuleId) {
    setFabOpen(false);
    onNavigate(id);
  }

  return (
    <>
      {/* Оверлей FAB */}
      {fabOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* FAB меню — всплывает вверх */}
      {fabOpen && (
        <div className="md:hidden fixed bottom-20 right-4 z-50 flex flex-col gap-2 items-end safe-area-pb">
          {FAB_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleFabAction(action.id)}
              className="flex items-center gap-2.5 bg-white shadow-lg border border-border rounded-full pl-3 pr-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/40 transition-colors"
            >
              <div className={`w-7 h-7 rounded-full ${action.color} flex items-center justify-center flex-shrink-0`}>
                <Icon name={action.icon as Parameters<typeof Icon>[0]["name"]} size={14} className="text-white" />
              </div>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* FAB кнопка */}
      <button
        onClick={() => setFabOpen((v) => !v)}
        className={cn(
          "md:hidden fixed bottom-[72px] right-4 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          fabOpen
            ? "bg-foreground text-background rotate-45"
            : "bg-primary text-primary-foreground"
        )}
        style={{ width: 52, height: 52 }}
        aria-label="Быстрые действия"
      >
        <Icon name="Plus" size={22} />
      </button>

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 safe-area-pb">
        <div className="flex items-stretch">
          {BOTTOM_ITEMS.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setFabOpen(false); onNavigate(item.id); }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon
                  name={item.icon as Parameters<typeof Icon>[0]["name"]}
                  size={20}
                  className={isActive ? "text-primary" : "text-muted-foreground"}
                />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
