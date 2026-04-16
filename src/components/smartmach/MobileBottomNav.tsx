import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ModuleId } from "@/pages/Index";

const BOTTOM_ITEMS: { id: ModuleId; label: string; icon: string }[] = [
  { id: "home",      label: "Обзор",    icon: "LayoutDashboard" },
  { id: "cnc",       label: "Станки",   icon: "Radio" },
  { id: "analytics", label: "Задания",  icon: "ClipboardList" },
  { id: "cam",       label: "ЧПУ",      icon: "Cpu" },
  { id: "cad",       label: "Детали",   icon: "Box" },
];

interface Props {
  active: ModuleId;
  onNavigate: (id: ModuleId) => void;
}

export default function MobileBottomNav({ active, onNavigate }: Props) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 safe-area-pb">
      <div className="flex items-stretch">
        {BOTTOM_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
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
  );
}
