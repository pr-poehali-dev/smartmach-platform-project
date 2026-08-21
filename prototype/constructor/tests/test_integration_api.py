"""
Тесты слоя интеграции: подбор режима, детекция, CAM-адаптер, экономика.

Проверяют не только коды ответов, но и технологический смысл результата:
режим из базы не должен давать дефектов, отклонение режима обязано
диагностироваться, а коррекции — сходиться к допуску.

Запуск: python3 -m pytest tests/ -v
"""
from __future__ import annotations

import random

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

STEEL_THICKNESSES = [6, 8, 10, 12]


def _noisy_signal(sigma_current: float, sigma_voltage: float, n: int = 240, seed: int = 7):
    rng = random.Random(seed)
    return (
        [110 + rng.gauss(0, sigma_current) for _ in range(n)],
        [28 + rng.gauss(0, sigma_voltage) for _ in range(n)],
    )


# ─────────────────── Подбор режима ───────────────────

@pytest.mark.parametrize("thickness", STEEL_THICKNESSES)
def test_recommend_returns_valid_mode(thickness: int) -> None:
    """Для каждой толщины подбирается режим в пределах допустимых диапазонов."""
    r = client.post("/api/v1/recommend",
                    json={"material": "Ст3", "thickness_mm": thickness})
    assert r.status_code == 200

    d = r.json()
    assert d["thickness_mm"] == thickness
    assert d["feed_rate_mm_min"] > 0
    assert d["laser_power_w"] > 0

    # Каждый параметр обязан лежать внутри технологических пределов
    for key, (lo, hi) in d["limits"].items():
        if key in d["params"]:
            assert lo <= d["params"][key] <= hi, f"{key} вне диапазона"


@pytest.mark.parametrize("thickness", STEEL_THICKNESSES)
def test_recommended_mode_has_no_edge_defects(thickness: int) -> None:
    """
    Ключевая проверка калибровки: штатный режим не должен давать
    предпосылок к дефектам. Ложные срабатывания на старте подрывают
    доверие технолога к системе.
    """
    r = client.post("/api/v1/recommend",
                    json={"material": "Ст3", "thickness_mm": thickness})
    eq = r.json()["edge_quality"]

    assert eq["edge_quality_index"] == 100
    assert eq["defects"] == []
    assert eq["grade"] == "good"


def test_min_burr_is_slower_than_max_speed() -> None:
    """Приоритет качества кромки должен снижать скорость относительно скоростного режима."""
    slow = client.post("/api/v1/recommend",
                       json={"thickness_mm": 10, "edge_quality": "min_burr"}).json()
    fast = client.post("/api/v1/recommend",
                       json={"thickness_mm": 10, "edge_quality": "max_speed"}).json()

    assert slow["feed_rate_mm_min"] < fast["feed_rate_mm_min"]
    assert slow["gas_flow_l_min"] >= fast["gas_flow_l_min"]


# ─────────────────── Детекция нестабильности ───────────────────

def test_stable_signal_is_not_flagged() -> None:
    """Стабильный процесс не должен вызывать ложную тревогу."""
    current, voltage = _noisy_signal(0.8, 0.25)
    r = client.post("/api/v1/stability", json={
        "current_a_series": current,
        "voltage_v_series": voltage,
        "thickness_mm": 10,
    })

    assert r.status_code == 200
    d = r.json()
    assert d["is_unstable"] is False
    assert d["stability_index"] >= 85


def test_arc_wander_is_detected() -> None:
    """Блуждание дуги распознаётся по разбросу тока и напряжения."""
    current, voltage = _noisy_signal(7.0, 2.2)
    r = client.post("/api/v1/stability", json={
        "current_a_series": current,
        "voltage_v_series": voltage,
        "thickness_mm": 10,
    })

    d = r.json()
    assert d["is_unstable"] is True
    assert d["stability_index"] < 85
    assert any(x["key"] == "arc_wander" for x in d["detections"])


def test_stability_requires_signal() -> None:
    """Запрос без осциллограмм отклоняется с понятной ошибкой."""
    r = client.post("/api/v1/stability", json={"thickness_mm": 10})
    assert r.status_code == 400


