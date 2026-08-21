"""
Слой интеграции с ЧПУ и промышленным оборудованием.

Единый интерфейс MachineAdapter поверх четырёх транспортов:

  OPC UA    — современные стойки (Siemens, Fanuc, Heidenhain)
  Modbus TCP — старые станки через внешние модули ввода-вывода
  MQTT      — IoT-датчики и распределённые схемы
  Simulator — воспроизводимый цех для отладки и демонстрации

Драйверы промышленных протоколов (asyncua, pymodbus, paho-mqtt) —
тяжёлые зависимости, которых может не быть в окружении. Поэтому каждый
адаптер импортирует свой драйвер лениво и при его отсутствии сообщает
об этом штатно, а не роняет сервис: остальные транспорты и симулятор
продолжают работать. Это же позволяет демонстрировать комплекс на любом
ноутбуке без промышленной обвязки.
"""
from __future__ import annotations

import math
import random
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Literal

# ─────────────────── Единая модель данных ───────────────────

MachineState = Literal["READY", "RUNNING", "PAUSED", "ERROR", "OFFLINE"]


@dataclass
class MachineStatus:
    """Снимок состояния станка, приведённый к общему виду."""
    state: MachineState = "OFFLINE"
    program: str = ""
    feed_override_pct: float = 100.0
    arc_current_a: float = 0.0
    arc_voltage_v: float = 0.0
    laser_power_w: float = 0.0
    gas_flow_l_min: float = 0.0
    alarm: str = ""
    timestamp: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class WriteResult:
    ok: bool
    detail: str = ""
    applied: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


class MachineAdapter(ABC):
    """
    Базовый интерфейс адаптера.

    Ядро работает только с этими методами и не знает, какой транспорт
    под ним. Замена OPC UA на Modbus не затрагивает алгоритмы управления.
    """

    transport: str = "abstract"

    @abstractmethod
    def connect(self) -> WriteResult:
        ...

    @abstractmethod
    def read_status(self) -> MachineStatus:
        ...

    @abstractmethod
    def read_signal(self, samples: int) -> dict[str, list[float]]:
        """Осциллограммы тока, напряжения и мощности за окно наблюдения."""

    @abstractmethod
    def write_feed_override(self, percent: float) -> WriteResult:
        """Коррекция подачи, % от запрограммированной."""

    @abstractmethod
    def write_params(self, params: dict[str, float]) -> WriteResult:
        """Запись технологических параметров процесса."""

    def describe(self) -> dict:
        return {"transport": self.transport, "available": True}


# ─────────────────── OPC UA ───────────────────

# Карта узлов адресного пространства. Вынесена в константу: при подключении
# к конкретной стойке меняются только эти строки, код остаётся прежним.
OPCUA_NODES = {
    "state": "ns=2;s=Status.MachineState",
    "program": "ns=2;s=Process.CurrentProgram",
    "feed_override": "ns=2;s=Process.FeedrateOverride",
    "arc_current": "ns=2;s=Sensors.ArcCurrent",
    "arc_voltage": "ns=2;s=Sensors.ArcVoltage",
    "laser_power": "ns=2;s=Sensors.LaserPower",
    "gas_flow": "ns=2;s=Sensors.GasFlow",
    "alarm": "ns=2;s=Status.Alarm",
}


