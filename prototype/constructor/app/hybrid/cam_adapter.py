"""
CAM-адаптер и журнал событий.

CAM-адаптер решает задачу, которой нет в обычных системах: режимы резки
привязываются не к детали целиком, а к отдельным участкам траектории.
Углы, малые радиусы и заходы требуют иных параметров, чем длинные прямые —
именно на них чаще всего появляется грат и прижоги.

Журнал событий фиксирует всё происходящее и считает метрики, которые
подтверждают эффект внедрения: время подбора, число проходов, доля брака.
"""
from __future__ import annotations

import csv
import io
import math
import re
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Literal

SegmentKind = Literal["line", "arc", "corner", "pierce", "lead_in", "lead_out"]


# ─────────────────── Разбор траектории ───────────────────

@dataclass
class PathSegment:
    """Участок траектории с геометрическими характеристиками."""
    index: int
    kind: SegmentKind
    length_mm: float
    start: tuple[float, float] = (0.0, 0.0)
    end: tuple[float, float] = (0.0, 0.0)
    radius_mm: float | None = None
    angle_deg: float | None = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["start"] = list(self.start)
        d["end"] = list(self.end)
        return d


def parse_gcode(gcode: str) -> list[PathSegment]:
    """
    Разбор управляющей программы на сегменты.

    Поддерживаются линейные (G0/G1) и круговые (G2/G3) перемещения.
    Углы между соседними отрезками распознаются отдельным типом сегмента:
    на них скорость нужно снижать, иначе прожигается внешняя кромка.
    """
    segments: list[PathSegment] = []
    x, y = 0.0, 0.0
    idx = 0
    prev_dir: float | None = None

    for raw in gcode.splitlines():
        line = raw.split(";")[0].split("(")[0].strip().upper()
        if not line:
            continue

        cmd = re.match(r"G0*([0-3])\b", line)
        if not cmd:
            # Команды включения резака трактуются как пробивка
            if re.search(r"\bM0*(3|7|8)\b", line):
                segments.append(PathSegment(index=idx, kind="pierce", length_mm=0.0,
                                            start=(x, y), end=(x, y)))
                idx += 1
            continue

        g = int(cmd.group(1))
        nx = _coord(line, "X", x)
        ny = _coord(line, "Y", y)

        if g in (0, 1):
            length = math.hypot(nx - x, ny - y)
            if length < 1e-9:
                continue

            direction = math.degrees(math.atan2(ny - y, nx - x))
            # Резкая смена направления — угол, требующий снижения скорости
            if prev_dir is not None:
                delta = abs((direction - prev_dir + 180) % 360 - 180)
                if delta > 25:
                    segments.append(PathSegment(index=idx, kind="corner", length_mm=0.0,
                                                start=(x, y), end=(x, y),
                                                angle_deg=round(delta, 1)))
                    idx += 1

            kind: SegmentKind = "lead_in" if g == 0 else "line"
            segments.append(PathSegment(index=idx, kind=kind,
                                        length_mm=round(length, 2),
                                        start=(round(x, 2), round(y, 2)),
                                        end=(round(nx, 2), round(ny, 2))))
            idx += 1
            prev_dir = direction

        else:  # G2 / G3 — дуга
            i = _coord(line, "I", 0.0, relative=True)
            j = _coord(line, "J", 0.0, relative=True)
            radius = math.hypot(i, j)
            chord = math.hypot(nx - x, ny - y)
            # Длина дуги через центральный угол; при вырождении берётся хорда
            if radius > 1e-6 and chord <= 2 * radius:
                central = 2 * math.asin(min(1.0, chord / (2 * radius)))
                length = radius * central
            else:
                length = chord

            segments.append(PathSegment(index=idx, kind="arc",
                                        length_mm=round(length, 2),
                                        start=(round(x, 2), round(y, 2)),
                                        end=(round(nx, 2), round(ny, 2)),
                                        radius_mm=round(radius, 2)))
            idx += 1
            prev_dir = None

        x, y = nx, ny

    return segments


def _coord(line: str, axis: str, default: float, relative: bool = False) -> float:
    m = re.search(rf"{axis}(-?\d+\.?\d*)", line)
    if not m:
        return 0.0 if relative else default
    return float(m.group(1))


# ─────────────────── Привязка режимов к сегментам ───────────────────

@dataclass
class SegmentMode:
    """Режим обработки, назначенный сегменту траектории."""
    segment: PathSegment
    params: dict[str, float]
    feed_override_pct: float
    reason: str

    def to_dict(self) -> dict:
        return {
            "segment": self.segment.to_dict(),
            "params": self.params,
            "feed_override_pct": self.feed_override_pct,
            "reason": self.reason,
        }


