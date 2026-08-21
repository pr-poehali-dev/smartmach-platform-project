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


# ═════════ Адаптивное управление гибридным лазерно-плазменным процессом ═════════

class ConditionsIn(BaseModel):
    process_id: Literal["weld_al_6", "cut_steel_10"] = "weld_al_6"
    gap_mm: float = Field(0.2, ge=0, le=5)
    surface: Literal["clean", "oxidized", "contaminated"] = "clean"
    electrode_wear_pct: float = Field(0, ge=0, le=100)
    quality_target: Literal["standard", "high"] = "standard"
    stability_priority: bool = False


class SignalIn(BaseModel):
    voltage: list[float] = []
    current: list[float] = []
    laser_power: list[float] = []
    spectral_ratio: float | None = None
    hydrogen_index: float | None = None


class MonitorIn(BaseModel):
    conditions: ConditionsIn = ConditionsIn()
    signal: SignalIn | None = None
    demo_signal: Literal["stable", "arc_wander", "double_arcing", "power_drift"] | None = None
    baseline: dict | None = None
    params: dict | None = None
    allow_critical: bool = False


@app.get("/api/v1/hybrid/processes", tags=["Гибридный процесс"])
def hybrid_processes() -> dict:
    """Список поддерживаемых гибридных процессов и правил подбора режима."""
    from app.hybrid.adaptive_control import ModeSelector
    ms = ModeSelector()
    return {
        "processes": ms.list_processes(),
        "rules_count": len(ms.start_rules),
        "signatures": {k: v["title"] for k, v in ms.data["instability_signatures"].items()},
        "safety": ms.data["safety"],
    }


@app.post("/api/v1/hybrid/mode", tags=["Гибридный процесс"])
def hybrid_mode(payload: ConditionsIn) -> dict:
    """
    Подбор стартового режима по условиям на рабочем месте.
    Заменяет 3-5 пробных проходов обоснованной точкой входа.
    """
    from app.hybrid.adaptive_control import ModeSelector, ProcessConditions
    try:
        return ModeSelector().select(ProcessConditions(**payload.model_dump()))
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@app.post("/api/v1/hybrid/monitor", tags=["Гибридный процесс"])
def hybrid_monitor(payload: MonitorIn) -> dict:
    """
    Полный цикл адаптивного управления: подбор режима, анализ осциллограмм,
    детекция нестабильности и выработка безопасной коррекции.

    Для демонстрации без установки можно передать demo_signal.
    """
    from app.hybrid.adaptive_control import (
        AdaptiveController, InstabilityDetector, ModeSelector,
        ProcessConditions, Signal, synth_signal,
    )

    ms, det, ctl = ModeSelector(), InstabilityDetector(), AdaptiveController()

    try:
        mode = ms.select(ProcessConditions(**payload.conditions.model_dump()))
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    params = payload.params or dict(mode["start_params"])

    if payload.demo_signal:
        sig = synth_signal(payload.demo_signal)
        baseline = payload.baseline or det.features(synth_signal("stable"))
    elif payload.signal:
        sig = Signal(**payload.signal.model_dump())
        baseline = payload.baseline
    else:
        raise HTTPException(400, "Передайте signal или demo_signal")

    detection = det.detect(sig, baseline=baseline)
    corrections = ctl.propose(detection, params, mode["limits"])
    result = ctl.apply(params, corrections, allow_confirm_required=payload.allow_critical)

    return {
        "process": mode["process"],
        "detection": detection,
        "params_before": params,
        "params_after": result["params"],
        "applied": result["applied"],
        "pending_confirmation": result["pending_confirmation"],
        "safety_note": result["safety_note"],
        "checklist": mode["checklist"],
    }


# ═══════════════ Слой интеграции: REST API для ЧПУ, CAM и MES ═══════════════

class RecommendIn(BaseModel):
    """Запрос подбора режима — основной вход для CAM и технолога."""
    material: Literal["Ст3", "S235", "09Г2С"] = "Ст3"
    thickness_mm: float = Field(10, ge=3, le=20)
    edge_quality: Literal["min_burr", "max_speed", "balanced"] = "balanced"
    gas: Literal["O2", "air", "N2"] = "O2"


