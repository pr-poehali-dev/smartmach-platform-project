import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, type AuthUser } from "@/hooks/useAuth";
import { useEventLog, type EventLogEntry } from "@/hooks/useEventLog";
import Icon from "@/components/ui/icon";

const ROLE_LABELS: Record<string, string> = {
  admin:         "Администратор",
  engineer:      "Инженер",
  technologist:  "Технолог",
};

const ROLE_COLORS: Record<string, string> = {
  admin:         "bg-purple-900/50 text-purple-300 border border-purple-700",
  engineer:      "bg-blue-900/50 text-blue-300 border border-blue-700",
  technologist:  "bg-green-900/50 text-green-300 border border-green-700",
};

const ACTION_ICONS: Record<string, string> = {
  "создал деталь":       "Box",
  "изменил статус":      "RefreshCw",
  "запустил расчёт":     "Play",
  "создал продукт":      "Package",
  "создал задание":      "ClipboardList",
  "загрузил программу":  "Upload",
  "изменил деталь":      "Pencil",
};

function actionIcon(action: string): string {
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (action.toLowerCase().includes(key)) return icon;
  }
  return "Activity";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const { fetchEvents } = useEventLog();

  const [events,        setEvents]        = useState<EventLogEntry[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchEvents(100).then((evs) => { setEvents(evs); setEventsLoading(false); });
  }, [user, fetchEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <Icon name="Loader2" size={32} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const u = user as AuthUser;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Шапка */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate("/platform")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <Icon name="ArrowLeft" size={16} />Назад в платформу
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <button onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-300 transition-colors">
            <Icon name="LogOut" size={14} />Выйти
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Профиль */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl font-bold shrink-0">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{u.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{u.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-800 text-gray-300"}`}>
                {ROLE_LABELS[u.role] ?? u.role}
              </span>
              <span className="text-xs text-gray-500">
                Зарегистрирован: {formatDate(u.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Всего событий", value: events.length, icon: "Activity", color: "text-blue-400" },
            { label: "За сегодня",    value: events.filter((e) => new Date(e.created_at).toDateString() === new Date().toDateString()).length, icon: "Calendar", color: "text-green-400" },
            { label: "Роль",          value: ROLE_LABELS[u.role] ?? u.role, icon: "Shield", color: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={16} className={s.color} />
                <span className="text-xs text-gray-400">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Журнал событий */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Icon name="ClipboardList" size={18} className="text-blue-400" />
              Журнал событий
            </h2>
            <span className="text-xs text-gray-500">{events.length} записей</span>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={24} className="text-blue-400 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Icon name="Inbox" size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Событий пока нет.</p>
              <p className="text-xs mt-1">Начните работу в платформе — все действия будут записаны здесь.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-gray-800/40 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name={actionIcon(ev.action) as Parameters<typeof Icon>[0]["name"]} size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{ev.action}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {ev.entity_type && (
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                          {ev.entity_type}
                          {ev.entity_id ? ` #${ev.entity_id}` : ""}
                        </span>
                      )}
                      {ev.details && (
                        <span className="text-xs text-gray-400 truncate max-w-xs">{ev.details}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0 mt-0.5">{formatDate(ev.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
