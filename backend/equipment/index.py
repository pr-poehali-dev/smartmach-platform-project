import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def row_to_dict(row, cursor):
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))

def snake_to_camel(d: dict) -> dict:
    mapping = {
        "id": "id",
        "name": "name",
        "model": "model",
        "type": "type",
        "manufacturer": "manufacturer",
        "year": "year",
        "axes": "axes",
        "control_system": "controlSystem",
        "spindle_speed": "spindleSpeed",
        "table_size": "tableSize",
        "travel_x": "travelX",
        "travel_y": "travelY",
        "travel_z": "travelZ",
        "accuracy": "accuracy",
        "power": "power",
        "weight": "weight",
        "coolant": "coolant",
        "tool_capacity": "toolCapacity",
        "status": "status",
        "location": "location",
        "inventory_number": "inventoryNumber",
        "next_maintenance": "nextMaintenance",
        "notes": "notes",
    }
    return {mapping[k]: v for k, v in d.items() if k in mapping}

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def handler(event: dict, context) -> dict:
    """CRUD-справочник оборудования: список, создание, обновление, удаление станков."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    parts = [p for p in path.split("/") if p]
    machine_id = int(parts[-1]) if parts and parts[-1].isdigit() else None

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET /  — список всех
        if method == "GET" and not machine_id:
            cur.execute("SELECT id, name, model, type, manufacturer, year, axes, control_system, spindle_speed, table_size, travel_x, travel_y, travel_z, accuracy, power, weight, coolant, tool_capacity, status, location, inventory_number, next_maintenance, notes FROM equipment ORDER BY id")
            rows = [snake_to_camel(row_to_dict(r, cur)) for r in cur.fetchall()]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(rows, ensure_ascii=False)}

        # GET /{id}  — один станок
        if method == "GET" and machine_id:
            cur.execute("SELECT id, name, model, type, manufacturer, year, axes, control_system, spindle_speed, table_size, travel_x, travel_y, travel_z, accuracy, power, weight, coolant, tool_capacity, status, location, inventory_number, next_maintenance, notes FROM equipment WHERE id = %s" % machine_id)
            row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "not found"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(snake_to_camel(row_to_dict(row, cur)), ensure_ascii=False)}

        body = json.loads(event.get("body") or "{}")

        # POST /  — создать
        if method == "POST" and not machine_id:
            cur.execute(
                """INSERT INTO equipment (name, model, type, manufacturer, year, axes, control_system, spindle_speed, table_size, travel_x, travel_y, travel_z, accuracy, power, weight, coolant, tool_capacity, status, location, inventory_number, next_maintenance, notes)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                (
                    body.get("name",""), body.get("model",""), body.get("type",""),
                    body.get("manufacturer",""), body.get("year", 2020), body.get("axes", 3),
                    body.get("controlSystem",""), body.get("spindleSpeed",""), body.get("tableSize",""),
                    body.get("travelX",""), body.get("travelY",""), body.get("travelZ",""),
                    body.get("accuracy",""), body.get("power",""), body.get("weight",""),
                    body.get("coolant",""), body.get("toolCapacity", 0), body.get("status","active"),
                    body.get("location",""), body.get("inventoryNumber",""),
                    body.get("nextMaintenance",""), body.get("notes",""),
                )
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 201, "headers": CORS, "body": json.dumps({"id": new_id})}

        # PUT /{id}  — обновить
        if method == "PUT" and machine_id:
            cur.execute(
                """UPDATE equipment SET name=%s, model=%s, type=%s, manufacturer=%s, year=%s, axes=%s,
                   control_system=%s, spindle_speed=%s, table_size=%s, travel_x=%s, travel_y=%s, travel_z=%s,
                   accuracy=%s, power=%s, weight=%s, coolant=%s, tool_capacity=%s, status=%s, location=%s,
                   inventory_number=%s, next_maintenance=%s, notes=%s, updated_at=NOW()
                   WHERE id=%s""",
                (
                    body.get("name",""), body.get("model",""), body.get("type",""),
                    body.get("manufacturer",""), body.get("year", 2020), body.get("axes", 3),
                    body.get("controlSystem",""), body.get("spindleSpeed",""), body.get("tableSize",""),
                    body.get("travelX",""), body.get("travelY",""), body.get("travelZ",""),
                    body.get("accuracy",""), body.get("power",""), body.get("weight",""),
                    body.get("coolant",""), body.get("toolCapacity", 0), body.get("status","active"),
                    body.get("location",""), body.get("inventoryNumber",""),
                    body.get("nextMaintenance",""), body.get("notes",""),
                    machine_id,
                )
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # DELETE /{id}  — удалить
        if method == "DELETE" and machine_id:
            cur.execute("DELETE FROM equipment WHERE id = %s" % machine_id)
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}

    finally:
        cur.close()
        conn.close()