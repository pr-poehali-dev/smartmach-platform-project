"""
Структура отчёта: спецификация, маршрутная карта, себестоимость.
JSON — единый источник данных для PDF (Jinja2 + WeasyPrint) и Excel (openpyxl).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

# Нормативные операции по технологиям — база знаний технолога
ROUTE_TEMPLATES: dict[str, list[dict]] = {
    "milling": [
        {"op": "005", "name": "Заготовительная",   "equipment": "Ленточнопильный станок", "time_min": 25},
        {"op": "010", "name": "Фрезерная черновая", "equipment": "Обрабатывающий центр",   "time_min": 90},
        {"op": "015", "name": "Фрезерная чистовая", "equipment": "Обрабатывающий центр",   "time_min": 60},
        {"op": "020", "name": "Расточная",          "equipment": "Расточной станок",       "time_min": 45},
        {"op": "025", "name": "Сверлильная",        "equipment": "Сверлильный станок",     "time_min": 30},
        {"op": "030", "name": "Слесарная",          "equipment": "Верстак",                "time_min": 20},
        {"op": "035", "name": "Контрольная",        "equipment": "КИМ",                    "time_min": 15},
    ],
    "casting": [
        {"op": "005", "name": "Модельная",          "equipment": "Модельный участок",      "time_min": 15},
        {"op": "010", "name": "Формовочная",        "equipment": "Формовочная линия",      "time_min": 30},
        {"op": "015", "name": "Заливка",            "equipment": "Плавильная печь",        "time_min": 20},
        {"op": "020", "name": "Выбивка и обрубка",  "equipment": "Обрубной участок",       "time_min": 35},
        {"op": "025", "name": "Термообработка",     "equipment": "Печь отжига",            "time_min": 40},
        {"op": "030", "name": "Механообработка",    "equipment": "Обрабатывающий центр",   "time_min": 75},
        {"op": "035", "name": "Контрольная",        "equipment": "КИМ, дефектоскоп",       "time_min": 25},
    ],
    "printing": [
        {"op": "005", "name": "Подготовка модели",  "equipment": "АРМ технолога",          "time_min": 30},
        {"op": "010", "name": "Слайсинг",           "equipment": "ПО слайсера",            "time_min": 20},
        {"op": "015", "name": "Печать",             "equipment": "3D-принтер",             "time_min": 480},
        {"op": "020", "name": "Удаление поддержек", "equipment": "Верстак",                "time_min": 45},
        {"op": "025", "name": "Постобработка",      "equipment": "Пескоструй",             "time_min": 30},
        {"op": "030", "name": "Контрольная",        "equipment": "Штангенциркуль, КИМ",    "time_min": 15},
    ],
}


def build_report(project: dict, variant: dict, metrics: dict, validation: list[dict]) -> dict:
    """Собирает полный JSON-отчёт из результатов расчёта."""
    method = variant["method"]
    batch = project.get("batch_size", 1)
    route = ROUTE_TEMPLATES.get(method, [])
    total_min = sum(op["time_min"] for op in route)

    return {
        "meta": {
            "report_id": f'RPT-{datetime.now():%Y%m%d-%H%M%S}',
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "platform": "SmartMach — Конструктор типовых узлов",
            "project_name": project.get("name", "Корпус редуктора"),
            "customer": project.get("customer", "—"),
            "unit_type": project.get("unit_type", "gearbox_housing"),
        },
        "specification": {
            "items": [
                {"pos": 1, "designation": "СМ.01.001", "name": "Корпус редуктора",
                 "qty": batch, "material": project.get("material", "СЧ20"),
                 "mass_kg": metrics.get("mass_kg"), "note": "Основная деталь"},
                {"pos": 2, "designation": "ГОСТ 8338-75", "name": "Подшипник шариковый",
                 "qty": metrics.get("bore_count", 2) * batch, "material": "ШХ15",
                 "mass_kg": 0.35, "note": "Покупное изделие"},
                {"pos": 3, "designation": "ГОСТ 7798-70", "name": "Болт М12×40",
                 "qty": 4 * batch, "material": "Сталь 40Х", "mass_kg": 0.06,
                 "note": "Крепление к раме"},
                {"pos": 4, "designation": "ГОСТ 9833-73", "name": "Кольцо уплотнительное",
                 "qty": metrics.get("bore_count", 2) * batch, "material": "Резина",
                 "mass_kg": 0.01, "note": "Герметизация"},
            ],
            "total_positions": 4,
            "total_mass_kg": round(metrics.get("mass_kg", 0) * batch, 2),
        },
        "route_card": {
            "method": method,
            "method_title": variant["title"],
            "operations": route,
            "total_time_min": total_min,
            "total_time_h": round(total_min / 60, 2),
            "batch_time_h": round(total_min * batch / 60, 1),
        },
        "cost": {
            "currency": "RUB",
            "batch_size": batch,
            "cost_per_unit": variant["cost_per_unit"],
            "cost_total": variant["cost_total"],
            "lead_days": variant["lead_days"],
            "breakdown": variant["cost_breakdown"],
        },
        "geometry": metrics,
        "validation": validation,
        "risks": variant.get("risks", []),
        "tooling": variant.get("tooling", []),
        "justification": variant.get("reasons", []),
    }