class OpcUaAdapter(MachineAdapter):
    """
    Адаптер OPC UA — промышленный стандарт обмена с современными стойками.

    Требует пакет asyncua. Без него адаптер сообщает о недоступности
    транспорта, но не мешает работе остальной системы.
    """

    transport = "opcua"

    def __init__(self, endpoint: str = "opc.tcp://localhost:4840", nodes: dict | None = None):
        self.endpoint = endpoint
        self.nodes = {**OPCUA_NODES, **(nodes or {})}
        self._client: Any = None

    @staticmethod
    def driver_available() -> bool:
        try:
            import asyncua  # noqa: F401
            return True
        except ImportError:
            return False

    def connect(self) -> WriteResult:
        if not self.driver_available():
            return WriteResult(
                ok=False,
                detail=("Драйвер asyncua не установлен. "
                        "Установите: pip install asyncua"),
            )
        try:
            from asyncua.sync import Client
            self._client = Client(url=self.endpoint)
            self._client.connect()
            return WriteResult(ok=True, detail=f"Подключено к {self.endpoint}")
        except Exception as exc:
            return WriteResult(ok=False, detail=f"Ошибка подключения: {exc}")

    def read_status(self) -> MachineStatus:
        if self._client is None:
            return MachineStatus(state="OFFLINE", alarm="Нет подключения к OPC UA")
        try:
            get = lambda key: self._client.get_node(self.nodes[key]).read_value()
            return MachineStatus(
                state=str(get("state")),
                program=str(get("program")),
                feed_override_pct=float(get("feed_override")),
                arc_current_a=float(get("arc_current")),
                arc_voltage_v=float(get("arc_voltage")),
                laser_power_w=float(get("laser_power")),
                gas_flow_l_min=float(get("gas_flow")),
                alarm=str(get("alarm") or ""),
                timestamp=datetime.now().isoformat(timespec="seconds"),
            )
        except Exception as exc:
            return MachineStatus(state="ERROR", alarm=f"Ошибка чтения: {exc}")

    def read_signal(self, samples: int) -> dict[str, list[float]]:
        """
        Осциллограмма собирается подпиской на узлы датчиков.
        Частота опроса ограничена стойкой, поэтому для анализа
        высокочастотных явлений нужен отдельный АЦП на шлюзе.
        """
        if self._client is None:
            return {"voltage": [], "current": [], "laser_power": []}
        volts, curs, powers = [], [], []
        for _ in range(samples):
            st = self.read_status()
            volts.append(st.arc_voltage_v)
            curs.append(st.arc_current_a)
            powers.append(st.laser_power_w)
        return {"voltage": volts, "current": curs, "laser_power": powers}

    def write_feed_override(self, percent: float) -> WriteResult:
        if self._client is None:
            return WriteResult(ok=False, detail="Нет подключения к OPC UA")
        try:
            node = self._client.get_node(self.nodes["feed_override"])
            node.write_value(float(percent))
            return WriteResult(ok=True, applied={"feed_override_pct": percent})
        except Exception as exc:
            return WriteResult(ok=False, detail=f"Ошибка записи: {exc}")

    def write_params(self, params: dict[str, float]) -> WriteResult:
        if self._client is None:
            return WriteResult(ok=False, detail="Нет подключения к OPC UA")
        applied = {}
        for key, value in params.items():
            node_id = self.nodes.get(key)
            if not node_id:
                continue
            try:
                self._client.get_node(node_id).write_value(float(value))
                applied[key] = value
            except Exception as exc:
                return WriteResult(ok=False, detail=f"Ошибка записи {key}: {exc}",
                                   applied=applied)
        return WriteResult(ok=True, applied=applied)

    def describe(self) -> dict:
        return {
            "transport": self.transport,
            "available": self.driver_available(),
            "endpoint": self.endpoint,
            "nodes": self.nodes,
            "driver": "asyncua",
            "note": "Стандарт для стоек Siemens, Fanuc, Heidenhain",
        }


# ─────────────────── Modbus TCP ───────────────────

# Карта регистров. Значения хранятся как целые, поэтому применяется
# масштабный коэффициент: ток 110.5 А передаётся как 1105.
MODBUS_REGISTERS = {
    "state": {"address": 0, "scale": 1},
    "arc_current": {"address": 1, "scale": 10},
    "arc_voltage": {"address": 2, "scale": 10},
    "laser_power": {"address": 3, "scale": 1},
    "gas_flow": {"address": 4, "scale": 10},
    "feed_override": {"address": 5, "scale": 1},
}

MODBUS_STATE_MAP = {0: "OFFLINE", 1: "READY", 2: "RUNNING", 3: "PAUSED", 4: "ERROR"}


