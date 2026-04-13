"""
Economics API — сохранение/загрузка данных модуля Экономика и CRUD сотрудников.
?resource=economics_data  — GET/POST данных (materials, workers, overheads, products, settings)
?resource=employees       — GET список / POST создать
?resource=employees&id=N  — PUT обновить / DELETE удалить
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)

def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(data, default=str, ensure_ascii=False)}

def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    """Economics: хранение расчётных данных и справочник сотрудников."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    resource = qs.get("resource", "")
    rec_id = qs.get("id")

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = db()
    cur = conn.cursor()

    try:
        # ── ECONOMICS DATA ──────────────────────────────────────────

        # GET ?resource=economics_data  — вернуть все ключи
        if method == "GET" and resource == "economics_data":
            cur.execute("SELECT key, value FROM economics_data ORDER BY key")
            rows = cur.fetchall()
            result = {r["key"]: r["value"] for r in rows}
            return ok(result)

        # POST ?resource=economics_data  — сохранить/обновить ключ
        # body: { key: str, value: any }
        if method == "POST" and resource == "economics_data":
            key = body.get("key")
            value = body.get("value")
            if not key:
                return err("key обязателен")
            cur.execute("""
                INSERT INTO economics_data (key, value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            """, (key, json.dumps(value, ensure_ascii=False)))
            conn.commit()
            return ok({"ok": True})

        # ── EMPLOYEES ───────────────────────────────────────────────

        # GET ?resource=employees  — список всех
        if method == "GET" and resource == "employees" and not rec_id:
            cur.execute("""
                SELECT id, full_name, position, department, email, phone,
                       salary, hire_date, status, notes, created_at, updated_at
                FROM employees ORDER BY full_name
            """)
            return ok(list(cur.fetchall()))

        # POST ?resource=employees  — создать
        if method == "POST" and resource == "employees":
            cur.execute("""
                INSERT INTO employees (full_name, position, department, email, phone, salary, hire_date, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
            """, (
                body.get("full_name", ""), body.get("position", ""), body.get("department", ""),
                body.get("email", ""), body.get("phone", ""),
                body.get("salary", 0),
                body.get("hire_date") or None,
                body.get("status", "active"), body.get("notes", ""),
            ))
            new_id = cur.fetchone()["id"]
            conn.commit()
            return ok({"id": new_id}, 201)

        # PUT ?resource=employees&id=N  — обновить
        if method == "PUT" and resource == "employees" and rec_id:
            fields, vals = [], []
            for f in ("full_name", "position", "department", "email", "phone", "salary", "hire_date", "status", "notes"):
                if f in body:
                    fields.append(f"{f} = %s")
                    vals.append(body[f] if body[f] != "" else (None if f == "hire_date" else body[f]))
            if not fields:
                return err("Нет полей для обновления")
            fields.append("updated_at = NOW()")
            vals.append(int(rec_id))
            cur.execute(f"UPDATE employees SET {', '.join(fields)} WHERE id = %s", vals)
            conn.commit()
            return ok({"ok": True})

        # DELETE ?resource=employees&id=N  — удалить
        if method == "DELETE" and resource == "employees" and rec_id:
            cur.execute("DELETE FROM employees WHERE id = %s", (int(rec_id),))
            conn.commit()
            return ok({"ok": True})

        return err("Маршрут не найден", 404)

    finally:
        cur.close()
        conn.close()
