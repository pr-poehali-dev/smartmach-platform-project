/**
 * useGanttDrag — вся логика перетаскивания/растяжки полос диаграммы Ганта.
 * • localDates — локальные (оптимистичные) даты задач во время drag
 * • drag — текущее состояние перетаскивания
 * • savingId — id задачи, которая сейчас сохраняется в БД
 * Извлечено 1:1 из GanttChart без изменения логики.
 */
import { useState, useEffect, useCallback } from "react";
import { ProjectTask } from "@/lib/projects";
import {
  DragState, DragMode,
  parseDate, addDays, diffDays, scheduleSave,
} from "@/components/smartmach/gantt.utils";

interface Params {
  tasks: ProjectTask[];
  dayW: number;
  onTaskUpdated: () => void;
  onDragStart?: () => void;
}

export function useGanttDrag({ tasks, dayW, onTaskUpdated, onDragStart }: Params) {
  const [localDates, setLocalDates] = useState<Record<number, { start: Date | null; end: Date | null }>>({});
  const [drag, setDrag]       = useState<DragState | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // ── Инициализация localDates из задач ─────────────────────────
  useEffect(() => {
    const init: Record<number, { start: Date | null; end: Date | null }> = {};
    tasks.forEach(t => { init[t.id] = { start: parseDate(t.start_date), end: parseDate(t.due_date) }; });
    setLocalDates(init);
  }, [tasks]);

  // ── Drag handlers ─────────────────────────────────────────────
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startMouseX;
    const deltaDays = Math.round(dx / dayW);

    setLocalDates(prev => {
      const cur = prev[drag.taskId];
      if (!cur) return prev;

      let newStart = cur.start;
      let newEnd   = cur.end;

      if (drag.mode === "move") {
        newStart = drag.origStart ? addDays(drag.origStart, deltaDays) : null;
        newEnd   = drag.origEnd   ? addDays(drag.origEnd,   deltaDays) : null;
      } else {
        const minEnd = drag.origStart ? addDays(drag.origStart, 0) : null;
        let candidate = drag.origEnd ? addDays(drag.origEnd, deltaDays) : null;
        if (candidate && minEnd && diffDays(minEnd, candidate) < 0) candidate = minEnd;
        newEnd = candidate;
      }

      return { ...prev, [drag.taskId]: { start: newStart, end: newEnd } };
    });
  }, [drag, dayW]);

  const onPointerUp = useCallback(() => {
    if (!drag) return;
    const ld = localDates[drag.taskId];
    if (ld) {
      setSavingId(drag.taskId);
      scheduleSave(drag.taskId, ld.start, ld.end, () => {
        setSavingId(null);
        onTaskUpdated();
      });
    }
    setDrag(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [drag, localDates, onTaskUpdated]);

  useEffect(() => {
    if (drag) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = drag.mode === "move" ? "grabbing" : "ew-resize";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      return () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
    }
  }, [drag, onPointerMove, onPointerUp]);

  function startDrag(e: React.PointerEvent, task: ProjectTask, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    onDragStart?.();
    const ld = localDates[task.id] ?? { start: parseDate(task.start_date), end: parseDate(task.due_date) };
    setDrag({
      taskId: task.id,
      mode,
      startMouseX: e.clientX,
      origStart: ld.start ? new Date(ld.start) : null,
      origEnd:   ld.end   ? new Date(ld.end)   : null,
    });
  }

  return { localDates, drag, savingId, startDrag };
}
