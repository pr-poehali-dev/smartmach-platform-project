"""
SmartMach — Конструктор типовых узлов. FastAPI-сервис.

Слой API: только валидация, оркестрация и выдача результата.
Вся логика принятия решений — в app/core/decision_engine.py.
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.core.decision_engine import DecisionEngine, Requirements
from app.geometry.gearbox_housing import GearboxHousing, HousingParams
from app.reports.report_schema import build_report
from app.reports.generator import render_excel, render_pdf

app = FastAPI(
    title="SmartMach — Конструктор типовых узлов",
    description="Выбор технологии, расчёт себестоимости, параметрическая модель и отчёты",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

ENGINE = DecisionEngine()
OUTPUT_DIR = Path("/tmp/smartmach_output")
OUTPUT_DIR.mkdir(exist_ok=True)

# In-memory хранилище прототипа (в проде — PostgreSQL)
PROJECTS: dict[str, dict] = {}


# ─────────────────────────── Схемы ───────────────────────────

class RequirementsIn(BaseModel):
    length_mm: float = Field(320, gt=0, le=2000, description="Длина, мм")
    width_mm: float = Field(240, gt=0, le=2000)
    height_mm: float = Field(180, gt=0, le=2000)
    wall_thickness_mm: float = Field(8, gt=0, le=100)
    material: str = Field("СЧ20")
    batch_size: int = Field(50, ge=1, le=100000)
    tolerance_grade: int = Field(9, ge=5, le=14, description="Квалитет по ГОСТ 25346")
    deadline_days: int = Field(30, ge=1)
    complexity: Literal["low", "medium", "high", "very_high"] = "medium"
    purpose: Literal["production", "prototype"] = "production"
    has_milling_machine: bool = True
    has_casting_line: bool = False
    has_printer: bool = True


class ProjectIn(BaseModel):
    name: str = "Корпус редуктора"
    customer: str = "—"
    unit_type: Literal["gearbox_housing"] = "gearbox_housing"


def _to_requirements(r: RequirementsIn) -> Requirements:
    return Requirements(**r.model_dump())


# ─────────────────────────── Эндпоинты ───────────────────────────

@app.get("/health", tags=["Сервис"])
def health() -> dict:
    """Проверка работоспособности сервиса."""
    from app.geometry.gearbox_housing import OCC_AVAILABLE
    return {"status": "ok", "occ_available": OCC_AVAILABLE, "rules_version": ENGINE.rules_data["version"]}


@app.get("/api/v1/schema/{unit_type}", tags=["Мастер"])
def get_schema(unit_type: str) -> dict:
    """JSON Schema для генерации формы мастера требований на фронте."""
    if unit_type != "gearbox_housing":
        raise HTTPException(404, "Тип узла не поддерживается")
    return RequirementsIn.model_json_schema()


@app.post("/api/v1/projects", tags=["Проекты"])
def create_project(payload: ProjectIn) -> dict:
    """Создание проекта."""
    pid = str(uuid.uuid4())[:8]
    PROJECTS[pid] = {"id": pid, **payload.model_dump(), "status": "created"}
    return PROJECTS[pid]


@app.post("/api/v1/calculate", tags=["Расчёт"])
def calculate(payload: RequirementsIn) -> dict:
    """
    Расчёт 3 вариантов производства без создания проекта.
    Основной сценарий демонстрации: требования → варианты со сроком и стоимостью.
    """
    return ENGINE.recommend(_to_requirements(payload))


@app.post("/api/v1/projects/{pid}/calculate", tags=["Расчёт"])
def calculate_project(pid: str, payload: RequirementsIn) -> dict:
    """Расчёт вариантов в контексте проекта с сохранением результата."""
    if pid not in PROJECTS:
        raise HTTPException(404, "Проект не найден")
    result = ENGINE.recommend(_to_requirements(payload))
    PROJECTS[pid].update({"requirements": payload.model_dump(), "result": result, "status": "calculated"})
    return result


@app.post("/api/v1/projects/{pid}/generate", tags=["Геометрия"])
def generate_model(pid: str, method: str = "casting") -> dict:
    """Построение параметрической модели и проверка технологичности."""
    project = PROJECTS.get(pid)
    if not project or "requirements" not in project:
        raise HTTPException(404, "Проект не найден или не рассчитан")

    r = project["requirements"]
    params = HousingParams(
        length=r["length_mm"], width=r["width_mm"], height=r["height_mm"],
        wall=r["wall_thickness_mm"], material=r["material"],
    )
    unit = GearboxHousing(params)
    metrics = unit.metrics()
    validation = [i.__dict__ for i in unit.validate(method)]

    project.update({"metrics": metrics, "validation": validation, "status": "generated"})
    return {"metrics": metrics, "validation": validation}


@app.post("/api/v1/projects/{pid}/export", tags=["Экспорт"])
def export_files(pid: str, formats: list[str] = ["step", "stl"]) -> dict:
    """Экспорт файлов для производства. STEP/STL требуют pythonocc-core."""
    project = PROJECTS.get(pid)
    if not project or "requirements" not in project:
        raise HTTPException(404, "Проект не найден или не рассчитан")

    r = project["requirements"]
    unit = GearboxHousing(HousingParams(
        length=r["length_mm"], width=r["width_mm"], height=r["height_mm"],
        wall=r["wall_thickness_mm"], material=r["material"],
    ))

    out: dict[str, str] = {}
    errors: dict[str, str] = {}
    for fmt in formats:
        try:
            target = OUTPUT_DIR / f"{pid}.{fmt}"
            if fmt == "step":
                out["step"] = unit.export_step(target)
            elif fmt == "stl":
                out["stl"] = unit.export_stl(target)
        except RuntimeError as e:
            errors[fmt] = str(e)

    return {"files": out, "errors": errors}


@app.get("/api/v1/projects/{pid}/report", tags=["Отчёты"])
def get_report(pid: str, fmt: Literal["json", "pdf", "xlsx"] = "json"):
    """Отчёт: спецификация, маршрутная карта, себестоимость."""
    project = PROJECTS.get(pid)
    if not project or "result" not in project:
        raise HTTPException(404, "Проект не рассчитан")

    variant = project["result"]["variants"][0]
    metrics = project.get("metrics") or GearboxHousing().metrics()
    validation = project.get("validation", [])
    report = build_report(
        {**project, **project.get("requirements", {})}, variant, metrics, validation
    )

    if fmt == "json":
        return report
    if fmt == "xlsx":
        path = render_excel(report, OUTPUT_DIR / f"{pid}.xlsx")
        return FileResponse(path, filename=f"report_{pid}.xlsx")
    path = render_pdf(report, OUTPUT_DIR / f"{pid}.pdf")
    return FileResponse(path, filename=Path(path).name)


@app.get("/api/v1/rules", tags=["Правила"])
def get_rules() -> dict:
    """Текущий набор правил Decision Engine."""
    return ENGINE.rules_data


# ═══════════════════ CAM: плазменная и лазерная резка ═══════════════════

class HoleIn(BaseModel):
    x: float
    y: float
    diameter: float = Field(gt=0)


class PartIn(BaseModel):
    name: str = "Деталь"
    width_mm: float = Field(300, gt=0, le=6000)
    height_mm: float = Field(200, gt=0, le=6000)
    qty: int = Field(1, ge=1, le=10000)
    holes: list[HoleIn] = []


class CuttingIn(BaseModel):
    parts: list[PartIn]
    material: Literal["S235", "AISI304", "AlMg3"] = "S235"
    thickness_mm: float = Field(8, gt=0, le=50)
    sheet: Literal["1250x2500", "1500x3000", "2000x6000"] = "1500x3000"
    quality: Literal["rough", "standard", "precision"] = "standard"


class GCodeIn(CuttingIn):
    source: Literal["plasma_air", "plasma_precision", "laser_fiber"] = "plasma_air"
    postprocessor: Literal["hypertherm", "linuxcnc", "laser"] = "hypertherm"


def _build_parts(items: list[PartIn]) -> list:
    from app.cutting.geometry2d import Part, circle, rect
    out = []
    for p in items:
        holes = [
            circle(h.x, h.y, h.diameter, name=f"Отв{i}")
            for i, h in enumerate(p.holes, 1)
        ]
        out.append(Part(
            outer=rect(0, 0, p.width_mm, p.height_mm, "Контур"),
            holes=holes, name=p.name, qty=p.qty,
        ))
    return out


@app.get("/api/v1/cutting/database", tags=["Резка"])
def cutting_database() -> dict:
    """Справочник источников резки, материалов и классов качества."""
    from app.cutting.postprocessor import CutDatabase
    db = CutDatabase()
    return {
        "sources": db.sources(),
        "materials": db.data["materials"],
        "quality_grades": db.data["quality_grades"],
        "postprocessors": ["hypertherm", "linuxcnc", "laser"],
    }


@app.post("/api/v1/cutting/compare", tags=["Резка"])
def cutting_compare(payload: CuttingIn) -> dict:
    """
    Сравнение источников резки: плазма воздушная, плазма HD, волоконный лазер.
    Возвращает время, себестоимость и коэффициент использования металла.
    """
    from app.cutting.nesting import STANDARD_SHEETS, CuttingCalculator, Nester
    from app.cutting.geometry2d import validate_part
    from app.cutting.postprocessor import CutDatabase

    parts = _build_parts(payload.parts)
    calc = CuttingCalculator(CutDatabase())
    options = calc.compare_sources(
        parts, payload.material, payload.thickness_mm, payload.sheet, payload.quality
    )

    w, h = STANDARD_SHEETS[payload.sheet]
    nesting = Nester(w, h).nest(parts)

    validation: list[dict] = []
    ref_kerf = next((o["kerf_mm"] for o in options if o["feasible"]), 2.0)
    for p in parts:
        for issue in validate_part(p, ref_kerf, payload.thickness_mm):
            if issue["code"] != "OK":
                validation.append({"part": p.name, **issue})

    return {
        "options": options,
        "nesting": {
            "sheet": payload.sheet,
            "sheets_used": nesting.sheets_used,
            "utilization_pct": nesting.utilization(),
            "placed": len(nesting.placements),
            "unplaced": nesting.unplaced,
        },
        "validation": validation or [{"code": "OK", "severity": "info",
                                      "message": "Замечаний по технологичности нет"}],
    }


@app.post("/api/v1/cutting/gcode", tags=["Резка"])
def cutting_gcode(payload: GCodeIn) -> dict:
    """Генерация управляющей программы (G-код) для выбранного станка."""
    from app.cutting.postprocessor import CutDatabase, get_postprocessor

    db = CutDatabase()
    try:
        mode = db.get_mode(payload.source, payload.material,
                           payload.thickness_mm, payload.quality)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    parts = _build_parts(payload.parts)
    if not parts:
        raise HTTPException(400, "Не передано ни одной детали")

    pp = get_postprocessor(payload.postprocessor, mode)
    gcode = pp.build(parts[0], db)

    fname = f"cut_{uuid.uuid4().hex[:8]}.{pp.ext}"
    (OUTPUT_DIR / fname).write_text(gcode, encoding="utf-8")

    return {
        "mode": {
            "kerf_mm": mode.kerf, "feed_mm_min": mode.feed,
            "pierce_s": mode.pierce_time, "amps": mode.amps,
        },
        "stats": pp.stats(),
        "file": fname,
        "gcode": gcode,
    }