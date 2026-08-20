"""
Программный комплекс адаптивного управления гибридным лазерно-плазменным процессом.

Три функциональных блока, соответствующих заявленной новизне:

1. ModeSelector      — подбор стартового режима по правилам (сокращает пробные проходы)
2. InstabilityDetector — детекция нестабильности по осциллограммам тока/напряжения
3. AdaptiveController  — выработка безопасной коррекции параметров

Принципиальное отличие от обычных CAM-систем: там параметры задаются жёстко один раз,
здесь режим корректируется по обратной связи в процессе обработки.

Зависимости: только стандартная библиотека (статистика считается вручную),
модуль переносим и работает на любом промышленном контроллере с Python.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

RULES_PATH = Path(__file__).parent / "process_rules.json"

MATERIAL_GROUPS = {
    "AlMg6": "aluminium", "AlMg3": "aluminium", "AK12": "aluminium",
    "S235": "carbon_steel", "09G2S": "carbon_steel",
    "AISI304": "stainless", "12X18H10T": "stainless",
}


# ─────────────────────────── Модели данных ───────────────────────────

@dataclass
class ProcessConditions:
    """Фактические условия на рабочем месте — вход для подбора режима."""
    process_id: str = "weld_al_6"
    gap_mm: float = 0.2
    surface: Literal["clean", "oxidized", "contaminated"] = "clean"
    electrode_wear_pct: float = 0.0
    quality_target: Literal["standard", "high"] = "standard"
    stability_priority: bool = False


@dataclass
class Signal:
    """Осциллограмма с датчиков за окно наблюдения."""
    voltage: list[float] = field(default_factory=list)
    current: list[float] = field(default_factory=list)
    laser_power: list[float] = field(default_factory=list)
    spectral_ratio: float | None = None      # отношение интенсивностей линий
    hydrogen_index: float | None = None      # индикатор риска пористости
    sample_rate_hz: float = 1000.0


@dataclass
class Correction:
    """Рекомендованная коррекция параметра."""
    param: str
    old_value: float
    new_value: float
    change_pct: float
    reason: str
    signature: str
    severity: str
    requires_confirm: bool = False

    def to_dict(self) -> dict:
        return {k: (round(v, 3) if isinstance(v, float) else v)
                for k, v in self.__dict__.items()}


# ─────────────────────────── Статистика без внешних библиотек ───────────────────────────

def _mean(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _std(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = _mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def _cv_pct(xs: list[float]) -> float:
    """Коэффициент вариации, % — базовая мера нестабильности процесса."""
    m = _mean(xs)
    return (_std(xs) / m * 100) if m else 0.0


def _trend_pct(xs: list[float]) -> float:
    """Дрейф: относительное изменение между первой и второй половиной окна."""
    if len(xs) < 4:
        return 0.0
    half = len(xs) // 2
    a, b = _mean(xs[:half]), _mean(xs[half:])
    return ((b - a) / a * 100) if a else 0.0


def _spike_pct(xs: list[float]) -> float:
    """Максимальный выброс относительно среднего, % — амплитуда отклонения."""
    m = _mean(xs)
    return (max(abs(x - m) for x in xs) / m * 100) if (xs and m) else 0.0


def _crest_factor(xs: list[float]) -> float:
    """
    Пик-фактор: отношение максимального отклонения к СКО.

    Ключевой признак для разделения двух похожих по разбросу явлений:
    у равномерного шума (блуждание дуги) пик-фактор около 3-4,
    у одиночных выбросов (двойная дуга) — существенно выше.
    Без этого разделения система путает два дефекта с разными причинами.
    """
    if len(xs) < 2:
        return 0.0
    m, s = _mean(xs), _std(xs)
    return (max(abs(x - m) for x in xs) / s) if s else 0.0


# ─────────────────────────── Блок 1. Подбор режима ───────────────────────────

class ModeSelector:
    """
    Подбор стартового режима по правилам.

    Эффект для предприятия: технолог получает обоснованную точку входа вместо
    3-5 пробных проходов «на глаз».
    """

    OPS = {
        "lt": lambda f, v: f < v, "lte": lambda f, v: f <= v,
        "gt": lambda f, v: f > v, "gte": lambda f, v: f >= v,
        "eq": lambda f, v: f == v, "in": lambda f, v: f in v,
    }

    def __init__(self, rules_path: Path | str = RULES_PATH) -> None:
        with open(rules_path, encoding="utf-8") as f:
            self.data = json.load(f)
        self.processes = self.data["processes"]
        self.start_rules = self.data["start_rules"]

    def list_processes(self) -> dict:
        return {
            k: {"title": v["title"], "kind": v["kind"],
                "material": v["material"], "thickness_mm": v["thickness_mm"]}
            for k, v in self.processes.items()
        }

    def _facts(self, proc: dict, cond: ProcessConditions) -> dict[str, Any]:
        return {
            "material_group": MATERIAL_GROUPS.get(proc["material"], "carbon_steel"),
            "thickness_mm": proc["thickness_mm"],
            "process_kind": proc["kind"],
            "gap_mm": cond.gap_mm,
            "surface": cond.surface,
            "electrode_wear_pct": cond.electrode_wear_pct,
            "quality_target": cond.quality_target,
            "stability_priority": cond.stability_priority,
        }

    def _clamp(self, proc: dict, param: str, value: float) -> tuple[float, bool]:
        """Ограничение технологическими пределами. Возвращает значение и признак упора."""
        lim = proc["limits"].get(param)
        if not lim:
            return value, False
        clamped = max(lim[0], min(lim[1], value))
        return clamped, abs(clamped - value) > 1e-9

    def select(self, cond: ProcessConditions) -> dict:
        """Возвращает стартовый режим, применённые правила и чек-лист."""
        proc = self.processes.get(cond.process_id)
        if proc is None:
            raise ValueError(f"Процесс «{cond.process_id}» не найден в базе")

        facts = self._facts(proc, cond)
        params = dict(proc["start_params"])
        applied: list[dict] = []
        warnings: list[str] = []

        for rule in self.start_rules:
            if not all(
                self.OPS[c["op"]](facts.get(c["fact"]), c["value"])
                for c in rule["when"]
                if facts.get(c["fact"]) is not None and c["op"] in self.OPS
            ):
                continue
            if any(facts.get(c["fact"]) is None for c in rule["when"]):
                continue

            eff = rule["then"]
            param = eff["param"]
            if param not in params:
                continue

            before = params[param]
            after = before * eff["factor"] if "factor" in eff else before + eff["delta"]
            after, hit_limit = self._clamp(proc, param, after)

            if abs(after - before) < 1e-9:
                continue

            params[param] = round(after, 2)
            applied.append({
                "rule_id": rule["id"], "param": param,
                "from": round(before, 2), "to": round(after, 2),
                "change_pct": round((after - before) / before * 100, 1) if before else 0.0,
                "reason": eff["reason"],
            })
            if hit_limit:
                warnings.append(
                    f'Правило {rule["id"]}: параметр {param} ограничен технологическим пределом'
                )

        checklist = self.data["checklists"].get(proc["kind"], [])

        return {
            "process": {"id": cond.process_id, "title": proc["title"],
                        "kind": proc["kind"], "material": proc["material"],
                        "thickness_mm": proc["thickness_mm"], "gas": proc["gas"]},
            "start_params": params,
            "base_params": proc["start_params"],
            "applied_rules": applied,
            "warnings": warnings,
            "limits": proc["limits"],
            "typical_defects": proc["typical_defects"],
            "checklist": checklist,
            "notes": proc["notes"],
        }


# ─────────────────────────── Блок 2. Детекция нестабильности ───────────────────────────

class InstabilityDetector:
    """
    Распознаёт типовые виды нестабильности по осциллограммам.

    Реализован детерминированный слой на признаках — он объясним и проходит
    приёмку у технолога. ML-классификатор подключается тем же интерфейсом
    после накопления размеченных данных на пилотах.
    """

    def __init__(self, rules_path: Path | str = RULES_PATH) -> None:
        with open(rules_path, encoding="utf-8") as f:
            self.data = json.load(f)
        self.signatures = self.data["instability_signatures"]

    @staticmethod
    def features(sig: Signal) -> dict[str, float]:
        """Извлечение признаков из сырого сигнала."""
        return {
            "voltage_mean": round(_mean(sig.voltage), 2),
            "voltage_std_pct": round(_cv_pct(sig.voltage), 2),
            "voltage_trend_pct": round(_trend_pct(sig.voltage), 2),
            "current_mean": round(_mean(sig.current), 2),
            "current_std_pct": round(_cv_pct(sig.current), 2),
            "current_spike_pct": round(_spike_pct(sig.current), 2),
            "current_crest": round(_crest_factor(sig.current), 2),
            "power_trend_pct": round(_trend_pct(sig.laser_power), 2),
            "spectral_ratio": sig.spectral_ratio if sig.spectral_ratio is not None else -1,
            "hydrogen_index": sig.hydrogen_index if sig.hydrogen_index is not None else -1,
        }

    def detect(self, sig: Signal, baseline: dict | None = None) -> dict:
        """
        Возвращает признаки, найденные нестабильности и индекс стабильности.
        baseline — эталонные значения первого стабильного прохода.
        """
        f = self.features(sig)
        found: list[dict] = []

        # Блуждание дуги: рост разброса тока и напряжения
        s = self.signatures["arc_wander"]
        if (f["voltage_std_pct"] >= s["indicators"]["voltage_std_pct"]
                and f["current_std_pct"] >= s["indicators"]["current_std_pct"]):
            found.append({
                "key": "arc_wander", "title": s["title"], "severity": s["severity"],
                "cause": s["cause"], "hint": s["action"]["hint"],
                "evidence": f'Разброс напряжения {f["voltage_std_pct"]}%, тока {f["current_std_pct"]}%',
                "confidence": min(0.99, f["voltage_std_pct"] / (s["indicators"]["voltage_std_pct"] * 2)),
            })

        # Двойное дугообразование: одиночные выбросы тока с просадкой напряжения.
        # Пик-фактор отделяет редкие всплески от равномерного шума блуждания дуги.
        s = self.signatures["double_arcing"]
        v_drop = -f["voltage_trend_pct"]
        spiky = (f["current_spike_pct"] >= s["indicators"]["current_spike_pct"]
                 and f["current_crest"] >= s["indicators"]["current_crest_min"])
        if spiky or (v_drop >= s["indicators"]["voltage_drop_pct"] and f["current_crest"] >= 5.0):
            found.append({
                "key": "double_arcing", "title": s["title"], "severity": s["severity"],
                "cause": s["cause"], "hint": s["action"]["hint"],
                "evidence": (f'Выброс тока {f["current_spike_pct"]}% '
                             f'(пик-фактор {f["current_crest"]}), просадка напряжения {v_drop:.1f}%'),
                "confidence": min(0.99, f["current_crest"] / (s["indicators"]["current_crest_min"] * 1.5)),
            })

        # Дрейф мощности лазера
        s = self.signatures["power_drift"]
        if abs(f["power_trend_pct"]) >= s["indicators"]["power_trend_pct"]:
            found.append({
                "key": "power_drift", "title": s["title"], "severity": s["severity"],
                "cause": s["cause"], "hint": s["action"]["hint"],
                "evidence": f'Дрейф мощности {f["power_trend_pct"]}% за окно наблюдения',
                "confidence": min(0.99, abs(f["power_trend_pct"]) / (s["indicators"]["power_trend_pct"] * 2)),
            })

        # Потеря проплавления — оценивается относительно эталона
        s = self.signatures["penetration_loss"]
        if baseline and baseline.get("voltage_mean"):
            drop = (baseline["voltage_mean"] - f["voltage_mean"]) / baseline["voltage_mean"] * 100
            if drop >= s["indicators"]["voltage_mean_drop_pct"]:
                found.append({
                    "key": "penetration_loss", "title": s["title"], "severity": s["severity"],
                    "cause": s["cause"], "hint": s["action"]["hint"],
                    "evidence": f'Напряжение ниже эталона на {drop:.1f}%',
                    "confidence": min(0.99, drop / (s["indicators"]["voltage_mean_drop_pct"] * 2)),
                })

        # Риск пористости по спектру
        s = self.signatures["porosity_risk"]
        if (f["hydrogen_index"] >= 0
                and f["hydrogen_index"] >= s["indicators"]["spectral_hydrogen_index"]
                and f["voltage_std_pct"] >= s["indicators"]["voltage_std_pct"]):
            found.append({
                "key": "porosity_risk", "title": s["title"], "severity": s["severity"],
                "cause": s["cause"], "hint": s["action"]["hint"],
                "evidence": f'Водородный индекс {f["hydrogen_index"]}, разброс напряжения {f["voltage_std_pct"]}%',
                "confidence": min(0.99, f["hydrogen_index"]),
            })

        weights = {"critical": 40, "high": 25, "medium": 12, "low": 5}
        stability = max(0, 100 - sum(weights.get(i["severity"], 10) for i in found))

        return {
            "features": f,
            "detections": found,
            "stability_index": stability,
            "status": ("stable" if stability >= 85
                       else "warning" if stability >= 60 else "unstable"),
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        }


# ─────────────────────────── Блок 3. Адаптивная коррекция ───────────────────────────

class AdaptiveController:
    """
    Вырабатывает коррекции параметров по результатам детекции.

    Безопасность: шаг ограничен, критические события требуют подтверждения
    оператора. Это исключает разгон системы и защищает оборудование —
    ключевое требование при внедрении в цехе.
    """

    def __init__(self, rules_path: Path | str = RULES_PATH) -> None:
        with open(rules_path, encoding="utf-8") as f:
            self.data = json.load(f)
        self.signatures = self.data["instability_signatures"]
        self.safety = self.data["safety"]
        self.history: list[dict] = []

    def _clamp(self, limits: dict, param: str, value: float) -> float:
        lim = limits.get(param)
        return max(lim[0], min(lim[1], value)) if lim else value

    def propose(self, detection: dict, params: dict, limits: dict) -> list[Correction]:
        """Формирует список коррекций. Пустой список — процесс стабилен."""
        out: list[Correction] = []
        max_step = self.safety["max_step_pct"]

        # Критические события обрабатываются первыми
        order = sorted(detection["detections"],
                       key=lambda d: {"critical": 0, "high": 1, "medium": 2}.get(d["severity"], 3))

        for det in order:
            action = self.signatures[det["key"]]["action"]
            param = action["param"]
            if param not in params:
                continue

            before = params[param]
            after = (before * action["factor"] if "factor" in action
                     else before + action["delta"])

            # Ограничение шага коррекции
            if before:
                change = (after - before) / before * 100
                if abs(change) > max_step:
                    after = before * (1 + max_step / 100 * (1 if change > 0 else -1))

            after = self._clamp(limits, param, after)
            if abs(after - before) < 1e-9:
                continue

            out.append(Correction(
                param=param, old_value=round(before, 2), new_value=round(after, 2),
                change_pct=round((after - before) / before * 100, 1) if before else 0.0,
                reason=det["cause"], signature=det["title"], severity=det["severity"],
                requires_confirm=det["key"] in self.safety["require_operator_confirm"],
            ))

        return out

    def apply(self, params: dict, corrections: list[Correction],
              allow_confirm_required: bool = False) -> dict:
        """
        Применяет коррекции. Требующие подтверждения пропускаются,
        пока оператор не разрешит явно.
        """
        new = dict(params)
        applied: list[dict] = []
        pending: list[dict] = []

        for c in corrections:
            if c.requires_confirm and not allow_confirm_required:
                pending.append(c.to_dict())
                continue
            new[c.param] = c.new_value
            applied.append(c.to_dict())

        self.history.append({
            "ts": datetime.now().isoformat(timespec="seconds"),
            "applied": len(applied), "pending": len(pending),
        })

        return {"params": new, "applied": applied,
                "pending_confirmation": pending,
                "safety_note": self.safety["description"]}


# ─────────────────────────── Генератор тестовых сигналов ───────────────────────────

def synth_signal(kind: str = "stable", n: int = 500) -> Signal:
    """
    Синтетические осциллограммы для проверки детектора до выхода на пилот.
    Позволяет верифицировать алгоритмы без доступа к установке.
    """
    import random
    random.seed(42)

    v, c, p = [], [], []
    for i in range(n):
        if kind == "stable":
            v.append(28 + random.gauss(0, 0.25))
            c.append(110 + random.gauss(0, 0.8))
            p.append(3200 + random.gauss(0, 15))
        elif kind == "arc_wander":
            v.append(28 + random.gauss(0, 2.2))
            c.append(110 + random.gauss(0, 7.0))
            p.append(3200 + random.gauss(0, 20))
        elif kind == "double_arcing":
            spike = 45 if i in (180, 181, 182, 300, 301) else 0
            v.append(28 - (i / n) * 5 + random.gauss(0, 0.6))
            c.append(110 + spike + random.gauss(0, 1.5))
            p.append(3200 + random.gauss(0, 15))
        elif kind == "power_drift":
            v.append(28 + random.gauss(0, 0.3))
            c.append(110 + random.gauss(0, 1.0))
            p.append(3200 * (1 - 0.14 * i / n) + random.gauss(0, 12))
        else:
            v.append(28 + random.gauss(0, 0.3))
            c.append(110 + random.gauss(0, 1.0))
            p.append(3200 + random.gauss(0, 15))

    return Signal(voltage=v, current=c, laser_power=p,
                  spectral_ratio=0.8, hydrogen_index=0.2)