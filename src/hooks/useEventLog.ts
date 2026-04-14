import { useCallback } from "react";
import { apiPost, apiGet } from "@/lib/api";

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
      await apiPost("event-log", { action, entity_type, entity_id, details });
    } catch {
      // silent
    }
  }, []);

  const fetchEvents = useCallback(async (limit = 50): Promise<EventLogEntry[]> => {
    try {
      const data = await apiGet<{ events: EventLogEntry[] }>("event-log", "", { limit });
      return data.events ?? [];
    } catch {
      return [];
    }
  }, []);

  return { logEvent, fetchEvents };
}
