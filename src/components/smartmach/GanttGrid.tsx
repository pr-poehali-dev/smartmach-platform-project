/**
 * GanttGrid — полотно диаграммы Ганта (правая прокручиваемая часть):
 * шапка дат, фон выходных, недельные линии, линия «сегодня», диапазон проекта и строки задач.
 * Извлечено 1:1 из GanttChart без изменения логики.
 */
import React from "react";
import { ProjectTask } from "@/lib/projects";
import { DragMode, parseDate, diffDays } from "@/components/smartmach/gantt.utils";
import GanttHeader from "@/components/smartmach/GanttHeader";
import GanttRow from "@/components/smartmach/GanttRow";

interface Props {
  tasks: ProjectTask[];
  scale: "month" | "week" | "day";
  dayW: number;
  rangeStart: Date;
  totalDays: number;
  gridWidth: number;
  months: ReturnType<typeof import("@/components/smartmach/gantt.utils").buildMonths>;
  dayLabels: { offset: number; label: string; weekend: boolean }[];
  weekendCols: number[];
  todayOff: number;
  todayX: number;
  projectStart: string | null;
  projectEnd: string | null;
  localDates: Record<number, { start: Date | null; end: Date | null }>;
  drag: { taskId: number; mode: DragMode } | null;
  savingId: number | null;
  barGeom: (taskId: number) => { left: number; width: number; valid: boolean };
  onPointerDown: (e: React.PointerEvent, task: ProjectTask, mode: DragMode) => void;
  onBarMouseEnter: (e: React.MouseEvent, task: ProjectTask) => void;
  onBarMouseLeave: () => void;
}

export default function GanttGrid({
  tasks, scale, dayW, rangeStart, totalDays, gridWidth,
  months, dayLabels, weekendCols, todayOff, todayX,
  projectStart, projectEnd, localDates, drag, savingId, barGeom,
  onPointerDown, onBarMouseEnter, onBarMouseLeave,
}: Props) {
  return (
    <div style={{ width: Math.max(gridWidth, 400), position: "relative" }}>

      <GanttHeader
        months={months}
        dayLabels={dayLabels}
        dayW={dayW}
        scale={scale}
        todayOff={todayOff}
        todayX={todayX}
        totalDays={totalDays}
      />

      {/* Полотно задач */}
      <div className="relative">

        {/* Фон выходных */}
        {weekendCols.map(off => (
          <div
            key={off}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: off * dayW, width: dayW, background: "rgba(239,68,68,0.04)" }}
          />
        ))}

        {/* Вертикальные линии недель */}
        {dayLabels
          .filter((_, i) => i % (scale === "day" ? 7 : 1) === 0)
          .map(dl => (
            <div
              key={dl.offset}
              className="absolute top-0 bottom-0 pointer-events-none border-l border-border/20"
              style={{ left: dl.offset * dayW }}
            />
          ))}

        {/* Линия «сегодня» */}
        {todayOff >= 0 && todayOff <= totalDays && (
          <div
            className="absolute top-0 bottom-0 z-10 pointer-events-none"
            style={{ left: todayX, width: 2, background: "rgba(239,68,68,0.6)", borderRadius: 1 }}
          >
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-500" />
          </div>
        )}

        {/* Диапазон проекта */}
        {projectStart && projectEnd && (() => {
          const ps = parseDate(projectStart);
          const pe = parseDate(projectEnd);
          if (!ps || !pe) return null;
          const left  = diffDays(rangeStart, ps) * dayW;
          const width = (diffDays(ps, pe) + 1) * dayW;
          return (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-0"
              style={{
                left, width,
                background: "rgba(99,102,241,0.04)",
                borderLeft:  "2px solid rgba(99,102,241,0.3)",
                borderRight: "2px solid rgba(99,102,241,0.3)",
              }}
            />
          );
        })()}

        {/* Строки задач */}
        {tasks.map((task, i) => (
          <GanttRow
            key={task.id}
            task={task}
            index={i}
            geom={barGeom(task.id)}
            localDate={localDates[task.id]}
            isDragging={drag?.taskId === task.id}
            isSaving={savingId === task.id}
            dragMode={drag ? drag.mode : null}
            dayW={dayW}
            todayX={todayX}
            onPointerDown={onPointerDown}
            onMouseEnter={onBarMouseEnter}
            onMouseLeave={onBarMouseLeave}
          />
        ))}

        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}
