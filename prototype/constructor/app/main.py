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