class StabilityIn(BaseModel):
    """Осциллограммы с датчиков для детекции нестабильности."""
    current_a_series: list[float] = Field(default_factory=list)
    voltage_v_series: list[float] = Field(default_factory=list)
    laser_power_w_series: list[float] = Field(default_factory=list)
    thickness_mm: float = Field(10, ge=3, le=20)
    params: dict | None = None


class CamAugmentIn(BaseModel):
    """Обогащение управляющей программы режимами по сегментам."""
    gcode: str
    thickness_mm: float = Field(10, ge=3, le=20)
    params: dict | None = None


class CostIn(BaseModel):
    thickness_mm: float = Field(10, ge=3, le=20)
    cut_length_m: float = Field(250, gt=0)
    pierce_count: int = Field(60, ge=0)
    params: dict | None = None
    expected_defect_pct: float | None = None
    # Довести режим до оптимума перед расчётом. Именно это делает комплекс
    # в работе, поэтому сравнение «как есть» против «как должно быть»
    # отражает реальную выгоду от внедрения.
    optimize: bool = True


class MachineConnectIn(BaseModel):
    transport: Literal["opcua", "modbus", "mqtt", "simulator"] = "simulator"
    endpoint: str | None = None
    scenario: Literal["stable", "arc_wander", "double_arcing", "power_drift"] = "stable"


def _steel_process(thickness_mm: float):
    """Подбирает ближайший процесс резки из технологической базы."""
    from app.hybrid.adaptive_control import ModeSelector

    ms = ModeSelector()
    cutting = {k: v for k, v in ms.processes.items() if v["kind"] == "cutting"}
    best = min(cutting.items(),
               key=lambda kv: abs(kv[1]["thickness_mm"] - thickness_mm))
    return best[0], best[1]


@app.post("/api/v1/recommend", tags=["Интеграция"])
def recommend_mode(payload: RecommendIn) -> dict:
    """
    Подбор режима резки под материал, толщину и требования к кромке.

    Заменяет 3-5 пробных проходов обоснованной точкой входа.
    """
    from app.hybrid.cam_adapter import EVENT_LOG
    from app.hybrid.steel_cutting import (
        nominal_gas_flow, optimal_speed, predict_edge_quality,
    )

    proc_id, proc = _steel_process(payload.thickness_mm)
    t = payload.thickness_mm

    params = dict(proc["start_params"])
    params["speed_mm_min"] = round(optimal_speed(t, params["laser_power_w"]), 1)
    params["gas_flow_l_min"] = round(nominal_gas_flow(t), 1)
    params["focus_offset_mm"] = round(-t * 0.22, 2)

    # Приоритет качества кромки против производительности
    if payload.edge_quality == "min_burr":
        params["speed_mm_min"] = round(params["speed_mm_min"] * 0.88, 1)
        params["gas_flow_l_min"] = round(params["gas_flow_l_min"] * 1.1, 1)
    elif payload.edge_quality == "max_speed":
        params["speed_mm_min"] = round(params["speed_mm_min"] * 1.08, 1)

    for key, lim in proc["limits"].items():
        if key in params:
            params[key] = round(max(lim[0], min(lim[1], params[key])), 2)

    quality = predict_edge_quality(t, params)

    EVENT_LOG.add("recommend", f"Подбор режима: {payload.material} {t:g} мм",
                  {"edge_quality": payload.edge_quality,
                   "edge_quality_index": quality.edge_quality_index})

    return {
        "process_id": proc_id,
        "material": payload.material,
        "thickness_mm": t,
        "gas": payload.gas,
        "laser_power_w": params["laser_power_w"],
        "plasma_current_a": params["plasma_current_a"],
        "feed_rate_mm_min": params["speed_mm_min"],
        "gas_flow_l_min": params["gas_flow_l_min"],
        "focus_offset_mm": params["focus_offset_mm"],
        "params": params,
        "limits": proc["limits"],
        "edge_quality": quality.to_dict(),
        "checklist": proc.get("checklist", []),
    }


