"""
Раскрой листа (nesting) и технико-экономический расчёт резки.

Алгоритм: размещение по габаритным прямоугольникам методом полос
(shelf/next-fit decreasing) с учётом межконтурного зазора и кромки листа.
Для прототипа этого достаточно: даёт честный коэффициент использования
и реалистичную оценку расхода металла.

Промышленный уровень (true shape nesting по реальному контуру) —
следующий этап; интерфейс модуля при замене алгоритма не меняется.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from app.cutting.geometry2d import Part
from app.cutting.postprocessor import CutDatabase, CutMode

DB_PATH = Path(__file__).parent / "cut_database.json"

# Типовые листы российского сортамента, мм
STANDARD_SHEETS = {
    "1250x2500": (1250.0, 2500.0),
    "1500x3000": (1500.0, 3000.0),
    "2000x6000": (2000.0, 6000.0),
}


@dataclass
class Placement:
    """Размещение одного экземпляра детали на листе."""
    part_name: str
    x: float
    y: float
    width: float
    height: float
    rotated: bool = False


@dataclass
class NestingResult:
    sheet_width: float
    sheet_height: float
    placements: list[Placement] = field(default_factory=list)
    unplaced: list[str] = field(default_factory=list)
    sheets_used: int = 1

    def used_area(self) -> float:
        return sum(p.width * p.height for p in self.placements)

    def sheet_area(self) -> float:
        return self.sheet_width * self.sheet_height * self.sheets_used

    def utilization(self) -> float:
        """Коэффициент использования металла, %. Ключевой показатель экономии."""
        return round(self.used_area() / self.sheet_area() * 100, 1) if self.sheet_area() else 0.0


class Nester:
    """Размещение деталей на листе методом полос."""

    def __init__(self, sheet_width: float, sheet_height: float,
                 gap: float = 8.0, margin: float = 10.0) -> None:
        self.w = sheet_width
        self.h = sheet_height
        self.gap = gap          # зазор между деталями (тепловой режим + керф)
        self.margin = margin    # отступ от кромки листа

    def nest(self, parts: list[Part]) -> NestingResult:
        """Размещает детали с учётом количества каждой позиции."""
        items: list[tuple[str, float, float]] = []
        for p in parts:
            w, h = p.size()
            for i in range(p.qty):
                items.append((f"{p.name}#{i + 1}", w, h))

        # Сначала крупные — даёт заметно лучшее заполнение
        items.sort(key=lambda it: max(it[1], it[2]), reverse=True)

        res = NestingResult(self.w, self.h)
        cur_x = cur_y = self.margin
        shelf_h = 0.0
        sheets = 1

        for name, w, h in items:
            rotated = False
            # Поворот на 90°, если так деталь помещается по ширине листа
            if w > self.w - 2 * self.margin and h <= self.w - 2 * self.margin:
                w, h = h, w
                rotated = True

            if w > self.w - 2 * self.margin or h > self.h - 2 * self.margin:
                res.unplaced.append(name)
                continue

            # Не помещается в текущую полосу — переходим на новую
            if cur_x + w > self.w - self.margin:
                cur_x = self.margin
                cur_y += shelf_h + self.gap
                shelf_h = 0.0

            # Лист закончился — берём следующий
            if cur_y + h > self.h - self.margin:
                sheets += 1
                cur_x = cur_y = self.margin
                shelf_h = 0.0

            res.placements.append(Placement(name, cur_x, cur_y, w, h, rotated))
            cur_x += w + self.gap
            shelf_h = max(shelf_h, h)

        res.sheets_used = sheets
        return res


# ─────────────────────────── Экономика резки ───────────────────────────

@dataclass
class CuttingEstimate:
    """Результат технико-экономического расчёта."""
    cut_length_m: float
    pierce_count: int
    cut_time_min: float
    pierce_time_min: float
    rapid_time_min: float
    total_time_min: float
    material_mass_kg: float
    material_cost: float
    machine_cost: float
    consumable_cost: float
    total_cost: float
    cost_per_part: float
    utilization_pct: float
    sheets_used: int

    def to_dict(self) -> dict:
        return {k: (round(v, 2) if isinstance(v, float) else v)
                for k, v in self.__dict__.items()}


class CuttingCalculator:
    """Расчёт времени и себестоимости термической резки."""

    RAPID_FEED = 20000.0   # холостой ход, мм/мин
    SETUP_MIN = 12.0       # подготовка: загрузка листа, привязка нуля

    def __init__(self, db: CutDatabase | None = None) -> None:
        self.db = db or CutDatabase()

    def estimate(self, parts: list[Part], mode: CutMode,
                 nesting: NestingResult, total_qty: int | None = None) -> CuttingEstimate:
        src = self.db.sources()[mode.source]
        mat = self.db.data["materials"][mode.material]

        qty_total = total_qty or sum(p.qty for p in parts)

        # Длина реза и пробивки по всем экземплярам
        cut_mm = sum(p.total_cut_length() * p.qty for p in parts)
        pierces = sum(p.pierce_count() * p.qty for p in parts)

        # Подводы добавляют длину: считаем усреднённо
        lead_mm = pierces * max(4.0, mode.kerf * 2)
        cut_mm += lead_mm

        cut_time = cut_mm / mode.feed
        pierce_time = pierces * mode.pierce_time * src["pierce_delay_factor"] / 60
        rapid_time = (pierces * 350.0) / self.RAPID_FEED  # оценка перемещений
        total_time = cut_time + pierce_time + rapid_time + self.SETUP_MIN

        # Металл оплачивается по листу целиком — это принципиально для экономики
        sheet_area_m2 = nesting.sheet_width * nesting.sheet_height / 1e6
        mass = sheet_area_m2 * nesting.sheets_used * (mode.thickness / 1000) * mat["density_kg_m3"]
        material_cost = mass * mat["price_per_kg"]

        hours = total_time / 60
        machine_cost = hours * src["hourly_rate_rub"]
        consumable_cost = hours * src["consumable_cost_per_hour"]
        total_cost = material_cost + machine_cost + consumable_cost

        return CuttingEstimate(
            cut_length_m=cut_mm / 1000,
            pierce_count=pierces,
            cut_time_min=cut_time,
            pierce_time_min=pierce_time,
            rapid_time_min=rapid_time,
            total_time_min=total_time,
            material_mass_kg=mass,
            material_cost=material_cost,
            machine_cost=machine_cost,
            consumable_cost=consumable_cost,
            total_cost=total_cost,
            cost_per_part=total_cost / max(1, qty_total),
            utilization_pct=nesting.utilization(),
            sheets_used=nesting.sheets_used,
        )

    def compare_sources(self, parts: list[Part], material: str, thickness: float,
                        sheet: str = "1500x3000", quality: str = "standard") -> list[dict]:
        """
        Сравнение источников резки — главный сценарий для технолога:
        плазма дешевле по машинному часу, лазер точнее и быстрее на тонком листе.
        """
        w, h = STANDARD_SHEETS[sheet]
        nesting = Nester(w, h).nest(parts)

        out: list[dict] = []
        for key, src in self.db.sources().items():
            try:
                mode = self.db.get_mode(key, material, thickness, quality)
            except ValueError as e:
                out.append({"source": key, "title": src["title"],
                            "feasible": False, "reason": str(e)})
                continue

            est = self.estimate(parts, mode, nesting)
            out.append({
                "source": key,
                "title": src["title"],
                "feasible": True,
                "kerf_mm": mode.kerf,
                "feed_mm_min": mode.feed,
                "tolerance_mm": self.db.data["quality_grades"][quality]["tolerance_mm"],
                "estimate": est.to_dict(),
                "notes": src["notes"],
            })

        out.sort(key=lambda r: (not r["feasible"],
                                r.get("estimate", {}).get("cost_per_part", 9e9)))
        return out
