"""
2D-геометрия для термической резки: контуры, компенсация ширины реза (керф),
подводы/отводы, порядок обхода.

Ключевое отличие от фрезеровки: инструмент имеет физическую ширину реза,
поэтому траектория смещается на половину керфа — наружу для наружного контура
и внутрь для отверстий. Иначе деталь уйдёт в брак по размеру.

Зависимости: только стандартная библиотека — модуль переносим и легко тестируется.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal

Point = tuple[float, float]


# ─────────────────────────── Базовые примитивы ───────────────────────────

@dataclass
class Contour:
    """
    Замкнутый контур в виде полилинии.

    is_hole=True — внутренний контур (отверстие), режется первым:
    сначала все отверстия, потом наружный контур, иначе деталь
    выпадет из листа до окончания обработки.
    """
    points: list[Point]
    is_hole: bool = False
    name: str = "contour"

    def is_closed(self, tol: float = 1e-6) -> bool:
        if len(self.points) < 3:
            return False
        (x1, y1), (x2, y2) = self.points[0], self.points[-1]
        return math.hypot(x2 - x1, y2 - y1) < tol

    def close(self) -> None:
        """Замыкает контур, если он не замкнут."""
        if not self.is_closed() and self.points:
            self.points.append(self.points[0])

    def length(self) -> float:
        """Периметр контура, мм."""
        return sum(
            math.dist(self.points[i], self.points[i + 1])
            for i in range(len(self.points) - 1)
        )

    def area(self) -> float:
        """Площадь по формуле шнурования (Гаусса), мм². Знак отброшен."""
        pts = self.points if self.is_closed() else [*self.points, self.points[0]]
        s = sum(
            pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
            for i in range(len(pts) - 1)
        )
        return abs(s) / 2

    def is_clockwise(self) -> bool:
        pts = self.points if self.is_closed() else [*self.points, self.points[0]]
        s = sum(
            (pts[i + 1][0] - pts[i][0]) * (pts[i + 1][1] + pts[i][1])
            for i in range(len(pts) - 1)
        )
        return s > 0

    def bounds(self) -> tuple[float, float, float, float]:
        """min_x, min_y, max_x, max_y."""
        xs = [p[0] for p in self.points]
        ys = [p[1] for p in self.points]
        return min(xs), min(ys), max(xs), max(ys)

    def centroid(self) -> Point:
        x0, y0, x1, y1 = self.bounds()
        return ((x0 + x1) / 2, (y0 + y1) / 2)

    def min_feature_size(self) -> float:
        """Наименьший размер элемента — для проверки технологичности."""
        x0, y0, x1, y1 = self.bounds()
        return min(x1 - x0, y1 - y0)


@dataclass
class Part:
    """Деталь: наружный контур плюс отверстия."""
    outer: Contour
    holes: list[Contour] = field(default_factory=list)
    name: str = "part"
    qty: int = 1

    def net_area(self) -> float:
        """Чистая площадь металла детали, мм²."""
        return self.outer.area() - sum(h.area() for h in self.holes)

    def total_cut_length(self) -> float:
        return self.outer.length() + sum(h.length() for h in self.holes)

    def pierce_count(self) -> int:
        """Число пробивок — критично для ресурса расходников и времени."""
        return 1 + len(self.holes)

    def bounds(self) -> tuple[float, float, float, float]:
        xs, ys = [], []
        for c in [self.outer, *self.holes]:
            x0, y0, x1, y1 = c.bounds()
            xs += [x0, x1]
            ys += [y0, y1]
        return min(xs), min(ys), max(xs), max(ys)

    def size(self) -> tuple[float, float]:
        x0, y0, x1, y1 = self.bounds()
        return x1 - x0, y1 - y0


# ─────────────────────────── Керф-компенсация ───────────────────────────

def offset_contour(contour: Contour, distance: float) -> Contour:
    """
    Смещение контура на заданное расстояние (компенсация керфа).

    Реализация: смещение каждого сегмента по нормали с пересечением соседних
    смещённых прямых. Достаточно для выпуклых и слабовогнутых контуров типовых
    деталей. Для сложных случаев с самопересечениями следует подключить
    полноценный clipper (pyclipper) — интерфейс функции при этом не изменится.
    """
    pts = contour.points[:-1] if contour.is_closed() else contour.points[:]
    n = len(pts)
    if n < 3 or abs(distance) < 1e-9:
        return Contour(contour.points[:], contour.is_hole, contour.name)

    # Направление смещения: наружу для наружного контура, внутрь для отверстия.
    # Знак зависит от направления обхода, т.к. нормаль строится от него.
    sign = 1.0 if contour.is_clockwise() else -1.0
    d = distance * sign * (-1.0 if contour.is_hole else 1.0)

    lines: list[tuple[float, float, float]] = []  # прямые вида a*x + b*y = c
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        seg = math.hypot(dx, dy)
        if seg < 1e-9:
            continue
        nx, ny = -dy / seg, dx / seg          # единичная нормаль
        px, py = x1 + nx * d, y1 + ny * d     # точка на смещённой прямой
        lines.append((-dy, dx, -dy * px + dx * py))

    out: list[Point] = []
    m = len(lines)
    for i in range(m):
        a1, b1, c1 = lines[i - 1]
        a2, b2, c2 = lines[i]
        det = a1 * b2 - a2 * b1
        if abs(det) < 1e-9:      # почти параллельны — острый угол
            continue
        out.append(((c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det))

    if len(out) < 3:
        return Contour(contour.points[:], contour.is_hole, contour.name)

    out.append(out[0])
    return Contour(out, contour.is_hole, contour.name)


# ─────────────────────────── Подводы и отводы ───────────────────────────

@dataclass
class LeadIn:
    """Подвод: точка пробивки вне контура детали, чтобы дефект не попал на кромку."""
    pierce_point: Point
    entry_point: Point
    kind: Literal["line", "arc"] = "line"
    length: float = 0.0


def make_lead_in(contour: Contour, kerf: float, thickness: float,
                 rules: dict) -> LeadIn:
    """
    Строит подвод к контуру.

    Пробивка всегда выполняется в стороне от чистовой кромки: в момент
    прожига образуется кратер и разбрызгивание металла, попадание которого
    на кромку детали недопустимо.
    """
    cfg = rules["inner_contour"] if contour.is_hole else rules["outer_contour"]
    length = max(cfg["min_mm"], kerf * cfg["length_factor"], thickness * 0.5)

    entry = contour.points[0]
    nxt = contour.points[1] if len(contour.points) > 1 else entry

    dx, dy = nxt[0] - entry[0], nxt[1] - entry[1]
    seg = math.hypot(dx, dy) or 1.0
    # Нормаль к первому сегменту: для отверстия уводим внутрь, для контура наружу
    nx, ny = (-dy / seg, dx / seg)
    direction = 1.0 if contour.is_hole else -1.0

    pierce = (entry[0] + nx * length * direction,
              entry[1] + ny * length * direction)

    return LeadIn(pierce_point=pierce, entry_point=entry,
                  kind=cfg["type"], length=length)


# ─────────────────────────── Проверка технологичности ───────────────────────────

def validate_part(part: Part, kerf: float, thickness: float) -> list[dict]:
    """
    Проверка выполнимости резки: мелкие отверстия, узкие перемычки, замкнутость.
    Правило отрасли: диаметр отверстия не меньше толщины листа (для плазмы —
    с запасом), иначе прожиг вместо реза.
    """
    issues: list[dict] = []

    if not part.outer.is_closed():
        issues.append({"code": "OPEN_CONTOUR", "severity": "error",
                       "message": "Наружный контур не замкнут — резка невозможна"})

    min_hole = thickness * 1.0 if kerf < 0.5 else thickness * 1.5
    for i, h in enumerate(part.holes, 1):
        size = h.min_feature_size()
        if size < min_hole:
            issues.append({
                "code": "HOLE_TOO_SMALL", "severity": "error",
                "message": (f"Отверстие #{i}: размер {size:.1f} мм меньше минимума "
                            f"{min_hole:.1f} мм для толщины {thickness} мм — "
                            f"рекомендуется сверление"),
            })
        elif size < min_hole * 1.5:
            issues.append({
                "code": "HOLE_RISKY", "severity": "warning",
                "message": f"Отверстие #{i}: размер {size:.1f} мм близок к пределу, возможна конусность",
            })
        if not h.is_closed():
            issues.append({"code": "OPEN_HOLE", "severity": "error",
                           "message": f"Контур отверстия #{i} не замкнут"})

    # Узкие перемычки между отверстиями
    for i, h1 in enumerate(part.holes, 1):
        for j, h2 in enumerate(part.holes[i:], i + 1):
            c1, c2 = h1.centroid(), h2.centroid()
            gap = math.dist(c1, c2) - (h1.min_feature_size() + h2.min_feature_size()) / 2
            if gap < thickness:
                issues.append({
                    "code": "THIN_WEB", "severity": "warning",
                    "message": (f"Перемычка между отверстиями #{i} и #{j} около "
                                f"{gap:.1f} мм — риск прогара и коробления"),
                })

    w, h_ = part.size()
    if min(w, h_) < thickness * 2:
        issues.append({"code": "PART_TOO_NARROW", "severity": "warning",
                       "message": "Деталь узкая относительно толщины — вероятно коробление от нагрева"})

    if not issues:
        issues.append({"code": "OK", "severity": "info",
                       "message": "Технологических препятствий для резки не выявлено"})
    return issues


# ─────────────────────────── Фабрики типовых контуров ───────────────────────────

def rect(x: float, y: float, w: float, h: float, name: str = "rect") -> Contour:
    """Прямоугольный контур против часовой стрелки."""
    return Contour([(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)], False, name)


def circle(cx: float, cy: float, d: float, segments: int = 48,
           is_hole: bool = True, name: str = "circle") -> Contour:
    """Окружность как полилиния. 48 сегментов — компромисс точности и размера G-кода."""
    r = d / 2
    pts = [
        (cx + r * math.cos(2 * math.pi * i / segments),
         cy + r * math.sin(2 * math.pi * i / segments))
        for i in range(segments + 1)
    ]
    return Contour(pts, is_hole, name)