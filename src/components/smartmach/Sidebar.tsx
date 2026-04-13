import Icon from "@/components/ui/icon";
import { ModuleId } from "@/pages/Index";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "cad",       label: "Проектирование",  icon: "Box",          color: "#1e88e5" },
  { id: "cam",       label: "Программы ЧПУ",   icon: "Cpu",          color: "#8e24aa" },
  { id: "cae",       label: "Расчёты",         icon: "FlaskConical", color: "#00897b" },
  { id: "plm",       label: "Жизн. цикл",      icon: "GitBranch",    color: "#f4511e" },
  { id: "cnc",       label: "Оборудование",    icon: "Radio",        color: "#43a047" },
  { id: "analytics", label: "Задания",         icon: "ClipboardList",color: "#fb8c00" },
  { id: "equipment", label: "Справочник обор.", icon: "BookOpen",     color: "#6d4c41" },
  { id: "economics", label: "Экономика",        icon: "TrendingUp",   color: "#0288d1" },
];

interface Props {
  active: ModuleId;
  collapsed: boolean;
  onNavigate: (id: ModuleId) => void;
  onToggle: () => void;
}

export default function Sidebar({ active, collapsed, onNavigate, onToggle }: Props) {
  const navigate = useNavigate();
  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-white border-r border-border transition-all duration-300 select-none z-10",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Icon name="Layers" size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-[15px] text-foreground tracking-tight">СмартМаш</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {/* Dashboard */}
        <button
          onClick={() => onNavigate("home")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-none",
            active === "home"
              ? "bg-primary/10 text-primary border-r-2 border-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Icon name="LayoutDashboard" size={18} className="flex-shrink-0" />
          {!collapsed && <span>Обзор</span>}
        </button>

        {/* Divider */}
        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-4 mt-4 mb-1">
            Модули
          </p>
        )}
        {collapsed && <div className="my-3 border-t border-border mx-3" />}

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
              active === item.id
                ? "bg-primary/10 text-primary border-r-2 border-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon
              name={item.icon as Parameters<typeof Icon>[0]["name"]}
              size={18}
              className="flex-shrink-0"
              style={{ color: active === item.id ? "var(--c-blue)" : item.color }}
            />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 flex-shrink-0 space-y-1">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-lg hover:bg-secondary/60"
          title="На главную страницу"
        >
          <Icon name="Home" size={14} />
          {!collapsed && <span>На главную</span>}
        </button>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <Icon name={collapsed ? "ChevronRight" : "ChevronLeft"} size={15} />
          {!collapsed && <span>Свернуть</span>}
        </button>
      </div>
    </aside>
  );
}