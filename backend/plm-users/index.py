"""
PLM Users API — список пользователей системы SmartMach.
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


def handler(event: dict, context) -> dict:
    """PLM Users: список пользователей."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name, email, role, avatar_url, created_at FROM users ORDER BY name")
        rows = cur.fetchall()
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps(rows, default=str, ensure_ascii=False)
        }
    finally:
        cur.close()
        conn.close()
