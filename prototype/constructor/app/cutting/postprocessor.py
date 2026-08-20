"""
Генератор управляющих программ (G-код) для плазменной и лазерной резки.

Архитектура: абстрактный PostProcessor задаёт скелет программы, конкретные
диалекты (Hypertherm, Beckhoff/LinuxCNC, Ruida) переопределяют команды
включения источника, пробивки и управления высотой.

Такое разделение — существенная часть ценности продукта: одна траектория
выгружается на любой станок предприятия без переделки.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.cutting.geometry2d import Contour, LeadIn, Part, make_lead_in, offset_contour

DB_PATH = Path(__file__).parent / "cut_database.json"


# ─────────────────────────── Режимы резки ───────────────────────────

@dataclass
class CutMode:
    """Технологический режим для конкретной пары «источник — материал — толщина»."""
    source: str
    material: str
    thickness: float
    kerf: float
    feed: float           # мм/мин
    pierce_time: float    # с
    amps: int
    quality: str = "standard"

    @property
    def kerf_offset(self) -> float:
        """Половина ширины реза — величина смещения траектории."""
        return self.kerf / 2


class CutDatabase:
    """Доступ к базе режимов с интерполяцией по толщине."""

    def __init__(self, path: Path | str = DB_PATH) -> None:
        with open(path, encoding="utf-8") as f:
            self.data = json.load(f)

    def sources(self) -> dict:
        return self.data["sources"]

    def get_mode(self, source: str, material: str, thickness: float,
                 quality: str = "standard") -> CutMode:
        """
        Подбор режима. Если точной толщины нет в таблице — линейная
        интерполяция между соседними, что типично для технологических карт.
        """
        table = self.data["modes"].get(source, {}).get(material)
        if not table:
            raise ValueError(f"Нет режимов для источника «{source}» и материала «{material}»")

        max_t = self.data["sources"][source]["max_thickness_mm"]
        if thickness > max_t:
            raise ValueError(
                f"Толщина {thickness} мм превышает предел {max_t} мм для «{source}»"
            )

        rows = sorted(table, key=lambda r: r["thickness"])
        lo = hi = None
        for r in rows:
            if r["thickness"] <= thickness:
                lo = r
            if r["thickness"] >= thickness and hi is None:
                hi = r

        if lo is None:
            lo = hi = rows[0]
        if hi is None:
            hi = lo

        if lo["thickness"] == hi["thickness"]:
            kerf, feed, pierce, amps = lo["kerf"], lo["feed"], lo["pierce_s"], lo["amps"]
        else:
            t = (thickness - lo["thickness"]) / (hi["thickness"] - lo["thickness"])
            lerp = lambda a, b: a + (b - a) * t  # noqa: E731
            kerf = round(lerp(lo["kerf"], hi["kerf"]), 2)
            feed = round(lerp(lo["feed"], hi["feed"]))
            pierce = round(lerp(lo["pierce_s"], hi["pierce_s"]), 2)
            amps = round(lerp(lo["amps"], hi["amps"]))

        q = self.data["quality_grades"].get(quality, {"feed_factor": 1.0})
        return CutMode(
            source=source, material=material, thickness=thickness,
            kerf=kerf, feed=round(feed * q["feed_factor"]),
            pierce_time=pierce, amps=amps, quality=quality,
        )

    def lead_rules(self) -> dict:
        return self.data["lead_in_rules"]


# ─────────────────────────── Постпроцессоры ───────────────────────────

class PostProcessor(ABC):
    """Базовый постпроцессор: общий скелет управляющей программы."""

    name = "generic"
    ext = "nc"

    def __init__(self, mode: CutMode) -> None:
        self.mode = mode
        self.lines: list[str] = []
        self.pierce_count = 0
        self.rapid_mm = 0.0
        self.cut_mm = 0.0

    # --- команды, зависящие от станка ---

    @abstractmethod
    def torch_on(self) -> list[str]: ...

    @abstractmethod
    def torch_off(self) -> list[str]: ...

    @abstractmethod
    def pierce(self) -> list[str]: ...

    def header(self) -> list[str]:
        m = self.mode
        return [
            f"; Управляющая программа — SmartMach CAM",
            f"; Постпроцессор: {self.name}",
            f"; Дата: {datetime.now():%Y-%m-%d %H:%M}",
            f"; Материал: {m.material}, толщина {m.thickness} мм",
            f"; Источник: {m.source}, ток {m.amps} A" if m.amps else f"; Источник: {m.source}",
            f"; Керф {m.kerf} мм, подача {m.feed} мм/мин, качество: {m.quality}",
            "",
            "G21 ; единицы — миллиметры",
            "G90 ; абсолютные координаты",
            "G40 ; отмена коррекции (компенсация выполнена в траектории)",
            "G17 ; плоскость XY",
        ]

    def footer(self) -> list[str]:
        return ["", "G0 X0 Y0 ; возврат в ноль", "M30 ; конец программы"]

    # --- движения ---

    def rapid(self, x: float, y: float) -> None:
        self.lines.append(f"G0 X{x:.3f} Y{y:.3f}")

    def cut_to(self, x: float, y: float) -> None:
        self.lines.append(f"G1 X{x:.3f} Y{y:.3f} F{self.mode.feed}")

    # --- обработка контура ---

    def process_contour(self, contour: Contour, lead: LeadIn) -> None:
        """Подвод, пробивка, обход контура, отвод."""
        self.lines.append(f"; --- {contour.name} ---")
        self.rapid(*lead.pierce_point)
        self.lines += self.pierce()
        self.pierce_count += 1
        self.cut_to(*lead.entry_point)

        for x, y in contour.points[1:]:
            self.cut_to(x, y)

        self.cut_mm += contour.length() + lead.length
        self.lines += self.torch_off()
        self.lines.append("")

    def build(self, part: Part, db: CutDatabase) -> str:
        """
        Полная программа для детали.

        Порядок принципиален: сначала внутренние контуры, затем наружный.
        Если резать наоборот, деталь отделится от листа и отверстия уйдут в брак.
        """
        self.lines = self.header()
        rules = db.lead_rules()
        off = self.mode.kerf_offset

        for hole in part.holes:
            comp = offset_contour(hole, off)
            comp.name = hole.name
            lead = make_lead_in(comp, self.mode.kerf, self.mode.thickness, rules)
            self.process_contour(comp, lead)

        outer = offset_contour(part.outer, off)
        outer.name = part.outer.name
        lead = make_lead_in(outer, self.mode.kerf, self.mode.thickness, rules)
        self.process_contour(outer, lead)

        self.lines += self.footer()
        return "\n".join(self.lines)

    def stats(self) -> dict:
        return {
            "pierce_count": self.pierce_count,
            "cut_length_mm": round(self.cut_mm, 1),
            "line_count": len(self.lines),
            "postprocessor": self.name,
        }


class HyperthermPlasma(PostProcessor):
    """Плазменные ЧПУ Hypertherm/EDGE: M07/M08, автоматический контроль высоты (THC)."""

    name = "Hypertherm EDGE (плазма)"
    ext = "txt"

    def torch_on(self) -> list[str]:
        return ["M07 ; включение плазмотрона"]

    def torch_off(self) -> list[str]:
        return ["M08 ; выключение плазмотрона"]

    def pierce(self) -> list[str]:
        return [
            "M07 ; включение плазмотрона",
            f"G04 P{self.mode.pierce_time:.2f} ; выдержка на пробивку",
            "M50 ; включить THC — контроль высоты по напряжению дуги",
        ]

    def footer(self) -> list[str]:
        return ["", "M51 ; выключить THC", "G0 X0 Y0", "M30"]


class LinuxCNCPlasma(PostProcessor):
    """LinuxCNC с THC: свободный стек, подходит для отечественной сборки станка."""

    name = "LinuxCNC (плазма, THC)"
    ext = "ngc"

    def torch_on(self) -> list[str]:
        return ["M3 S1 ; включение резака"]

    def torch_off(self) -> list[str]:
        return ["M5 ; выключение резака"]

    def pierce(self) -> list[str]:
        return [
            "M3 S1 ; включение резака",
            f"G4 P{self.mode.pierce_time:.2f} ; пробивка",
            "M65 P0 ; разрешить THC",
        ]


class FiberLaser(PostProcessor):
    """
    Волоконный лазер: управление мощностью, вспомогательным газом
    и режимом пробивки (ramp piercing на больших толщинах).
    """

    name = "Fiber Laser (Ruida/Beckhoff)"
    ext = "nc"

    def torch_on(self) -> list[str]:
        return ["M3 ; излучение включено"]

    def torch_off(self) -> list[str]:
        return ["M5 ; излучение выключено"]

    def pierce(self) -> list[str]:
        power = 60 if self.mode.thickness <= 6 else 100
        cmds = ["M8 ; подача вспомогательного газа"]
        if self.mode.thickness > 8:
            cmds.append("; ступенчатая пробивка для толстого листа")
            cmds.append("S40 M3")
            cmds.append(f"G4 P{self.mode.pierce_time * 0.4:.2f}")
        cmds += [
            f"S{power} M3 ; мощность {power}%",
            f"G4 P{self.mode.pierce_time:.2f} ; пробивка",
        ]
        return cmds

    def footer(self) -> list[str]:
        return ["", "M9 ; отключение газа", "M5", "G0 X0 Y0", "M30"]


POSTPROCESSORS: dict[str, type[PostProcessor]] = {
    "hypertherm": HyperthermPlasma,
    "linuxcnc": LinuxCNCPlasma,
    "laser": FiberLaser,
}


def get_postprocessor(key: str, mode: CutMode) -> PostProcessor:
    cls = POSTPROCESSORS.get(key)
    if cls is None:
        raise ValueError(f"Неизвестный постпроцессор «{key}». Доступны: {list(POSTPROCESSORS)}")
    return cls(mode)
