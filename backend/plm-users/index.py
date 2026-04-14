"""
PLM Users API — список пользователей предприятия SmartMach.
Данные изолированы по предприятию (company_id из сессии).
"""
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

S = "t_p45794133_smartmach_platform_p"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


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
    """PLM Users: список пользователей предприятия."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    sid = event.get("headers", {}).get("X-Session-Id") or ""
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)
    cur = conn.cursor()
    try:
        company_id = get_company_id(cur, sid)
        if not company_id:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован."})}

        cur.execute(
            f"SELECT id, name, email, role, avatar_url, created_at FROM {S}.users WHERE company_id = %s ORDER BY name",
            (company_id,)
        )
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r["created_at"] = str(r["created_at"])
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(rows, ensure_ascii=False)}
    finally:
        cur.close()
        conn.close()
