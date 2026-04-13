"""
Leads API — сохранение заявок с лендинга СмартМаш.
POST / — сохранить заявку
GET  / — список заявок (для внутреннего использования)
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

S = "t_p45794133_smartmach_platform_p"


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Leads: приём заявок с лендинга."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")

    conn = db()
    cur = conn.cursor()

    try:
        if method == "POST":
            body = {}
            if event.get("body"):
                body = json.loads(event["body"])

            name = (body.get("name") or "").strip()
            contact = (body.get("phone") or body.get("contact") or "").strip()

            if not name or not contact:
                return err("Укажите имя и контакт")

            cur.execute(f"""
                INSERT INTO {S}.leads (name, org, contact, question)
                VALUES (%s, %s, %s, %s) RETURNING id, created_at
            """, (
                name,
                (body.get("org") or "").strip() or None,
                contact,
                (body.get("question") or "").strip() or None,
            ))
            row = cur.fetchone()
            conn.commit()
            return ok({"ok": True, "id": row["id"]}, 201)

        if method == "GET":
            cur.execute(f"""
                SELECT id, name, org, contact, question, created_at
                FROM {S}.leads ORDER BY created_at DESC LIMIT 100
            """)
            return ok(list(cur.fetchall()))

        return err("Метод не поддерживается", 405)

    finally:
        cur.close()
        conn.close()