class ModbusAdapter(MachineAdapter):
    """
    Адаптер Modbus TCP — самый дешёвый путь к старому оборудованию.

    Станок не обязан уметь Modbus: достаточно внешних модулей ввода-вывода
    на шлюзе (Raspberry Pi), которые снимают ток и напряжение с шунтов.
    """

    transport = "modbus"

    def __init__(self, host: str = "127.0.0.1", port: int = 502, unit: int = 1,
                 registers: dict | None = None):
        self.host = host
        self.port = port
        self.unit = unit
        self.registers = {**MODBUS_REGISTERS, **(registers or {})}
        self._client: Any = None

    @staticmethod
    def driver_available() -> bool:
        try:
            import pymodbus  # noqa: F401
            return True
        except ImportError:
            return False

    def connect(self) -> WriteResult:
        if not self.driver_available():
            return WriteResult(
                ok=False,
                detail="Драйвер pymodbus не установлен. Установите: pip install pymodbus",
            )
        try:
            from pymodbus.client import ModbusTcpClient
            self._client = ModbusTcpClient(self.host, port=self.port)
            if not self._client.connect():
                return WriteResult(ok=False, detail=f"Не удалось подключиться к {self.host}:{self.port}")
            return WriteResult(ok=True, detail=f"Подключено к {self.host}:{self.port}")
        except Exception as exc:
            return WriteResult(ok=False, detail=f"Ошибка подключения: {exc}")

    def _read_reg(self, key: str) -> float:
        spec = self.registers[key]
        rr = self._client.read_holding_registers(spec["address"], count=1, slave=self.unit)
        if rr.isError():
            raise RuntimeError(f"Ошибка чтения регистра {spec['address']}")
        return rr.registers[0] / spec["scale"]

    def read_status(self) -> MachineStatus:
        if self._client is None:
            return MachineStatus(state="OFFLINE", alarm="Нет подключения к Modbus")
        try:
            return MachineStatus(
                state=MODBUS_STATE_MAP.get(int(self._read_reg("state")), "OFFLINE"),
                program="",
                feed_override_pct=self._read_reg("feed_override"),
                arc_current_a=self._read_reg("arc_current"),
                arc_voltage_v=self._read_reg("arc_voltage"),
                laser_power_w=self._read_reg("laser_power"),
                gas_flow_l_min=self._read_reg("gas_flow"),
                timestamp=datetime.now().isoformat(timespec="seconds"),
            )
        except Exception as exc:
            return MachineStatus(state="ERROR", alarm=f"Ошибка чтения: {exc}")

    def read_signal(self, samples: int) -> dict[str, list[float]]:
        if self._client is None:
            return {"voltage": [], "current": [], "laser_power": []}
        volts, curs, powers = [], [], []
        for _ in range(samples):
            try:
                curs.append(self._read_reg("arc_current"))
                volts.append(self._read_reg("arc_voltage"))
                powers.append(self._read_reg("laser_power"))
            except Exception:
                break
        return {"voltage": volts, "current": curs, "laser_power": powers}

    def write_feed_override(self, percent: float) -> WriteResult:
        if self._client is None:
            return WriteResult(ok=False, detail="Нет подключения к Modbus")
        try:
            spec = self.registers["feed_override"]
            self._client.write_register(spec["address"], int(percent * spec["scale"]),
                                        slave=self.unit)
            return WriteResult(ok=True, applied={"feed_override_pct": percent})
        except Exception as exc:
            return WriteResult(ok=False, detail=f"Ошибка записи: {exc}")

    def write_params(self, params: dict[str, float]) -> WriteResult:
        if self._client is None:
            return WriteResult(ok=False, detail="Нет подключения к Modbus")
        applied = {}
        for key, value in params.items():
            spec = self.registers.get(key)
            if not spec:
                continue
            try:
                self._client.write_register(spec["address"], int(value * spec["scale"]),
                                            slave=self.unit)
                applied[key] = value
            except Exception as exc:
                return WriteResult(ok=False, detail=f"Ошибка записи {key}: {exc}", applied=applied)
        return WriteResult(ok=True, applied=applied)

    def describe(self) -> dict:
        return {
            "transport": self.transport,
            "available": self.driver_available(),
            "host": self.host,
            "port": self.port,
            "registers": self.registers,
            "driver": "pymodbus",
            "note": "Путь к старому оборудованию через модули ввода-вывода",
        }


# ─────────────────── MQTT ───────────────────

