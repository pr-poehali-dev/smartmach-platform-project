"""
Журнал событий пользователя.
POST / — записать событие (session_id в заголовке X-Session-Id)
GET  / — получить события текущего пользователя (session_id в заголовке X-Session-Id)
"""
import os, json
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p45794133_smartmach_platform_p")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_id(conn, sid: str):
    with conn.cursor() as cur:
        cur.execute(
            f"""SELECT u.id FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.id = %s AND s.expires_at > now() AND u.is_active = true""",
            (sid,)
        )
        row = cur.fetchone()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    method = event.get("httpMethod", "GET")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    sid = event.get("headers", {}).get("X-Session-Id") or ""
    conn = get_conn()
    try:
        user_id = get_user_id(conn, sid) if sid else None
        if not user_id:
            return {"statusCode": 401, "headers": CORS,
                    "body": json.dumps({"error": "Не авторизован."})}

        # ── POST / — записать событие ────────────────────────────────
        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            action      = (body.get("action") or "").strip()
            entity_type = body.get("entity_type") or None
            entity_id   = str(body.get("entity_id")) if body.get("entity_id") else None
            details     = body.get("details") or None

            if not action:
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Поле action обязательно."})}

            with conn.cursor() as cur:
                cur.execute(
                    f"""INSERT INTO {SCHEMA}.event_log (user_id, action, entity_type, entity_id, details)
                        VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at""",
                    (user_id, action, entity_type, entity_id, details)
                )
                row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"id": row[0], "created_at": str(row[1])})}

        # ── GET / — получить события ─────────────────────────────────
        if method == "GET":
            limit = min(int(event.get("queryStringParameters", {}).get("limit", 50)), 200)
            with conn.cursor() as cur:
                cur.execute(
                    f"""SELECT id, action, entity_type, entity_id, details, created_at
                        FROM {SCHEMA}.event_log
                        WHERE user_id = %s
                        ORDER BY created_at DESC
                        LIMIT %s""",
                    (user_id, limit)
                )
                rows = cur.fetchall()
            events = [
                {"id": r[0], "action": r[1], "entity_type": r[2],
                 "entity_id": r[3], "details": r[4], "created_at": str(r[5])}
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"events": events})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}

    finally:
        conn.close()
