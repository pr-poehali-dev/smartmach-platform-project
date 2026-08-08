"""
Decision Engine — ядро принятия решений по технологии производства.

Интеллектуальная собственность платформы. Полностью отделён от геометрического
ядра (Open Cascade) и работает только с фактами (dict), что позволяет заменять
CAD-движок без изменения логики.

Принцип работы:
  1. Из входных требований формируется набор фактов.
  2. Правила из JSON/DSL применяются к фактам, начисляя баллы каждому методу.
  3. По каждому методу рассчитывается экономика (себестоимость, срок).
  4. Варианты сортируются по итоговому баллу и возвращаются с рисками.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

RULES_PATH = Path(__file__).parent.parent / "rules" / "technology_rules.json"

# Плотность материалов, кг/м³ — справочник базы знаний
MATERIAL_DENSITY = {
    "СЧ20": 7200, "СЧ25": 7300, "35Л": 7850, "40Х": 7850,
    "АК12": 2650, "Д16Т": 2780, "AlSi10Mg": 2680,
    "PA12": 1010, "ABS": 1040, "PETG": 1270,
}

COMPLEXITY_RANK = {"low": 1, "medium": 2, "high": 3, "very_high": 4}


# ─────────────────────────── Модели данных ───────────────────────────

@dataclass
class Requirements:
    """Входные требования к узлу."""
    length_mm: float
    width_mm: float
    height_mm: float
    wall_thickness_mm: float
    material: str
    batch_size: int
    tolerance_grade: int = 9          # квалитет по ГОСТ 25346
    deadline_days: int = 30
    complexity: str = "medium"        # low | medium | high | very_high
    purpose: str = "production"       # production | prototype
    has_milling_machine: bool = True
    has_casting_line: bool = False
    has_printer: bool = True

    @property
    def max_dimension(self) -> float:
        return max(self.length_mm, self.width_mm, self.height_mm)

    def volume_m3(self) -> float:
        """Оценка объёма материала детали (корпус ≈ 28% габаритного объёма)."""
        gabarit = (self.length_mm * self.width_mm * self.height_mm) / 1e9
        return gabarit * 0.28

    @property
    def mass_kg(self) -> float:
        density = MATERIAL_DENSITY.get(self.material, 7850)
        return round(self.volume_m3() * density, 3)


@dataclass
class Variant:
    """Вариант производства — результат работы движка."""
    method: str
    title: str
    score: int
    cost_total: float
    cost_per_unit: float
    lead_days: int
    mass_kg: float
    reasons: list[str] = field(default_factory=list)
    risks: list[dict] = field(default_factory=list)
    tooling: list[str] = field(default_factory=list)
    cost_breakdown: dict = field(default_factory=dict)
    feasible: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


# ─────────────────────────── Интерпретатор DSL ───────────────────────────

class RuleEvaluator:
    """Вычисляет условия правил. Операторы описаны в JSON — расширяется без правки кода."""

    OPS = {
        "lt":      lambda f, v: f < v,
        "lte":     lambda f, v: f <= v,
        "gt":      lambda f, v: f > v,
        "gte":     lambda f, v: f >= v,
        "eq":      lambda f, v: f == v,
        "in":      lambda f, v: f in v,
        "between": lambda f, v: v[0] <= f <= v[1],
    }

    def __init__(self, facts: dict[str, Any]) -> None:
        self.facts = facts

    def match(self, conditions: list[dict]) -> bool:
        """Все условия правила должны выполняться (логическое И)."""
        for cond in conditions:
            fact_value = self.facts.get(cond["fact"])
            if fact_value is None:
                return False
            op = self.OPS.get(cond["op"])
            if op is None or not op(fact_value, cond["value"]):
                return False
        return True


# ─────────────────────────── Экономическая модель ───────────────────────────

class CostModel:
    """
    Расчёт себестоимости и сроков. Вынесен отдельно, чтобы калибровать
    под конкретное предприятие без изменения логики выбора технологии.
    """

    @staticmethod
    def machining_hours(req: Requirements, method: str) -> float:
        """
        Упрощённое нормирование машинного времени, ч на одну деталь.
        Коэффициенты подлежат калибровке по фактическим данным предприятия.
        """
        k_complex = 1 + COMPLEXITY_RANK.get(req.complexity, 2) * 0.25
        if method == "milling":
            # ~0.12 ч на кг снимаемого металла + подготовка
            return round((req.mass_kg * 0.12 + 1.5) * k_complex, 2)
        if method == "printing":
            # ~0.025 ч на см³ материала
            return round(req.volume_m3() * 1e6 * 0.025, 2)
        # литьё: обрубка, зачистка, контроль
        return round((req.mass_kg * 0.04 + 0.5) * k_complex, 2)

    @classmethod
    def calculate(cls, req: Requirements, method: str, cfg: dict) -> dict:
        mass = req.mass_kg
        hours = cls.machining_hours(req, method)

        # Эффект масштаба (кривая обучения): удельные затраты падают с ростом партии
        scale = cfg["scale_factor"] ** max(0.0, (req.batch_size - 1) ** 0.25)
        scale = max(scale, 0.55)  # нижняя граница — физический предел экономии

        material_cost = mass * cfg["cost_per_kg"] * req.batch_size
        machine_cost = hours * cfg["machine_rate_per_hour"] * req.batch_size * scale
        setup_cost = cfg["setup_cost"]

        variable = material_cost + machine_cost
        overhead = variable * 0.18  # накладные расходы предприятия

        total = setup_cost + variable + overhead
        lead = cfg["lead_days_base"] + cfg["lead_days_per_unit"] * req.batch_size

        return {
            "cost_total": round(total, 2),
            "cost_per_unit": round(total / max(1, req.batch_size), 2),
            "lead_days": int(round(lead)),
            "breakdown": {
                "Оснастка и подготовка": round(setup_cost, 2),
                "Материал":              round(material_cost, 2),
                "Машинное время":        round(machine_cost, 2),
                "Накладные расходы":     round(overhead, 2),
                "Машино-часов на ед.":   hours,
            },
        }


# ─────────────────────────── Основной движок ───────────────────────────

class DecisionEngine:
    """Выбор технологии производства на основе правил."""

    def __init__(self, rules_path: Path | str = RULES_PATH) -> None:
        with open(rules_path, encoding="utf-8") as f:
            self.rules_data = json.load(f)
        self.methods: dict = self.rules_data["methods"]
        self.rules: list = sorted(self.rules_data["rules"], key=lambda r: r["priority"])
        self.risk_matrix: dict = self.rules_data["risk_matrix"]

    def build_facts(self, req: Requirements) -> dict[str, Any]:
        """Преобразование требований в плоский набор фактов для правил."""
        return {
            "batch_size":         req.batch_size,
            "complexity":         req.complexity,
            "tolerance_grade":    req.tolerance_grade,
            "wall_thickness":     req.wall_thickness_mm,
            "deadline_days":      req.deadline_days,
            "max_dimension":      req.max_dimension,
            "material":           req.material,
            "purpose":            req.purpose,
            "has_milling_machine": req.has_milling_machine,
            "has_casting_line":   req.has_casting_line,
            "has_printer":        req.has_printer,
            "mass_kg":            req.mass_kg,
        }

    def _collect_risks(self, req: Requirements, method: str) -> list[dict]:
        """Риски по матрице. Условия вычисляются по фактам детали."""
        out: list[dict] = []
        facts = self.build_facts(req)
        for item in self.risk_matrix.get(method, []):
            cond = item["condition"]
            triggered = cond == "always"
            if not triggered:
                # Простой разбор строки вида "batch_size > 200"
                try:
                    left, op, right = cond.split(maxsplit=2)
                    val = facts.get(left)
                    right_val = right.strip().strip('"')
                    if isinstance(val, (int, float)):
                        right_val = float(right_val)
                    checks = {
                        ">":  lambda a, b: a > b,
                        "<":  lambda a, b: a < b,
                        ">=": lambda a, b: a >= b,
                        "<=": lambda a, b: a <= b,
                        "==": lambda a, b: a == b,
                    }
                    triggered = bool(val is not None and checks[op](val, right_val))
                except (ValueError, KeyError, TypeError):
                    triggered = False
            if triggered:
                out.append({"risk": item["risk"], "level": item["level"]})
        return out

    def evaluate(self, req: Requirements) -> list[Variant]:
        """Главный метод: возвращает 3 варианта производства, отсортированных по баллу."""
        facts = self.build_facts(req)
        evaluator = RuleEvaluator(facts)

        scores: dict[str, int] = {m: 0 for m in self.methods}
        reasons: dict[str, list[str]] = {m: [] for m in self.methods}

        # Применение правил
        for rule in self.rules:
            if evaluator.match(rule["when"]):
                effect = rule["then"]
                method = effect["method"]
                if method in scores:
                    scores[method] += effect["score"]
                    reasons[method].append(f'[{rule["id"]}] {effect["reason"]}')

        # Проверка доступности оборудования
        availability = {
            "milling": req.has_milling_machine,
            "casting": req.has_casting_line,
            "printing": req.has_printer,
        }

        variants: list[Variant] = []
        for method, cfg in self.methods.items():
            econ = CostModel.calculate(req, method, cfg)

            # Технологическая осуществимость по минимальной толщине стенки
            feasible = req.wall_thickness_mm >= cfg["min_wall_mm"]
            local_reasons = list(reasons[method])
            if not feasible:
                local_reasons.append(
                    f'Толщина стенки {req.wall_thickness_mm} мм ниже минимума '
                    f'{cfg["min_wall_mm"]} мм для данной технологии'
                )
            if not availability.get(method, True):
                local_reasons.append("Оборудование отсутствует в парке — требуется кооперация")

            # Штраф за срыв срока
            score = scores[method]
            if econ["lead_days"] > req.deadline_days:
                score -= 20
                local_reasons.append(
                    f'Срок {econ["lead_days"]} дн. превышает требуемый {req.deadline_days} дн.'
                )

            variants.append(Variant(
                method=method,
                title=cfg["title"],
                score=score,
                cost_total=econ["cost_total"],
                cost_per_unit=econ["cost_per_unit"],
                lead_days=econ["lead_days"],
                mass_kg=req.mass_kg,
                reasons=local_reasons or ["Стандартный вариант без специальных условий"],
                risks=self._collect_risks(req, method),
                tooling=cfg["tooling"],
                cost_breakdown=econ["breakdown"],
                feasible=feasible,
            ))

        variants.sort(key=lambda v: (v.feasible, v.score), reverse=True)
        return variants

    def recommend(self, req: Requirements) -> dict:
        """Итоговая рекомендация с обоснованием."""
        variants = self.evaluate(req)
        best = variants[0]
        return {
            "recommended": best.method,
            "recommended_title": best.title,
            "justification": best.reasons,
            "variants": [v.to_dict() for v in variants],
            "input_summary": {
                "mass_kg": req.mass_kg,
                "max_dimension_mm": req.max_dimension,
                "batch_size": req.batch_size,
                "material": req.material,
            },
        }


if __name__ == "__main__":
    demo = Requirements(
        length_mm=320, width_mm=240, height_mm=180,
        wall_thickness_mm=8, material="СЧ20",
        batch_size=50, tolerance_grade=8, deadline_days=45,
        complexity="high", has_casting_line=True,
    )
    result = DecisionEngine().recommend(demo)
    print(json.dumps(result, ensure_ascii=False, indent=2))