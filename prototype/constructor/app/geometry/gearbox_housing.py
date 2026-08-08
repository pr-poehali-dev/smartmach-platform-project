"""
Параметрическая модель корпуса редуктора на pythonocc-core (Open Cascade).

Модуль намеренно изолирован: Decision Engine ничего не знает про OCC,
обмен идёт через простые параметры и результат (файл + метрики).
Это позволяет заменить геометрическое ядро без переписывания логики.

Расширение на другие узлы: наследуйте BaseUnit и реализуйте build().
Если pythonocc-core не установлен, модуль работает в аналитическом режиме
(объём, масса и проверки считаются формулами) — прототип остаётся запускаемым.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:  # OCC — опциональная зависимость (ставится через conda)
    from OCC.Core.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeCylinder
    from OCC.Core.BRepAlgoAPI import BRepAlgoAPI_Cut, BRepAlgoAPI_Fuse, BRepAlgoAPI_Common
    from OCC.Core.gp import gp_Pnt, gp_Ax2, gp_Dir
    from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
    from OCC.Core.StlAPI import StlAPI_Writer
    from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
    from OCC.Core.GProp import GProp_GProps
    from OCC.Core.BRepGProp import brepgprop_VolumeProperties
    OCC_AVAILABLE = True
except ImportError:  # pragma: no cover
    OCC_AVAILABLE = False


# ─────────────────────────── Параметры ───────────────────────────

@dataclass
class HousingParams:
    """Параметры корпуса редуктора. Все размеры в мм."""
    length: float = 320.0
    width: float = 240.0
    height: float = 180.0
    wall: float = 8.0                  # толщина стенки
    flange_thickness: float = 12.0     # толщина фланца разъёма
    bore_diameter: float = 62.0        # посадочное отверстие под подшипник
    bore_positions: list[tuple[float, float]] = field(
        default_factory=lambda: [(90.0, 90.0), (230.0, 90.0)]
    )
    rib_count: int = 4                 # число рёбер жёсткости
    rib_thickness: float = 6.0
    rib_height: float = 25.0
    mount_hole_d: float = 14.0         # крепёжные отверстия в лапах
    material: str = "СЧ20"

    # Технологические минимумы для валидации
    min_wall_by_method: dict = field(default_factory=lambda: {
        "milling": 3.0, "casting": 5.0, "printing": 1.5,
    })

    def max_dim(self) -> float:
        """Наибольший габаритный размер, мм."""
        return max(self.length, self.width, self.height)


@dataclass
class ValidationIssue:
    code: str
    severity: str   # error | warning | info
    message: str


# ─────────────────────────── Базовый класс узла ───────────────────────────

class BaseUnit:
    """Базовый класс типового узла. Наследуйте для валов, фланцев, кронштейнов."""

    name = "base"

    def build(self) -> Any:
        raise NotImplementedError

    def validate(self) -> list[ValidationIssue]:
        raise NotImplementedError


# ─────────────────────────── Корпус редуктора ───────────────────────────

class GearboxHousing(BaseUnit):
    """Строит параметрический корпус редуктора: короб, полость, бобышки, рёбра."""

    name = "gearbox_housing"

    def __init__(self, params: HousingParams | None = None) -> None:
        self.p = params or HousingParams()
        self.shape = None

    # ---------- Валидация (работает без OCC) ----------

    def validate(self, method: str = "casting") -> list[ValidationIssue]:
        """Проверка минимальных толщин, коллизий отверстий и габаритов."""
        p = self.p
        issues: list[ValidationIssue] = []

        # 1. Минимальная толщина стенки под выбранную технологию
        min_wall = p.min_wall_by_method.get(method, 3.0)
        if p.wall < min_wall:
            issues.append(ValidationIssue(
                "WALL_TOO_THIN", "error",
                f"Толщина стенки {p.wall} мм меньше минимума {min_wall} мм для технологии «{method}»",
            ))

        # 2. Отношение толщины стенки к габариту (риск коробления)
        if p.wall < p.max_dim() / 60:
            issues.append(ValidationIssue(
                "WALL_RATIO", "warning",
                f"Стенка {p.wall} мм тонка для габарита {p.max_dim():.0f} мм — риск коробления и вибраций",
            ))

        # 3. Коллизии посадочных отверстий между собой
        r = p.bore_diameter / 2
        for i, (x1, y1) in enumerate(p.bore_positions):
            for j, (x2, y2) in enumerate(p.bore_positions[i + 1:], start=i + 1):
                dist = ((x1 - x2) ** 2 + (y1 - y2) ** 2) ** 0.5
                if dist < p.bore_diameter + 2 * p.wall:
                    issues.append(ValidationIssue(
                        "BORE_COLLISION", "error",
                        f"Отверстия #{i + 1} и #{j + 1}: расстояние {dist:.1f} мм — "
                        f"перемычка меньше двух толщин стенки",
                    ))

            # 4. Выход отверстия за габарит корпуса
            if x1 - r < p.wall or x1 + r > p.length - p.wall:
                issues.append(ValidationIssue(
                    "BORE_OUT_OF_BOUNDS", "error",
                    f"Отверстие #{i + 1} выходит за пределы корпуса по оси X",
                ))
            if y1 - r < p.wall or y1 + r > p.height - p.wall:
                issues.append(ValidationIssue(
                    "BORE_OUT_OF_BOUNDS", "error",
                    f"Отверстие #{i + 1} выходит за пределы корпуса по оси Y",
                ))

        # 5. Рёбра жёсткости
        if p.rib_thickness < p.wall * 0.6:
            issues.append(ValidationIssue(
                "RIB_THIN", "warning",
                "Ребро тоньше 0.6 толщины стенки — эффективность жёсткости снижена",
            ))
        if p.rib_count > 0:
            step = p.length / (p.rib_count + 1)
            if step < p.rib_thickness * 4:
                issues.append(ValidationIssue(
                    "RIB_DENSE", "warning",
                    "Рёбра расположены слишком часто — усложняется формовка и обработка",
                ))

        if not issues:
            issues.append(ValidationIssue("OK", "info", "Проверки пройдены, критичных замечаний нет"))
        return issues

    # ---------- Аналитические метрики (без OCC) ----------

    def metrics(self) -> dict:
        """Объём, масса и площадь — аналитическая оценка, доступна всегда."""
        p = self.p
        outer = p.length * p.width * p.height
        inner = max(0.0, (p.length - 2 * p.wall) * (p.width - 2 * p.wall) * (p.height - 2 * p.wall))
        ribs = p.rib_count * p.rib_thickness * p.rib_height * (p.width - 2 * p.wall)
        bores = sum(3.1416 * (p.bore_diameter / 2) ** 2 * p.wall * 2 for _ in p.bore_positions)

        volume_mm3 = outer - inner + ribs - bores
        density = {"СЧ20": 7.2e-6, "АК12": 2.65e-6, "PA12": 1.01e-6}.get(p.material, 7.85e-6)

        return {
            "volume_cm3": round(volume_mm3 / 1000, 2),
            "mass_kg": round(volume_mm3 * density, 3),
            "bounding_box_mm": [p.length, p.width, p.height],
            "bore_count": len(p.bore_positions),
            "rib_count": p.rib_count,
            "occ_available": OCC_AVAILABLE,
        }

    # ---------- Построение геометрии (требует OCC) ----------

    def build(self):
        """Строит твердотельную модель. Возвращает TopoDS_Shape."""
        if not OCC_AVAILABLE:
            raise RuntimeError(
                "pythonocc-core не установлен. Используйте Docker-образ или conda. "
                "Метрики и валидация доступны без OCC."
            )
        p = self.p

        # 1) Наружный короб
        shape = BRepPrimAPI_MakeBox(gp_Pnt(0, 0, 0), p.length, p.width, p.height).Shape()

        # 2) Внутренняя полость (выборка стенок)
        cavity = BRepPrimAPI_MakeBox(
            gp_Pnt(p.wall, p.wall, p.wall),
            p.length - 2 * p.wall, p.width - 2 * p.wall, p.height - 2 * p.wall,
        ).Shape()
        shape = BRepAlgoAPI_Cut(shape, cavity).Shape()

        # 3) Рёбра жёсткости на верхней плоскости
        if p.rib_count > 0:
            step = p.length / (p.rib_count + 1)
            for i in range(1, p.rib_count + 1):
                rib = BRepPrimAPI_MakeBox(
                    gp_Pnt(i * step - p.rib_thickness / 2, p.wall, p.height),
                    p.rib_thickness, p.width - 2 * p.wall, p.rib_height,
                ).Shape()
                shape = BRepAlgoAPI_Fuse(shape, rib).Shape()

        # 4) Бобышки и посадочные отверстия под подшипники (ось Y)
        for (x, z) in p.bore_positions:
            boss = BRepPrimAPI_MakeCylinder(
                gp_Ax2(gp_Pnt(x, 0, z), gp_Dir(0, 1, 0)),
                p.bore_diameter / 2 + p.wall, p.width,
            ).Shape()
            shape = BRepAlgoAPI_Fuse(shape, boss).Shape()

            hole = BRepPrimAPI_MakeCylinder(
                gp_Ax2(gp_Pnt(x, -1, z), gp_Dir(0, 1, 0)),
                p.bore_diameter / 2, p.width + 2,
            ).Shape()
            shape = BRepAlgoAPI_Cut(shape, hole).Shape()

        # 5) Крепёжные отверстия в основании
        for x in (p.length * 0.15, p.length * 0.85):
            for y in (p.width * 0.2, p.width * 0.8):
                mh = BRepPrimAPI_MakeCylinder(
                    gp_Ax2(gp_Pnt(x, y, -1), gp_Dir(0, 0, 1)),
                    p.mount_hole_d / 2, p.wall + 2,
                ).Shape()
                shape = BRepAlgoAPI_Cut(shape, mh).Shape()

        self.shape = shape
        return shape

    def occ_volume(self) -> float:
        """Точный объём средствами OCC, см³."""
        if self.shape is None:
            self.build()
        props = GProp_GProps()
        brepgprop_VolumeProperties(self.shape, props)
        return round(props.Mass() / 1000, 2)

    # ---------- Экспорт ----------

    def export_step(self, path: str | Path) -> str:
        if self.shape is None:
            self.build()
        writer = STEPControl_Writer()
        writer.Transfer(self.shape, STEPControl_AsIs)
        writer.Write(str(path))
        return str(path)

    def export_stl(self, path: str | Path, deflection: float = 0.3) -> str:
        if self.shape is None:
            self.build()
        BRepMesh_IncrementalMesh(self.shape, deflection)
        writer = StlAPI_Writer()
        writer.SetASCIIMode(False)
        writer.Write(self.shape, str(path))
        return str(path)


if __name__ == "__main__":
    import json

    unit = GearboxHousing()
    print(json.dumps({
        "metrics": unit.metrics(),
        "validation": [i.__dict__ for i in unit.validate("casting")],
    }, ensure_ascii=False, indent=2))