def test_excessive_speed_predicts_dross() -> None:
    """Превышение скорости обязано диагностироваться как грат с рекомендацией."""
    current, voltage = _noisy_signal(0.8, 0.25)
    r = client.post("/api/v1/stability", json={
        "current_a_series": current,
        "voltage_v_series": voltage,
        "thickness_mm": 10,
        "params": {
            "laser_power_w": 4000, "plasma_current_a": 85,
            "speed_mm_min": 2500, "focus_offset_mm": -2.2, "gas_flow_l_min": 17,
        },
    })

    d = r.json()
    kinds = {x["kind"] for x in d["edge_quality"]["defects"]}
    assert "dross" in kinds
    assert d["edge_quality"]["edge_quality_index"] < 55
    assert d["recommendation"] is not None
    assert d["corrections"], "должна быть предложена коррекция"


# ─────────────────── CAM-адаптер ───────────────────

GCODE = """
G0 X0 Y0
M3
G1 X300 Y0
G1 X300 Y150
G2 X315 Y165 I15 J0
G1 X600 Y165
G0 X0 Y0
"""


def test_cam_augment_splits_path() -> None:
    """Траектория разбирается на сегменты с распознаванием углов и дуг."""
    r = client.post("/api/v1/cam/augment",
                    json={"gcode": GCODE, "thickness_mm": 10})
    assert r.status_code == 200

    d = r.json()
    kinds = d["summary"]["by_kind"]
    assert kinds.get("corner", 0) >= 1, "углы должны распознаваться"
    assert kinds.get("arc", 0) >= 1, "дуги должны распознаваться"
    assert d["summary"]["pierce_count"] >= 1
    assert d["summary"]["cut_length_m"] > 0


def test_cam_reduces_feed_on_corners() -> None:
    """
    На углах и малых радиусах скорость снижается — именно эти участки
    дают основную долю брака при постоянном режиме.
    """
    r = client.post("/api/v1/cam/augment",
                    json={"gcode": GCODE, "thickness_mm": 10})
    segments = r.json()["segments"]

    corners = [s for s in segments if s["segment"]["kind"] == "corner"]
    arcs = [s for s in segments if s["segment"]["kind"] == "arc"]

    assert corners and all(s["feed_override_pct"] < 100 for s in corners)
    assert arcs and all(s["feed_override_pct"] <= 100 for s in arcs)

    lines = [s for s in segments if s["segment"]["kind"] == "line"]
    assert all(s["feed_override_pct"] == 100 for s in lines)


def test_roughness_defect_yields_actionable_correction() -> None:
    """
    Регрессия: дефект «шероховатость» имел нулевой шаг коррекции, из-за чего
    единственный достижимый в интерфейсе дефект не давал ни одной коррекции,
    и кнопка применения оставалась неактивной при любых настройках.
    """
    current, voltage = _noisy_signal(7.0, 2.2)
    r = client.post("/api/v1/stability", json={
        "current_a_series": current,
        "voltage_v_series": voltage,
        "thickness_mm": 10,
    })
    d = r.json()

    kinds = {x["kind"] for x in d["edge_quality"]["defects"]}
    assert "roughness" in kinds
    assert d["corrections"], "шероховатость обязана давать коррекцию режима"


def test_focus_correction_sets_absolute_value() -> None:
    """
    Смещение фокуса выставляется расчётным значением, а не процентом:
    параметр отрицательный, и относительный шаг для него бессмыслен.
    """
    current, voltage = _noisy_signal(0.8, 0.25)
    r = client.post("/api/v1/stability", json={
        "current_a_series": current,
        "voltage_v_series": voltage,
        "thickness_mm": 10,
        "params": {
            "laser_power_w": 4000, "plasma_current_a": 85,
            "speed_mm_min": 1900, "focus_offset_mm": -0.5, "gas_flow_l_min": 22,
        },
    })
    d = r.json()

    focus = [c for c in d["corrections"] if c["param"] == "focus_offset_mm"]
    assert focus, "отклонение фокуса должно давать коррекцию"
    # Рекомендуемое смещение для 10 мм: -0.22 * 10 = -2.2 мм
    assert abs(focus[0]["new_value"] - (-2.2)) < 0.01


def test_cam_rejects_empty_program() -> None:
    r = client.post("/api/v1/cam/augment",
                    json={"gcode": "; только комментарий", "thickness_mm": 10})
    assert r.status_code == 400


