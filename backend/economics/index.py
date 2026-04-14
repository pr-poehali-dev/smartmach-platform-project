"""
Economics API — данные модуля Экономика и CRUD сотрудников.
Все данные изолированы по предприятию (company_id из сессии).
?resource=economics_data  — GET/POST данных
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
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

S = "t_p45794133_smartmach_platform_p"


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


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
    """Economics: расчётные данные и справочник сотрудников с изоляцией по предприятию."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    resource = qs.get("resource", "")
    rec_id = qs.get("id")
    sid = event.get("headers", {}).get("X-Session-Id") or ""

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = db()
    cur = conn.cursor()

    try:
        company_id = get_company_id(cur, sid)
        if not company_id:
            return err("Не авторизован или не выбрано предприятие.", 401)

        # ── ECONOMICS DATA ───────────────────────────────────────────
        if method == "GET" and resource == "economics_data":
            cur.execute(f"SELECT key, value FROM {S}.economics_data WHERE company_id = %s ORDER BY key", (company_id,))
            rows = cur.fetchall()
            result = {r["key"]: r["value"] for r in rows}
            return ok(result)

        if method == "POST" and resource == "economics_data":
            key = body.get("key")
            value = body.get("value")
            if not key:
                return err("key обязателен")
            cur.execute(f"""
                INSERT INTO {S}.economics_data (key, value, updated_at, company_id)
                VALUES (%s, %s, NOW(), %s)
                ON CONFLICT (key, company_id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            """, (key, json.dumps(value, ensure_ascii=False), company_id))
            conn.commit()
            return ok({"ok": True})

        # ── EMPLOYEES ────────────────────────────────────────────────
        if method == "GET" and resource == "employees" and not rec_id:
            cur.execute(f"""
                SELECT id, full_name, position, department, email, phone,
                       salary, hire_date, status, notes, created_at, updated_at
                FROM {S}.employees WHERE company_id = %s ORDER BY full_name
            """, (company_id,))
            return ok(list(cur.fetchall()))

        if method == "POST" and resource == "employees":
            cur.execute(f"""
                INSERT INTO {S}.employees (full_name, position, department, email, phone, salary, hire_date, status, notes, company_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """, (
                body.get("full_name", ""), body.get("position", ""), body.get("department", ""),
                body.get("email", ""), body.get("phone", ""),
                body.get("salary", 0), body.get("hire_date") or None,
                body.get("status", "active"), body.get("notes", ""),
                company_id,
            ))
            new_id = cur.fetchone()["id"]
            conn.commit()
            return ok({"id": new_id}, 201)

        if method == "PUT" and resource == "employees" and rec_id:
            fields, vals = [], []
            for f in ("full_name", "position", "department", "email", "phone", "salary", "hire_date", "status", "notes"):
                if f in body:
                    fields.append(f"{f} = %s")
                    vals.append(body[f] if body[f] != "" else (None if f == "hire_date" else body[f]))
            if not fields:
                return err("Нет полей для обновления")
            fields.append("updated_at = NOW()")
            vals += [int(rec_id), company_id]
            cur.execute(f"UPDATE {S}.employees SET {', '.join(fields)} WHERE id = %s AND company_id = %s", vals)
            conn.commit()
            return ok({"ok": True})

        if method == "DELETE" and resource == "employees" and rec_id:
            cur.execute(f"UPDATE {S}.employees SET status = 'fired' WHERE id = %s AND company_id = %s", (int(rec_id), company_id))
            conn.commit()
            return ok({"ok": True})

        return err("Маршрут не найден", 404)

    finally:
        cur.close()
        conn.close()
