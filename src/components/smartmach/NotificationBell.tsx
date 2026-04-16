import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useNotifications, type Notification, type NotificationSeverity } from "@/hooks/useNotifications";
import { type ModuleId } from "@/pages/Index";

interface Props {
  onNavigate: (module: ModuleId) => void;
}

const SEVERITY_STYLES: Record<NotificationSeverity, { icon: string; iconColor: string; bg: string; border: string }> = {
  error: { icon: "XCircle",        iconColor: "text-red-500",    bg: "bg-red-50",    border: "border-red-100" },
  warn:  { icon: "AlertTriangle",  iconColor: "text-amber-500",  bg: "bg-amber-50",  border: "border-amber-100" },
  info:  { icon: "Info",           iconColor: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-100" },
};

const BADGE_COLORS: Record<NotificationSeverity, string> = {
  error: "bg-red-500",
  warn:  "bg-amber-400",
  info:  "bg-blue-400",
};

function badgeSeverity(notifications: Notification[]): NotificationSeverity | null {
  if (notifications.some((n) => n.severity === "error")) return "error";
  if (notifications.some((n) => n.severity === "warn"))  return "warn";
  if (notifications.length > 0)                           return "info";
  return null;
}

const MODULE_LABEL: Partial<Record<ModuleId, string>> = {
  equipment: "Оборудование",
  cae:       "Расчёты",
  cam:       "Программы ЧПУ",
  analytics: "Задания",
  home:      "Главная",
};

export default function NotificationBell({ onNavigate }: Props) {
  const { notifications, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const badge = badgeSeverity(notifications);
  const count = notifications.length;

  // Закрыть при клике вне панели
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNotificationClick(n: Notification) {
    if (n.module && n.module !== "home") {
      onNavigate(n.module as ModuleId);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      {/* Кнопка-колокольчик */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors
          ${open ? "bg-secondary" : "hover:bg-secondary"}`}
        title="Уведомления"
      >
        <Icon name={loading ? "Loader" : "Bell"} size={18}
          className={`${loading ? "animate-spin text-muted-foreground" : "text-foreground"}`} />

        {/* Бейдж */}
        {!loading && badge && (
          <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${BADGE_COLORS[badge]}`} />
        )}
      </button>

      {/* Дропдаун */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-border z-50 flex flex-col max-h-[480px]">

          {/* Шапка */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <p className="font-semibold text-sm text-foreground">
              Уведомления
              {count > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">{count}</span>
              )}
            </p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={15} />
            </button>
          </div>

          {/* Список */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Icon name="BellOff" size={28} className="opacity-30" />
                <p className="text-sm">Всё в порядке</p>
              </div>
            ) : (
              <ul className="p-2 space-y-1">
                {notifications.map((n) => {
                  const s = SEVERITY_STYLES[n.severity];
                  const isClickable = n.module && n.module !== "home";
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleNotificationClick(n)}
                        disabled={!isClickable}
                        className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all
                          ${s.bg} ${s.border}
                          ${isClickable ? "hover:brightness-95 cursor-pointer" : "cursor-default"}`}
                      >
                        <Icon name={s.icon as "XCircle"} size={16}
                          className={`${s.iconColor} mt-0.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-snug truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                          {isClickable && (
                            <p className="text-[10px] text-primary mt-1">
                              → {MODULE_LABEL[n.module as ModuleId] ?? n.module}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Подвал */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border shrink-0">
              <p className="text-[11px] text-muted-foreground text-center">
                Данные обновляются каждую минуту
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