MQTT_TOPICS = {
    "status": "cnc/machine/status",
    "arc_current": "sensors/arc/current",
    "arc_voltage": "sensors/arc/voltage",
    "laser_power": "sensors/laser/power",
    "gas_flow": "sensors/gas/flow",
    "commands": "cnc/machine/commands",
    "events": "analytics/events",
}


class MqttAdapter(MachineAdapter):
    """
    Адаптер MQTT — асинхронный обмен с IoT-датчиками.

    Подходит для распределённой схемы: камеры, спектрометры и датчики газа
    публикуют данные независимо, ядро подписывается на нужные топики.
    """

    transport = "mqtt"

    def __init__(self, broker: str = "localhost", port: int = 1883,
                 topics: dict | None = None):
        self.broker = broker
        self.port = port
        self.topics = {**MQTT_TOPICS, **(topics or {})}
        self._client: Any = None
        self._cache: dict[str, list[float]] = {"voltage": [], "current": [], "laser_power": []}

    @staticmethod
    def driver_available() -> bool:
        try:
            import paho.mqtt.client  # noqa: F401
            return True
        except ImportError:
            return False

    def connect(self) -> WriteResult:
        if not self.driver_available():
            return WriteResult(
                ok=False,
                detail="Драйвер paho-mqtt не установлен. Установите: pip install paho-mqtt",
            )
        try:
            import paho.mqtt.client as mqtt
            self._client = mqtt.Client()
            self._client.connect(self.broker, self.port, keepalive=60)
            for key in ("arc_current", "arc_voltage", "laser_power", "status"):
                self._client.subscribe(self.topics[key])
            self._client.loop_start()
            return WriteResult(ok=True, detail=f"Подключено к брокеру {self.broker}:{self.port}")
        except Exception as exc:
            return WriteResult(ok=False, detail=f"Ошибка подключения: {exc}")

    def read_status(self) -> MachineStatus:
        if self._client is None:
            return MachineStatus(state="OFFLINE", alarm="Нет подключения к брокеру MQTT")
        return MachineStatus(
            state="RUNNING",
            timestamp=datetime.now().isoformat(timespec="seconds"),
        )

    def read_signal(self, samples: int) -> dict[str, list[float]]:
        return {k: v[-samples:] for k, v in self._cache.items()}

    def write_feed_override(self, percent: float) -> WriteResult:
        if self._client is None:
            return WriteResult(ok=False, detail="Нет подключения к брокеру MQTT")
        import json
        self._client.publish(self.topics["commands"],
                             json.dumps({"feed_override_pct": percent}))
        return WriteResult(ok=True, applied={"feed_override_pct": percent})

    def write_params(self, params: dict[str, float]) -> WriteResult:
        if self._client is None:
            return WriteResult(ok=False, detail="Нет подключения к брокеру MQTT")
        import json
        self._client.publish(self.topics["commands"], json.dumps(params))
        return WriteResult(ok=True, applied=params)

    def describe(self) -> dict:
        return {
            "transport": self.transport,
            "available": self.driver_available(),
            "broker": self.broker,
            "port": self.port,
            "topics": self.topics,
            "driver": "paho-mqtt",
            "note": "IoT-датчики и распределённая архитектура",
        }


# ─────────────────── Симулятор ───────────────────

