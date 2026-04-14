"""
Equipment API — CRUD справочник оборудования.
Все данные изолированы по предприятию (company_id из сессии).
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

S = "t_p45794133_smartmach_platform_p"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

FIELDS = ["name", "model", "type", "manufacturer", "year", "axes", "control_system",
          "spindle_speed", "table_size", "travel_x", "travel_y", "travel_z",
          "accuracy", "power", "weight", "coolant", "tool_capacity",
          "status", "location", "inventory_number", "next_maintenance", "notes"]

CAMEL_MAP = {
    "id": "id", "name": "name", "model": "model", "type": "type",
    "manufacturer": "manufacturer", "year": "year", "axes": "axes",
    "control_system": "controlSystem", "spindle_speed": "spindleSpeed",
    "table_size": "tableSize", "travel_x": "travelX", "travel_y": "travelY",
    "travel_z": "travelZ", "accuracy": "accuracy", "power": "power",
    "weight": "weight", "coolant": "coolant", "tool_capacity": "toolCapacity",
    "status": "status", "location": "location",
    "inventory_number": "inventoryNumber", "next_maintenance": "nextMaintenance",
    "notes": "notes",
}


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def camel(row):
    return {CAMEL_MAP[k]: v for k, v in dict(row).items() if k in CAMEL_MAP}


def get_company_id(cur, sid):
    if not sid:
        return None
    cur.execute(
        f"SELECT company_id FROM {S}.sessions WHERE id = %s AND expires_at > now() LIMIT 1",
        (sid,)
    )
    row = cur.fetchone()
    return row["company_id"] if row else None


def handler(event: dict, context) -> dict:
    """Equipment: справочник станков с изоляцией данных по предприятию."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    parts = [p for p in path.split("/") if p]
    machine_id = int(parts[-1]) if parts and parts[-1].isdigit() else None
    sid = event.get("headers", {}).get("X-Session-Id") or ""

    conn = db()
    cur = conn.cursor()

    try:
        company_id = get_company_id(cur, sid)
        if not company_id:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован или не выбрано предприятие."})}

        cols = ", ".join(["id"] + FIELDS)

        if method == "GET" and not machine_id:
            cur.execute(f"SELECT {cols} FROM {S}.equipment WHERE company_id = %s ORDER BY id", (company_id,))
            return {"statusCode": 200, "headers": CORS, "body": json.dumps([camel(r) for r in cur.fetchall()], ensure_ascii=False)}

        if method == "GET" and machine_id:
            cur.execute(f"SELECT {cols} FROM {S}.equipment WHERE id = %s AND company_id = %s", (machine_id, company_id))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(camel(row), ensure_ascii=False)}

        body = json.loads(event.get("body") or "{}")

        if method == "POST" and not machine_id:
            placeholders = ", ".join(["%s"] * (len(FIELDS) + 1))
            cur.execute(
                f"INSERT INTO {S}.equipment ({', '.join(FIELDS)}, company_id) VALUES ({placeholders}) RETURNING id",
                (
                    body.get("name", ""), body.get("model", ""), body.get("type", ""),
                    body.get("manufacturer", ""), body.get("year", 2020), body.get("axes", 3),
                    body.get("controlSystem", ""), body.get("spindleSpeed", ""), body.get("tableSize", ""),
                    body.get("travelX", ""), body.get("travelY", ""), body.get("travelZ", ""),
                    body.get("accuracy", ""), body.get("power", ""), body.get("weight", ""),
                    body.get("coolant", ""), body.get("toolCapacity", 0), body.get("status", "active"),
                    body.get("location", ""), body.get("inventoryNumber", ""),
                    body.get("nextMaintenance", ""), body.get("notes", ""),
                    company_id,
                )
            )
            new_id = cur.fetchone()["id"]
            conn.commit()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": new_id})}

        if method == "PUT" and machine_id:
            cur.execute(
                f"""UPDATE {S}.equipment SET
                    name=%s, model=%s, type=%s, manufacturer=%s, year=%s, axes=%s,
                    control_system=%s, spindle_speed=%s, table_size=%s,
                    travel_x=%s, travel_y=%s, travel_z=%s,
                    accuracy=%s, power=%s, weight=%s, coolant=%s, tool_capacity=%s,
                    status=%s, location=%s, inventory_number=%s, next_maintenance=%s,
                    notes=%s, updated_at=NOW()
                    WHERE id=%s AND company_id=%s""",
                (
                    body.get("name", ""), body.get("model", ""), body.get("type", ""),
                    body.get("manufacturer", ""), body.get("year", 2020), body.get("axes", 3),
                    body.get("controlSystem", ""), body.get("spindleSpeed", ""), body.get("tableSize", ""),
                    body.get("travelX", ""), body.get("travelY", ""), body.get("travelZ", ""),
                    body.get("accuracy", ""), body.get("power", ""), body.get("weight", ""),
                    body.get("coolant", ""), body.get("toolCapacity", 0), body.get("status", "active"),
                    body.get("location", ""), body.get("inventoryNumber", ""),
                    body.get("nextMaintenance", ""), body.get("notes", ""),
                    machine_id, company_id,
                )
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if method == "DELETE" and machine_id:
            cur.execute(f"UPDATE {S}.equipment SET status = 'decommissioned' WHERE id = %s AND company_id = %s", (machine_id, company_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}

    finally:
        cur.close()
        conn.close()