# ─────────────────── Экономика ───────────────────

def test_cost_converges_and_saves() -> None:
    """
    Отклонённый режим доводится до допуска за несколько коррекций,
    что даёт снижение себестоимости метра и доли брака.
    """
    r = client.post("/api/v1/cost", json={
        "thickness_mm": 10,
        "cut_length_m": 250,
        "pierce_count": 60,
        "params": {
            "laser_power_w": 4000, "plasma_current_a": 85,
            "speed_mm_min": 2500, "focus_offset_mm": -2.2, "gas_flow_l_min": 17,
        },
    })
    assert r.status_code == 200
    d = r.json()

    # Режим сошёлся к допуску
    assert d["convergence"][0]["edge_quality_index"] < 55
    assert d["convergence"][-1]["edge_quality_index"] >= 80
    assert d["corrections_needed"] <= 5, "сходимость не должна быть долгой"

    # Эффект измерим и положителен
    assert d["saving_rub"] > 0
    assert d["adaptive"]["cost_per_meter"] < d["manual"]["cost_per_meter"]
    assert d["defect_reduction_pp"] > 0


def test_cost_scales_with_length() -> None:
    """Себестоимость метра слабо зависит от объёма задания, полная — растёт."""
    small = client.post("/api/v1/cost", json={
        "thickness_mm": 10, "cut_length_m": 50, "pierce_count": 10}).json()
    big = client.post("/api/v1/cost", json={
        "thickness_mm": 10, "cut_length_m": 500, "pierce_count": 100}).json()

    assert big["manual"]["total_cost"] > small["manual"]["total_cost"]
    ratio = big["manual"]["cost_per_meter"] / small["manual"]["cost_per_meter"]
    assert 0.5 < ratio < 1.5


# ─────────────────── Транспорты и журнал ───────────────────

def test_transports_listed_and_simulator_available() -> None:
    """
    Симулятор доступен всегда, промышленные драйверы опциональны:
    их отсутствие не должно ломать сервис.
    """
    r = client.get("/api/v1/machine/transports")
    assert r.status_code == 200

    by_name = {t["transport"]: t for t in r.json()["transports"]}
    assert set(by_name) == {"opcua", "modbus", "mqtt", "simulator"}
    assert by_name["simulator"]["available"] is True


def test_machine_status_via_simulator() -> None:
    """Симулятор отдаёт состояние станка и осциллограммы для анализа."""
    r = client.post("/api/v1/machine/status",
                    json={"transport": "simulator", "scenario": "arc_wander"})
    assert r.status_code == 200

    d = r.json()
    assert d["connected"] is True
    assert d["status"]["state"] == "RUNNING"
    assert d["detection"] is not None
    assert d["detection"]["stability_index"] < 100


def test_missing_driver_reports_gracefully() -> None:
    """
    При отсутствии промышленного драйвера возвращается понятное
    сообщение, а не исключение.
    """
    r = client.post("/api/v1/machine/status", json={"transport": "opcua"})
    assert r.status_code == 200

    d = r.json()
    if not d["connected"]:
        assert "asyncua" in d["detail"] or "подключ" in d["detail"].lower()


def test_events_are_logged_with_metrics() -> None:
    """Действия фиксируются в журнале, метрики считаются для отчёта."""
    client.post("/api/v1/recommend", json={"thickness_mm": 8})
    current, voltage = _noisy_signal(7.0, 2.2)
    client.post("/api/v1/stability", json={
        "current_a_series": current, "voltage_v_series": voltage,
        "thickness_mm": 8,
    })

    r = client.get("/api/v1/events")
    assert r.status_code == 200

    d = r.json()
    assert d["metrics"]["events_total"] > 0
    assert "recommend" in d["metrics"]["by_kind"]
    assert d["metrics"]["avg_stability_index"] is not None


def test_events_export_csv() -> None:
    """Журнал выгружается в CSV для MES, 1С и отчётных документов."""
    client.post("/api/v1/recommend", json={"thickness_mm": 10})
    r = client.get("/api/v1/events/export")

    assert r.status_code == 200
    content = r.json()["content"]
    assert content.startswith("Время;Тип;Событие")
    assert len(content.strip().splitlines()) >= 2