@app.post("/api/v1/stability", tags=["Интеграция"])
def check_stability(payload: StabilityIn) -> dict:
    """
    Детекция нестабильности по осциллограммам и прогноз качества кромки.

    Возвращает категорию дефекта, уверенность и готовую рекомендацию
    для оператора либо для автоматической коррекции подачи.
    """
    from app.hybrid.adaptive_control import InstabilityDetector, Signal
    from app.hybrid.cam_adapter import EVENT_LOG
    from app.hybrid.steel_cutting import predict_edge_quality, propose_edge_corrections

    if not payload.current_a_series and not payload.voltage_v_series:
        raise HTTPException(400, "Передайте current_a_series и voltage_v_series")

    det = InstabilityDetector()
    sig = Signal(
        voltage=payload.voltage_v_series,
        current=payload.current_a_series,
        laser_power=payload.laser_power_w_series,
    )
    detection = det.detect(sig)

    proc_id, proc = _steel_process(payload.thickness_mm)
    params = payload.params or dict(proc["start_params"])
    quality = predict_edge_quality(payload.thickness_mm, params, detection["features"])
    edge_corr = propose_edge_corrections(quality, params, proc["limits"])

    top = detection["detections"][0] if detection["detections"] else None
    defect = quality.defects[0] if quality.defects else None

    # Рекомендация в машиночитаемом виде — для автоматической отработки
    recommendation = None
    if edge_corr:
        c = edge_corr[0]
        direction = "increase" if c["change_pct"] > 0 else "reduce"
        recommendation = f"{direction}_{c['param']}_by_{abs(c['change_pct']):.0f}_percent"

    EVENT_LOG.add(
        "detection",
        f"Анализ сигнала: индекс {detection['stability_index']}, кромка {quality.edge_quality_index}",
        {"stability_index": detection["stability_index"],
         "edge_quality_index": quality.edge_quality_index},
    )

    return {
        "is_unstable": detection["status"] != "stable",
        "stability_index": detection["stability_index"],
        "status": detection["status"],
        "defect_type": defect.kind if defect else (top["key"] if top else None),
        "defect_title": defect.title if defect else (top["title"] if top else None),
        "confidence": round(max([d["confidence"] for d in detection["detections"]] or [0]), 2),
        "recommendation": recommendation,
        "features": detection["features"],
        "detections": detection["detections"],
        "edge_quality": quality.to_dict(),
        "corrections": edge_corr,
    }


@app.post("/api/v1/cam/augment", tags=["Интеграция"])
def cam_augment(payload: CamAugmentIn) -> dict:
    """
    Привязка режимов к сегментам траектории.

    На углах и малых радиусах скорость снижается — именно эти участки
    дают основную долю брака при постоянном режиме обработки.
    """
    from app.hybrid.cam_adapter import (
        EVENT_LOG, augment_path, parse_gcode, path_summary,
    )
    from app.hybrid.steel_cutting import nominal_gas_flow, optimal_speed

    segments = parse_gcode(payload.gcode)
    if not segments:
        raise HTTPException(400, "В управляющей программе не найдено перемещений")

    proc_id, proc = _steel_process(payload.thickness_mm)
    base = payload.params or {
        **proc["start_params"],
        "speed_mm_min": round(optimal_speed(payload.thickness_mm,
                                            proc["start_params"]["laser_power_w"]), 1),
        "gas_flow_l_min": round(nominal_gas_flow(payload.thickness_mm), 1),
    }

    modes = augment_path(segments, base, payload.thickness_mm)
    summary = path_summary(modes)

    EVENT_LOG.add("cam", f"Обогащено сегментов: {summary['segments_total']}",
                  {"cut_length_m": summary["cut_length_m"]})

    return {
        "process_id": proc_id,
        "thickness_mm": payload.thickness_mm,
        "base_params": base,
        "summary": summary,
        "segments": [m.to_dict() for m in modes],
    }


