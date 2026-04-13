"""
PLM Users API — список пользователей системы SmartMach.
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def handler(event: dict, context) -> dict:
    """PLM Users: список пользователей."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name, email, role, avatar_url, created_at FROM users ORDER BY name")
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r["created_at"] = str(r["created_at"])
        return {"statusCode": 200, "headers": CORS, "body": rows}
    finally:
        cur.close()
        conn.close()
