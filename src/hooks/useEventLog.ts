import { useCallback } from "react";
import { getAuthHeaders } from "@/hooks/useAuth";

const EVENT_LOG_URL = "https://functions.poehali.dev/318eff41-5ba7-4ff4-b7c1-0d5768543d88";

export interface EventLogEntry {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export function useEventLog() {
  const logEvent = useCallback(async (
    action: string,
    entity_type?: string,
    entity_id?: string | number,
    details?: string,
  ) => {
    try {
      await fetch(EVENT_LOG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action, entity_type, entity_id, details }),
      });
    } catch {
      // silent
    }
  }, []);

  const fetchEvents = useCallback(async (limit = 50): Promise<EventLogEntry[]> => {
    try {
      const res = await fetch(`${EVENT_LOG_URL}?limit=${limit}`, {
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.events ?? [];
    } catch {
      return [];
    }
  }, []);

  return { logEvent, fetchEvents };
}