class SimulatorAdapter(MachineAdapter):
    """
    Программный станок для отладки и демонстрации.

    Воспроизводит поведение реального оборудования, включая реакцию на
    записанные параметры: снижение скорости меняет ток и напряжение.
    Позволяет проверить весь контур управления без доступа к цеху —
    и показать работу комплекса на защите заявки.
    """

    transport = "simulator"

    def __init__(self, scenario: str = "stable", seed: int = 42):
        self.scenario = scenario
        self._rng = random.Random(seed)
        self._params: dict[str, float] = {
            "laser_power_w": 4000.0,
            "plasma_current_a": 85.0,
            "speed_mm_min": 1900.0,
            "gas_flow_l_min": 22.0,
        }
        self._feed_override = 100.0
        self._connected = False
        self._tick = 0

    def connect(self) -> WriteResult:
        self._connected = True
        return WriteResult(ok=True, detail=f"Симулятор запущен, сценарий «{self.scenario}»")

    def read_status(self) -> MachineStatus:
        if not self._connected:
            return MachineStatus(state="OFFLINE")
        sig = self.read_signal(8)
        avg = lambda xs: sum(xs) / len(xs) if xs else 0.0
        return MachineStatus(
            state="RUNNING",
            program="STEEL_10MM.NC",
            feed_override_pct=self._feed_override,
            arc_current_a=round(avg(sig["current"]), 2),
            arc_voltage_v=round(avg(sig["voltage"]), 2),
            laser_power_w=round(avg(sig["laser_power"]), 1),
            gas_flow_l_min=self._params["gas_flow_l_min"],
            timestamp=datetime.now().isoformat(timespec="seconds"),
        )

    def read_signal(self, samples: int) -> dict[str, list[float]]:
        volts, curs, powers = [], [], []
        base_i = self._params["plasma_current_a"]
        base_p = self._params["laser_power_w"]
        # Напряжение растёт с длиной дуги, которая зависит от скорости
        base_u = 26 + self._params["speed_mm_min"] / 900

        for i in range(samples):
            self._tick += 1
            if self.scenario == "arc_wander":
                volts.append(base_u + self._rng.gauss(0, 2.2))
                curs.append(base_i + self._rng.gauss(0, 7))
                powers.append(base_p + self._rng.gauss(0, 20))
            elif self.scenario == "double_arcing":
                spike = 46 if self._tick % 60 == 0 else 0
                volts.append(base_u - (i / max(1, samples)) * 5 + self._rng.gauss(0, 0.6))
                curs.append(base_i + spike + self._rng.gauss(0, 1.5))
                powers.append(base_p + self._rng.gauss(0, 15))
            elif self.scenario == "power_drift":
                volts.append(base_u + self._rng.gauss(0, 0.3))
                curs.append(base_i + self._rng.gauss(0, 1))
                powers.append(base_p * (1 - 0.14 * i / max(1, samples)) + self._rng.gauss(0, 12))
            else:
                volts.append(base_u + self._rng.gauss(0, 0.25))
                curs.append(base_i + self._rng.gauss(0, 0.8))
                powers.append(base_p + self._rng.gauss(0, 15))

        return {"voltage": volts, "current": curs, "laser_power": powers}

    def write_feed_override(self, percent: float) -> WriteResult:
        self._feed_override = max(10.0, min(200.0, percent))
        # Коррекция подачи меняет фактическую скорость — как на реальной стойке
        self._params["speed_mm_min"] = 1900.0 * self._feed_override / 100
        return WriteResult(ok=True, applied={"feed_override_pct": self._feed_override})

    def write_params(self, params: dict[str, float]) -> WriteResult:
        applied = {}
        for key, value in params.items():
            if key in self._params:
                self._params[key] = float(value)
                applied[key] = value
        return WriteResult(ok=True, applied=applied)

    def set_scenario(self, scenario: str) -> None:
        self.scenario = scenario

    def describe(self) -> dict:
        return {
            "transport": self.transport,
            "available": True,
            "scenario": self.scenario,
            "params": dict(self._params),
            "note": "Программный станок: полный контур без доступа к оборудованию",
        }


# ─────────────────── Фабрика ───────────────────

ADAPTERS: dict[str, type[MachineAdapter]] = {
    "opcua": OpcUaAdapter,
    "modbus": ModbusAdapter,
    "mqtt": MqttAdapter,
    "simulator": SimulatorAdapter,
}


def create_adapter(transport: str, **kwargs: Any) -> MachineAdapter:
    """Создаёт адаптер по названию транспорта."""
    cls = ADAPTERS.get(transport)
    if cls is None:
        raise ValueError(
            f"Неизвестный транспорт «{transport}». "
            f"Доступны: {', '.join(ADAPTERS)}"
        )
    return cls(**kwargs)


def transports_info() -> list[dict]:
    """Сводка по транспортам: какие драйверы доступны в текущем окружении."""
    out = []
    for name, cls in ADAPTERS.items():
        try:
            out.append(cls().describe())
        except Exception as exc:
            out.append({"transport": name, "available": False, "error": str(exc)})
    return out
