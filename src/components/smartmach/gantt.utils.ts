import { projPut } from "@/lib/projects";

// ─── Константы ─────────────────────────────────────────────────
export const ROW_H   = 40;
export const NAME_W  = 240;
export const HDR_H   = 56;

export const SCALE_DAY_W: Record<string, number> = { month: 10, week: 20, day: 40 };

// ─── Цвета полос по статусу ────────────────────────────────────
export const BAR_CFG: Record<string, { bg: string; border: string; text: string }> = {
  todo:        { bg: "#cbd5e1", border: "#94a3b8", text: "#475569" },
  in_progress: { bg: "#60a5fa", border: "#2563eb", text: "#fff"   },
  review:      { bg: "#fbbf24", border: "#d97706", text: "#fff"   },
  done:        { bg: "#34d399", border: "#059669", text: "#fff"   },
  cancelled:   { bg: "#fca5a5", border: "#ef4444", text: "#b91c1c"},
};

// ─── Типы drag ────────────────────────────────────────────────
export type DragMode = "move" | "resize-right";
export interface DragState {
  taskId: number;
  mode: DragMode;
  startMouseX: number;
  origStart: Date | null;
  origEnd: Date | null;
}

// ─── Утилиты дат ───────────────────────────────────────────────
export function toMidnight(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s); return isNaN(d.getTime()) ? null : toMidnight(d);
}
export function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function isWeekend(d: Date): boolean {
  const dow = d.getDay(); return dow === 0 || dow === 6;
}
export function fmtShort(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}
export function fmtFull(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}
export function fmtMonth(d: Date): string {
  return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

// ─── Строим шапку месяцев ─────────────────────────────────────
export function buildMonths(start: Date, total: number): { label: string; days: number }[] {
  const out: { label: string; days: number }[] = [];
  let cur = new Date(start); let rem = total;
  while (rem > 0) {
    const eom = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    toMidnight(eom);
    const days = Math.min(diffDays(cur, eom) + 1, rem);
    out.push({ label: fmtMonth(cur), days });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    rem -= days;
  }
  return out;
}

// ─── Debounced сохранение в БД ────────────────────────────────
const saveTimers: Record<number, ReturnType<typeof setTimeout>> = {};
export function scheduleSave(id: number, start: Date | null, end: Date | null, onSaved: () => void) {
  clearTimeout(saveTimers[id]);
  saveTimers[id] = setTimeout(async () => {
    try {
      await projPut(
        { start_date: start ? toISO(start) : null, due_date: end ? toISO(end) : null },
        { resource: "task", id }
      );
      onSaved();
    } catch { /* ignore */ }
  }, 600);
}
