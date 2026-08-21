"""
Специализация ядра под резку углеродистой стали 6-12 мм.

Серверный аналог src/lib/steelCutting.ts — пороги и формулы идентичны,
чтобы панель оператора и промышленный контур давали одинаковый результат.

Два блока:
1. EdgeQualityPredictor — прогноз грата, окалины и прочих дефектов кромки
   с указанием причины и конкретного действия.
2. CuttingEconomics — расход газа, износ расходников, себестоимость метра реза.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

# ─────────────────── Технологическая база резки ───────────────────

# Опорные точки из технологической базы. Степенная аппроксимация давала
# расхождение до 30% на тонком листе и создавала ложные срабатывания
# уже на штатном режиме, поэтому используется интерполяция по таблице.
SPEED_TABLE: list[tuple[float, float]] = [(6, 2800), (8, 2300), (10, 1900), (12, 1450)]
POWER_TABLE: list[tuple[float, float]] = [(6, 3000), (8, 3500), (10, 4000), (12, 4600)]


def _interpolate(table: list[tuple[float, float]], x: float) -> float:
    """Линейная интерполяция с насыщением на краях диапазона."""
    if x <= table[0][0]:
        return table[0][1]
    if x >= table[-1][0]:
        return table[-1][1]
    for (x1, y1), (x2, y2) in zip(table, table[1:]):
        if x1 <= x <= x2:
            return y1 + (y2 - y1) * (x - x1) / (x2 - x1)
    return table[0][1]


def optimal_speed(thickness_mm: float, laser_power_w: float) -> float:
    """Оптимальная скорость резки, мм/мин, с поправкой на фактическую мощность."""
    base = _interpolate(SPEED_TABLE, thickness_mm)
    nominal = _interpolate(POWER_TABLE, thickness_mm)
    factor = min(1.2, max(0.8, laser_power_w / nominal)) if nominal else 1.0
    return base * factor


def nominal_gas_flow(thickness_mm: float) -> float:
    """Нормативный расход режущего газа, л/мин."""
    return 9.5 + thickness_mm * 1.28


# ─────────────────── Прогноз качества кромки ───────────────────

DEFECT_KIND_LABELS = {
    "dross": "Грат",
    "scale": "Окалина",
    "taper": "Конусность",
    "undercut": "Подрез",
    "roughness": "Шероховатость",
}


@dataclass
class EdgeDefect:
    kind: str
    title: str
    risk: int
    severity: str
    cause: str
    action: str
    param: str
    suggest_pct: float

    def to_dict(self) -> dict:
        return {
            "kind": self.kind,
            "kind_label": DEFECT_KIND_LABELS.get(self.kind, self.kind),
            "title": self.title,
            "risk": self.risk,
            "severity": self.severity,
            "cause": self.cause,
            "action": self.action,
            "param": self.param,
            "suggest_pct": self.suggest_pct,
        }


@dataclass
class EdgeQuality:
    defects: list[EdgeDefect] = field(default_factory=list)
    edge_quality_index: int = 100
    expected_defect_pct: float = 2.0
    grade: str = "good"
    speed_ratio: float = 1.0
    gas_ratio: float = 1.0

    def to_dict(self) -> dict:
        return {
            "edge_quality_index": self.edge_quality_index,
            "grade": self.grade,
            "grade_label": {
                "good": "Кромка в допуске",
                "acceptable": "Кромка приемлема",
                "poor": "Кромка вне допуска",
            }.get(self.grade, self.grade),
            "expected_defect_pct": self.expected_defect_pct,
            "speed_ratio": self.speed_ratio,
            "gas_ratio": self.gas_ratio,
            "defects": [d.to_dict() for d in self.defects],
        }


SEVERITY_WEIGHT = {"critical": 1.0, "high": 0.75, "medium": 0.45, "low": 0.2}


def predict_edge_quality(
    thickness_mm: float,
    params: dict[str, float],
    signal_features: dict[str, float] | None = None,
) -> EdgeQuality:
    """
    Прогноз дефектов кромки по параметрам режима и признакам сигнала.

    Грат на углеродистой стали возникает не случайно, а при конкретных
    сочетаниях: скорость выше оптимальной (расплав не успевает удаляться),
    недостаток газа (нечем выдувать), нестабильность дуги (рваная кромка).
    Система показывает не факт брака, а его вероятную причину.
    """
    t = thickness_mm
    speed = params.get("speed_mm_min", 0.0)
    gas = params.get("gas_flow_l_min", 0.0)
    power = params.get("laser_power_w", 0.0)
    focus = params.get("focus_offset_mm", 0.0)
    current = params.get("plasma_current_a", 0.0)

    opt_speed = optimal_speed(t, power)
    speed_ratio = speed / opt_speed if opt_speed else 1.0
    nom_gas = nominal_gas_flow(t)
    gas_ratio = gas / nom_gas if nom_gas else 1.0

    defects: list[EdgeDefect] = []

    # Грат: избыточная скорость
    if speed_ratio > 1.08:
        excess = (speed_ratio - 1) * 100
        defects.append(EdgeDefect(
            kind="dross",
            title="Грат на нижней кромке",
            risk=min(95, round(excess * 4.5)),
            severity="high" if excess > 20 else "medium",
            cause=(f"Скорость превышает оптимальную для толщины {t:g} мм на {excess:.0f}%: "
                   "расплав не успевает удаляться из полости реза"),
            action=f"Снизить скорость до {opt_speed:.0f} мм/мин",
            param="speed_mm_min",
            suggest_pct=-min(20, round(excess)),
        ))

    # Грат: недостаток газа
    if gas_ratio < 0.9:
        deficit = (1 - gas_ratio) * 100
        defects.append(EdgeDefect(
            kind="dross",
            title="Грат из-за недостатка режущего газа",
            risk=min(90, round(deficit * 5)),
            severity="high" if deficit > 20 else "medium",
            cause=(f"Расход газа на {deficit:.0f}% ниже нормативного ({nom_gas:.0f} л/мин) — "
                   "недостаточное давление для выдувания расплава"),
            action=f"Увеличить расход газа до {nom_gas:.0f} л/мин",
            param="gas_flow_l_min",
            suggest_pct=min(20, round(deficit)),
        ))

    # Окалина: избыточное тепловложение
    heat_input = current * 1.2 + power / 100
    nominal_heat = t * 22
    if heat_input > nominal_heat * 1.15:
        excess = (heat_input / nominal_heat - 1) * 100
        defects.append(EdgeDefect(
            kind="scale",
            title="Окалина и цвета побежалости",
            risk=min(85, round(excess * 3)),
            severity="medium",
            cause=(f"Погонная энергия превышает норму для толщины {t:g} мм на {excess:.0f}%: "
                   "перегрев кромки вызывает интенсивное окисление"),
            action="Снизить ток плазмы либо увеличить скорость резки",
            param="plasma_current_a",
            suggest_pct=-min(15, round(excess / 2)),
        ))

    # Непрорез
    if speed_ratio > 1.25 and heat_input < nominal_heat:
        defects.append(EdgeDefect(
            kind="dross",
            title="Риск непрореза",
            risk=min(95, round((speed_ratio - 1.25) * 200 + 40)),
            severity="high",
            cause=("Сочетание высокой скорости и недостаточного тепловложения — "
                   "глубина проплавления может не достичь нижней кромки"),
            action="Снизить скорость или повысить мощность лазера",
            param="speed_mm_min",
            suggest_pct=-20,
        ))

    # Конусность
    opt_focus = -t * 0.22
    if abs(focus - opt_focus) > t * 0.15:
        defects.append(EdgeDefect(
            kind="taper",
            title="Конусность реза",
            risk=min(80, round(abs(focus - opt_focus) / t * 220)),
            severity="medium",
            cause=(f"Фокус смещён на {focus:.1f} мм при рекомендуемом {opt_focus:.1f} мм — "
                   "ширина реза меняется по глубине"),
            action=f"Установить смещение фокуса {opt_focus:.1f} мм",
            param="focus_offset_mm",
            suggest_pct=0,
        ))

    # Шероховатость по нестабильности дуги
    if signal_features:
        cur_std = signal_features.get("current_std_pct", 0.0)
        if cur_std >= 4:
            defects.append(EdgeDefect(
                kind="roughness",
                title="Повышенная шероховатость кромки",
                risk=min(90, round(cur_std * 11)),
                severity="high" if cur_std >= 6 else "medium",
                cause=(f"Разброс тока {cur_std:.1f}% — колебания дуги оставляют "
                       "волнистость и борозды на поверхности реза"),
                action="Устранить причину нестабильности дуги, проверить сопло",
                param="plasma_current_a",
                suggest_pct=0,
            ))

    # Подрез
    if speed_ratio < 0.75 and heat_input > nominal_heat:
        defects.append(EdgeDefect(
            kind="undercut",
            title="Подрез верхней кромки",
            risk=min(75, round((0.75 - speed_ratio) * 180)),
            severity="medium",
            cause=("Скорость существенно ниже оптимальной при избыточной энергии — "
                   "перегрев и оплавление верхней кромки"),
            action="Повысить скорость либо снизить ток плазмы",
            param="speed_mm_min",
            suggest_pct=12,
        ))

    penalty = sum(d.risk * SEVERITY_WEIGHT.get(d.severity, 0.3) for d in defects)
    index = max(0, round(100 - penalty / 2))
    expected = min(45.0, round((2 + penalty / 14) * 10) / 10)

    return EdgeQuality(
        defects=sorted(defects, key=lambda d: -d.risk),
        edge_quality_index=index,
        expected_defect_pct=expected,
        grade="good" if index >= 80 else "acceptable" if index >= 55 else "poor",
        speed_ratio=round(speed_ratio, 2),
        gas_ratio=round(gas_ratio, 2),
    )


def propose_edge_corrections(
    quality: EdgeQuality,
    params: dict[str, float],
    limits: dict[str, list[float]],
    max_step_pct: float = 10.0,
) -> list[dict]:
    """Преобразует прогноз дефектов в коррекции режима с ограничением шага."""
    out: list[dict] = []
    used: set[str] = set()

    for d in quality.defects:
        if not d.suggest_pct or d.param in used or d.param not in params:
            continue

        before = params[d.param]
        step = max(-max_step_pct, min(max_step_pct, d.suggest_pct))
        nxt = before * (1 + step / 100)

        lim = limits.get(d.param)
        if lim:
            nxt = max(lim[0], min(lim[1], nxt))
        if abs(nxt - before) < 1e-9:
            continue

        used.add(d.param)
        out.append({
            "param": d.param,
            "old_value": round(before, 2),
            "new_value": round(nxt, 2),
            "change_pct": round((nxt - before) / before * 100, 1) if before else 0.0,
            "signature": d.title,
            "severity": d.severity,
            "requires_confirm": False,
            "reason": d.cause,
        })

    return out


def converge_to_optimum(
    thickness_mm: float,
    start_params: dict[str, float],
    limits: dict[str, list[float]],
    max_steps: int = 5,
    target_index: int = 80,
) -> list[dict]:
    """
    Итеративный выход на оптимальный режим.

    Шаг ограничен 10% за приём из соображений безопасности, поэтому за один
    приём режим до оптимума не доводится. Функция показывает, за сколько
    последовательных коррекций процесс приходит в допуск — это и есть
    замена 3-5 пробным проходам технолога.
    """
    history: list[dict] = []
    params = dict(start_params)

    for step in range(max_steps + 1):
        q = predict_edge_quality(thickness_mm, params)
        corrections = (
            [] if q.edge_quality_index >= target_index
            else propose_edge_corrections(q, params, limits)
        )

        history.append({
            "step": step,
            "params": dict(params),
            "edge_quality_index": q.edge_quality_index,
            "expected_defect_pct": q.expected_defect_pct,
            "corrections": corrections,
        })

        if not corrections:
            break

        for c in corrections:
            params[c["param"]] = c["new_value"]

    return history


# ─────────────────── Экономика резки ───────────────────

@dataclass
class Economics:
    gas_price_rub_m3: float = 42.0
    nozzle_life_h: float = 8.0
    consumable_set_rub: float = 3400.0
    machine_rate_rub_h: float = 1850.0
    operator_rate_rub_h: float = 620.0
    baseline_defect_pct: float = 12.0
    material_cost_per_m_rub: float = 210.0


def calc_cost(
    thickness_mm: float,
    params: dict[str, float],
    cut_length_m: float,
    pierce_count: int,
    defect_pct: float,
    econ: Economics,
) -> dict:
    """Себестоимость резки для заданного режима и доли брака."""
    speed = params.get("speed_mm_min") or 1.0
    gas_flow = params.get("gas_flow_l_min", 0.0)

    # Пробивка на толстом металле занимает заметное время
    pierce_time_min = pierce_count * (0.6 + thickness_mm * 0.12) / 60
    cut_time_min = cut_length_m * 1000 / speed + pierce_time_min

    gas_m3 = gas_flow * cut_time_min / 1000
    gas_cost = gas_m3 * econ.gas_price_rub_m3

    hours = cut_time_min / 60
    consumable_cost = hours / econ.nozzle_life_h * econ.consumable_set_rub
    machine_cost = hours * econ.machine_rate_rub_h
    operator_cost = hours * econ.operator_rate_rub_h

    defect_loss = (
        defect_pct / 100 * cut_length_m * econ.material_cost_per_m_rub
        + defect_pct / 100 * hours * econ.machine_rate_rub_h
    )

    total = gas_cost + consumable_cost + machine_cost + operator_cost + defect_loss
    safe_len = max(0.001, cut_length_m)

    return {
        "cut_time_min": round(cut_time_min, 1),
        "gas_m3": round(gas_m3, 3),
        "gas_per_meter_l": round(gas_m3 * 1000 / safe_len, 1),
        "gas_cost": round(gas_cost),
        "consumable_cost": round(consumable_cost),
        "machine_cost": round(machine_cost),
        "operator_cost": round(operator_cost),
        "defect_loss_cost": round(defect_loss),
        "total_cost": round(total),
        "cost_per_meter": round(total / safe_len),
        "nozzle_wear_pct": round(hours / econ.nozzle_life_h * 100, 1),
    }


def compare_economics(
    thickness_mm: float,
    base_params: dict[str, float],
    adaptive_params: dict[str, float],
    cut_length_m: float,
    pierce_count: int,
    expected_defect_pct: float,
    econ: Economics,
) -> dict:
    """
    Сравнение ручного подбора и работы с адаптивным управлением.

    Ручной вариант — табличные параметры и нормативная доля брака предприятия.
    Адаптивный — фактический режим и прогнозная доля брака.
    Эта разница и есть измеримая ценность для цеха и для заявки.
    """
    manual = calc_cost(thickness_mm, base_params, cut_length_m, pierce_count,
                       econ.baseline_defect_pct, econ)
    adaptive = calc_cost(thickness_mm, adaptive_params, cut_length_m, pierce_count,
                         expected_defect_pct, econ)

    saving = manual["total_cost"] - adaptive["total_cost"]
    gas_saving_pct = (
        (manual["gas_m3"] - adaptive["gas_m3"]) / manual["gas_m3"] * 100
        if manual["gas_m3"] else 0.0
    )

    return {
        "manual": manual,
        "adaptive": adaptive,
        "saving_rub": saving,
        "saving_pct": round(saving / manual["total_cost"] * 100, 1) if manual["total_cost"] else 0.0,
        "gas_saving_pct": round(gas_saving_pct, 1),
        "defect_reduction_pp": round(econ.baseline_defect_pct - expected_defect_pct, 1),
    }
