import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { type Machine as EquipmentMachine } from "@/components/smartmach/equipment.types";
import { type Stats } from "@/lib/manufacture";

export type NotificationSeverity = "error" | "warn" | "info";

export interface Notification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  module: string;
}

interface EventLogItem {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const REFRESH_INTERVAL_MS = 60_000;

function daysUntil(dateStr: string): number | null {
  if (!dateStr || dateStr === "—") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function buildNotifications(
  equipment: EquipmentMachine[],
  stats: Stats | null,
  events: EventLogItem[],
): Notification[] {
  const list: Notification[] = [];

  // ── Оборудование ──────────────────────────────────────────────────────────

  equipment.forEach((m) => {
    // Станок на обслуживании
    if (m.status === "maintenance") {
      list.push({
        id:       `eq-maint-${m.id}`,
        severity: "warn",
        title:    `${m.name} — на обслуживании`,
        body:     `${m.type} · ${m.model}`,
        module:   "equipment",
      });
    }

    const days = daysUntil(m.nextMaintenance);

    // ТО просрочено
    if (days !== null && days < 0) {
      list.push({
        id:       `eq-overdue-${m.id}`,
        severity: "error",
        title:    `ТО просрочено: ${m.name}`,
        body:     `Дата прошла ${Math.abs(days)} дн. назад`,
        module:   "equipment",
      });
    }
    // ТО в ближайшие 14 дней
    else if (days !== null && days <= 14) {
      list.push({
        id:       `eq-soon-${m.id}`,
        severity: "warn",
        title:    `ТО через ${days} дн.: ${m.name}`,
        body:     `Запланировано на ${m.nextMaintenance}`,
        module:   "equipment",
      });
    }
  });

  // ── Производство (stats) ──────────────────────────────────────────────────

  if (stats) {
    if (stats.sims_error > 0) {
      list.push({
        id:       "stats-sims-error",
        severity: "error",
        title:    `Ошибки симуляций: ${stats.sims_error}`,
        body:     "Откройте модуль «Расчёты» для подробностей",
        module:   "cae",
      });
    }

    if (stats.jobs_active > 0) {
      list.push({
        id:       "stats-jobs-active",
        severity: "info",
        title:    `Активных заданий: ${stats.jobs_active}`,
        body:     "Задания ожидают выполнения",
        module:   "analytics",
      });
    }

    if (stats.programs_running > 0) {
      list.push({
        id:       "stats-programs-running",
        severity: "info",
        title:    `Программ в работе: ${stats.programs_running}`,
        body:     "ЧПУ-программы выполняются прямо сейчас",
        module:   "cam",
      });
    }
  }

  // ── Event log — последние 5 значимых событий ─────────────────────────────

  const significantActions = ["error", "fail", "reject", "cancel"];
  const recentErrors = events.filter((e) =>
    significantActions.some((kw) => e.action.toLowerCase().includes(kw)),
  ).slice(0, 3);

  recentErrors.forEach((e) => {
    list.push({
      id:       `event-${e.id}`,
      severity: "error",
      title:    e.action,
      body:     e.entity_type ? `${e.entity_type} #${e.entity_id}` : "Системное событие",
      module:   "home",
    });
  });

  // Сортировка: сначала error, потом warn, потом info
  const order: Record<NotificationSeverity, number> = { error: 0, warn: 1, info: 2 };
  return list.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const [equipment, stats, eventsResp] = await Promise.allSettled([
        apiGet<EquipmentMachine[]>("equipment"),
        apiGet<Stats>("manufacture", "/", { resource: "stats" }),
        apiGet<{ events: EventLogItem[] }>("event-log", "", { limit: 50 }),
      ]);

      const eq     = equipment.status  === "fulfilled" ? equipment.value  : [];
      const st     = stats.status      === "fulfilled" ? stats.value      : null;
      const events = eventsResp.status === "fulfilled" ? (eventsResp.value.events ?? []) : [];

      setNotifications(buildNotifications(eq, st, events));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetch]);

  return { notifications, loading, refetch: fetch };
}