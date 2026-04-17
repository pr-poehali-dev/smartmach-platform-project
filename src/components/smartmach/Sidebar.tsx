import Icon from "@/components/ui/icon";
import { ModuleId } from "@/pages/Index";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  id: ModuleId;
  label: string;
  icon: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "assembly",  label: "Состав изделия",  icon: "Package",      color: "#e53935" },
  { id: "cad",       label: "Проектирование",  icon: "Box",          color: "#1e88e5" },
  { id: "cam",       label: "Программы ЧПУ",   icon: "Cpu",          color: "#8e24aa" },
  { id: "cae",       label: "Расчёты",         icon: "FlaskConical", color: "#00897b" },
  { id: "plm",       label: "Жизн. цикл",      icon: "GitBranch",    color: "#f4511e" },
  { id: "cnc",       label: "Оборудование",    icon: "Radio",        color: "#43a047" },
  { id: "analytics", label: "Задания",         icon: "ClipboardList",color: "#fb8c00" },
  { id: "equipment", label: "Справочник обор.", icon: "BookOpen",     color: "#6d4c41" },
  { id: "economics", label: "Экономика",        icon: "TrendingUp",   color: "#0288d1" },
  { id: "employees", label: "Сотрудники",       icon: "Users",        color: "#7b1fa2" },
];

interface Props {
  active: ModuleId;
  collapsed: boolean;
  mobileOpen?: boolean;
  onNavigate: (id: ModuleId) => void;
  onToggle: () => void;
  onMobileClose?: () => void;
}

function NavContent({
  active, collapsed, onNavigate, onToggle, onMobileClose,
}: {
  active: ModuleId;
  collapsed: boolean;
  onNavigate: (id: ModuleId) => void;
  onToggle: () => void;
  onMobileClose?: () => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleNavigate(id: ModuleId) {
    onNavigate(id);
    onMobileClose?.();
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Icon name="Layers" size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="font-bold text-[15px] text-foreground tracking-tight block leading-tight">СмартМаш</span>
            {user?.company_name && (
              <span className="text-[10px] text-muted-foreground truncate block leading-tight">{user.company_name}</span>
            )}
          </div>
        )}
        {/* Крестик закрытия на мобиле */}
        {onMobileClose && (
          <button onClick={onMobileClose} className="ml-auto p-1 rounded-lg hover:bg-secondary/60">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <button
          onClick={() => handleNavigate("home")}
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

        {!collapsed && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-4 mt-4 mb-1">
            Модули
          </p>
        )}
        {collapsed && <div className="my-3 border-t border-border mx-3" />}

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
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
        {user ? (
          <button
            onClick={() => { navigate("/profile"); onMobileClose?.(); }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
            title={collapsed ? user.name : undefined}
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={() => { navigate("/auth"); onMobileClose?.(); }}
            className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-lg hover:bg-secondary/60"
            title={collapsed ? "Войти" : undefined}
          >
            <Icon name="LogIn" size={14} />
            {!collapsed && <span>Войти</span>}
          </button>
        )}
        {user && (
          <button
            onClick={() => { navigate("/company"); onMobileClose?.(); }}
            className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-lg hover:bg-secondary/60"
            title={collapsed ? "Предприятие" : undefined}
          >
            <Icon name="Building2" size={14} />
            {!collapsed && <span>Предприятие</span>}
          </button>
        )}
        {user && !collapsed && (
          <button
            onClick={async () => { await logout(); navigate("/auth"); }}
            className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 rounded-lg hover:bg-secondary/60"
          >
            <Icon name="LogOut" size={13} />
            <span>Выйти</span>
          </button>
        )}
        <button
          onClick={() => { navigate("/"); onMobileClose?.(); }}
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-lg hover:bg-secondary/60"
          title="На главную страницу"
        >
          <Icon name="Home" size={14} />
          {!collapsed && <span>На главную</span>}
        </button>
        {/* Кнопка свернуть — только на десктопе */}
        <button
          onClick={onToggle}
          className="hidden md:flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <Icon name={collapsed ? "ChevronRight" : "ChevronLeft"} size={15} />
          {!collapsed && <span>Свернуть</span>}
        </button>
      </div>
    </>
  );
}

export default function Sidebar({ active, collapsed, mobileOpen = false, onNavigate, onToggle, onMobileClose }: Props) {
  return (
    <>
      {/* ── Десктоп сайдбар (md+) ─────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-white border-r border-border transition-all duration-300 select-none z-10",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <NavContent
          active={active}
          collapsed={collapsed}
          onNavigate={onNavigate}
          onToggle={onToggle}
        />
      </aside>

      {/* ── Мобильный drawer (< md) ───────────────────────────── */}
      {/* Оверлей */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      {/* Сам drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-72 bg-white border-r border-border flex flex-col z-50 md:hidden transition-transform duration-300 select-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent
          active={active}
          collapsed={false}
          onNavigate={onNavigate}
          onToggle={onToggle}
          onMobileClose={onMobileClose}
        />
      </aside>
    </>
  );
}