def augment_path(
    segments: list[PathSegment],
    base_params: dict[str, float],
    thickness_mm: float,
) -> list[SegmentMode]:
    """
    Назначает режим каждому сегменту траектории.

    Базовый режим корректируется по геометрии: на углах и малых радиусах
    скорость снижается, иначе избыточное тепловложение прожигает кромку.
    Именно эти участки дают основную долю брака при постоянном режиме.
    """
    out: list[SegmentMode] = []
    base_speed = base_params.get("speed_mm_min", 0.0)

    for seg in segments:
        params = dict(base_params)
        override = 100.0
        reason = "Базовый режим для прямолинейного участка"

        if seg.kind == "corner":
            # Чем острее угол, тем сильнее снижение: от 40 до 70 %
            sharpness = min(1.0, (seg.angle_deg or 0) / 90)
            override = 70 - 30 * sharpness
            reason = (f"Угол {seg.angle_deg:.0f}°: снижение скорости предотвращает "
                      "прожог внешней кромки")

        elif seg.kind == "arc" and seg.radius_mm is not None:
            # Малый радиус относительно толщины — та же проблема, что и на углу
            ratio = seg.radius_mm / max(1e-6, thickness_mm)
            if ratio < 1.5:
                override = 60.0
                reason = (f"Радиус {seg.radius_mm:.1f} мм меньше 1,5 толщин: "
                          "риск перегрева внутренней кромки")
            elif ratio < 4:
                override = 80.0
                reason = f"Умеренный радиус {seg.radius_mm:.1f} мм: снижение скорости"
            else:
                reason = "Пологая дуга, базовый режим"

        elif seg.kind == "pierce":
            override = 0.0
            params["speed_mm_min"] = 0.0
            reason = "Пробивка: движение остановлено, повышенное тепловложение"

        elif seg.kind == "lead_in":
            override = 100.0
            reason = "Холостой ход позиционирования"

        if seg.kind not in ("pierce",):
            params["speed_mm_min"] = round(base_speed * override / 100, 1)

        out.append(SegmentMode(segment=seg, params=params,
                               feed_override_pct=round(override, 1), reason=reason))

    return out


def path_summary(modes: list[SegmentMode]) -> dict:
    """Сводка по обогащённой траектории для отчёта и оценки задания."""
    kinds = Counter(m.segment.kind for m in modes)
    total_len = sum(m.segment.length_mm for m in modes if m.segment.kind != "lead_in")
    idle_len = sum(m.segment.length_mm for m in modes if m.segment.kind == "lead_in")

    # Машинное время с учётом фактической скорости на каждом сегменте
    cut_time_min = 0.0
    for m in modes:
        speed = m.params.get("speed_mm_min", 0.0)
        if m.segment.kind == "pierce":
            cut_time_min += 0.02
        elif speed > 0:
            cut_time_min += m.segment.length_mm / speed

    reduced = [m for m in modes if m.feed_override_pct < 100 and m.segment.kind != "pierce"]

    return {
        "segments_total": len(modes),
        "by_kind": dict(kinds),
        "cut_length_mm": round(total_len, 1),
        "cut_length_m": round(total_len / 1000, 3),
        "idle_length_mm": round(idle_len, 1),
        "pierce_count": kinds.get("pierce", 0),
        "estimated_time_min": round(cut_time_min, 2),
        "segments_with_reduced_feed": len(reduced),
        "note": (
            "Режим привязан к участкам траектории: на углах и малых радиусах "
            "скорость снижена, что предотвращает прожог кромки"
        ),
    }


# ─────────────────── Журнал событий ───────────────────

@dataclass
class Event:
    ts: str
    kind: str
    message: str
    payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


class EventLog:
    """
    Журнал событий с расчётом производственных метрик.

    В MVP хранение в памяти; при внедрении заменяется на PostgreSQL
    без изменения интерфейса. Метрики — та самая измеримая база,
    которая подтверждает эффект в отчёте по пилоту.
    """

    def __init__(self, capacity: int = 5000):
        self._events: list[Event] = []
        self._capacity = capacity

    def add(self, kind: str, message: str, payload: dict | None = None) -> Event:
        ev = Event(
            ts=datetime.now().isoformat(timespec="seconds"),
            kind=kind,
            message=message,
            payload=payload or {},
        )
        self._events.append(ev)
        if len(self._events) > self._capacity:
            self._events = self._events[-self._capacity:]
        return ev

    def query(self, kind: str | None = None, since: str | None = None,
              limit: int = 200) -> list[dict]:
        items = self._events
        if kind:
            items = [e for e in items if e.kind == kind]
        if since:
            items = [e for e in items if e.ts >= since]
        return [e.to_dict() for e in reversed(items[-limit:])]

    def metrics(self) -> dict:
        """Производственные метрики для отчёта по пилотному внедрению."""
        kinds = Counter(e.kind for e in self._events)

        corrections = [e for e in self._events if e.kind == "correction"]
        auto = [e for e in corrections if not e.payload.get("requires_confirm")]
        confirmed = [e for e in corrections if e.payload.get("requires_confirm")]

        indices = [e.payload["stability_index"] for e in self._events
                   if "stability_index" in e.payload]
        edge = [e.payload["edge_quality_index"] for e in self._events
                if "edge_quality_index" in e.payload]

        return {
            "events_total": len(self._events),
            "by_kind": dict(kinds),
            "corrections_total": len(corrections),
            "corrections_auto": len(auto),
            "corrections_confirmed": len(confirmed),
            "avg_stability_index": round(sum(indices) / len(indices), 1) if indices else None,
            "min_stability_index": min(indices) if indices else None,
            "avg_edge_quality_index": round(sum(edge) / len(edge), 1) if edge else None,
            "detections_total": kinds.get("detection", 0),
        }

    def to_csv(self) -> str:
        """Выгрузка для MES, 1С и отчётных документов."""
        buf = io.StringIO()
        writer = csv.writer(buf, delimiter=";")
        writer.writerow(["Время", "Тип", "Событие", "Данные"])
        for e in self._events:
            payload = "; ".join(f"{k}={v}" for k, v in e.payload.items())
            writer.writerow([e.ts, e.kind, e.message, payload])
        return buf.getvalue()

    def clear(self) -> None:
        self._events.clear()


# Единый журнал процесса. При переходе на многостаночную схему
# заменяется на словарь журналов по идентификатору станка.
EVENT_LOG = EventLog()