@app.post("/api/v1/cost", tags=["Интеграция"])
def calc_job_cost(payload: CostIn) -> dict:
    """Себестоимость задания: сравнение ручного подбора и работы с комплексом."""
    from app.hybrid.steel_cutting import (
        Economics, compare_economics, converge_to_optimum, predict_edge_quality,
    )

    proc_id, proc = _steel_process(payload.thickness_mm)
    params = payload.params or dict(proc["start_params"])

    convergence: list[dict] = []
    final_params = dict(params)

    if payload.optimize:
        convergence = converge_to_optimum(
            payload.thickness_mm, params, proc["limits"],
        )
        final_params = dict(convergence[-1]["params"])

    quality = predict_edge_quality(payload.thickness_mm, final_params)
    defect_pct = (payload.expected_defect_pct
                  if payload.expected_defect_pct is not None
                  else quality.expected_defect_pct)

    result = compare_economics(
        payload.thickness_mm, params, final_params,
        payload.cut_length_m, payload.pierce_count, defect_pct, Economics(),
    )
    result["process_id"] = proc_id
    result["params_before"] = params
    result["params_after"] = final_params
    result["edge_quality"] = quality.to_dict()
    result["convergence"] = [
        {
            "step": s["step"],
            "edge_quality_index": s["edge_quality_index"],
            "expected_defect_pct": s["expected_defect_pct"],
            "speed_mm_min": round(s["params"].get("speed_mm_min", 0), 1),
            "gas_flow_l_min": round(s["params"].get("gas_flow_l_min", 0), 1),
        }
        for s in convergence
    ]
    result["corrections_needed"] = max(0, len(convergence) - 1)
    return result


@app.get("/api/v1/events", tags=["Интеграция"])
def get_events(kind: str | None = None, since: str | None = None,
               limit: int = 200) -> dict:
    """Журнал событий и производственные метрики для MES и отчётов."""
    from app.hybrid.cam_adapter import EVENT_LOG

    return {
        "events": EVENT_LOG.query(kind=kind, since=since, limit=limit),
        "metrics": EVENT_LOG.metrics(),
    }


@app.get("/api/v1/events/export", tags=["Интеграция"])
def export_events() -> dict:
    """Выгрузка журнала в CSV для 1С, Excel и отчётных документов."""
    from app.hybrid.cam_adapter import EVENT_LOG

    return {"format": "csv", "delimiter": ";", "content": EVENT_LOG.to_csv()}


@app.get("/api/v1/machine/transports", tags=["Интеграция"])
def machine_transports() -> dict:
    """
    Доступные транспорты связи с оборудованием.

    Драйверы промышленных протоколов опциональны: при их отсутствии
    работает симулятор, что позволяет проверить весь контур без цеха.
    """
    from app.hybrid.cnc_adapters import transports_info

    return {"transports": transports_info()}


@app.post("/api/v1/machine/status", tags=["Интеграция"])
def machine_status(payload: MachineConnectIn) -> dict:
    """Состояние станка через выбранный транспорт."""
    from app.hybrid.adaptive_control import InstabilityDetector, Signal
    from app.hybrid.cnc_adapters import create_adapter

    kwargs: dict = {}
    if payload.transport == "simulator":
        kwargs["scenario"] = payload.scenario
    elif payload.endpoint:
        kwargs["endpoint"] = payload.endpoint

    adapter = create_adapter(payload.transport, **kwargs)
    conn = adapter.connect()
    if not conn.ok:
        return {"connected": False, "detail": conn.detail,
                "transport": payload.transport, "adapter": adapter.describe()}

    status = adapter.read_status()
    signal = adapter.read_signal(240)

    detection = None
    if signal["current"]:
        det = InstabilityDetector()
        detection = det.detect(Signal(
            voltage=signal["voltage"],
            current=signal["current"],
            laser_power=signal["laser_power"],
        ))

    return {
        "connected": True,
        "transport": payload.transport,
        "status": status.to_dict(),
        "detection": detection,
        "adapter": adapter.describe(),
    }