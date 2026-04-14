"""
Аутентификация пользователей: регистрация, вход, выход, получение профиля.
POST /register — регистрация (name, email, password, role)
POST /login    — вход (email, password)
POST /logout   — выход (session_id в заголовке X-Session-Id)
GET  /me       — текущий пользователь (session_id в заголовке X-Session-Id)
"""
import os, json, hashlib, secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p45794133_smartmach_platform_p")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()

def make_session(conn, user_id: int) -> str:
    sid = secrets.token_hex(32)
    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)",
            (sid, user_id)
        )
    conn.commit()
    return sid

def get_user_by_session(conn, sid: str):
    with conn.cursor() as cur:
        cur.execute(
            f"""SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at
                FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.id = %s AND s.expires_at > now() AND u.is_active = true""",
            (sid,)
        )
        row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3],
            "avatar_url": row[4], "created_at": str(row[5])}

def handler(event: dict, context) -> dict:
    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    try:
        # ── POST /register ──────────────────────────────────────────
        if method == "POST" and path.endswith("/register"):
            body = json.loads(event.get("body") or "{}")
            name     = (body.get("name") or "").strip()
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""
            role     = body.get("role") or "engineer"

            if not name or not email or len(password) < 6:
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Заполните все поля. Пароль минимум 6 символов."})}
            if role not in ("admin", "engineer", "technologist"):
                role = "engineer"

            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE email = %s", (email,))
                if cur.fetchone():
                    return {"statusCode": 409, "headers": CORS,
                            "body": json.dumps({"error": "Email уже зарегистрирован."})}
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (name, email, role, password_hash) VALUES (%s,%s,%s,%s) RETURNING id",
                    (name, email, role, hash_password(password))
                )
                user_id = cur.fetchone()[0]
            conn.commit()

            sid = make_session(conn, user_id)
            user = get_user_by_session(conn, sid)
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"session_id": sid, "user": user})}

        # ── POST /login ─────────────────────────────────────────────
        if method == "POST" and path.endswith("/login"):
            body = json.loads(event.get("body") or "{}")
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT id FROM {SCHEMA}.users WHERE email = %s AND password_hash = %s AND is_active = true",
                    (email, hash_password(password))
                )
                row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": CORS,
                        "body": json.dumps({"error": "Неверный email или пароль."})}

            sid = make_session(conn, row[0])
            user = get_user_by_session(conn, sid)
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"session_id": sid, "user": user})}

        # ── POST /logout ────────────────────────────────────────────
        if method == "POST" and path.endswith("/logout"):
            sid = event.get("headers", {}).get("X-Session-Id") or ""
            if sid:
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = now() WHERE id = %s", (sid,))
                conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET /me ─────────────────────────────────────────────────
        if method == "GET" and path.endswith("/me"):
            sid = event.get("headers", {}).get("X-Session-Id") or ""
            user = get_user_by_session(conn, sid) if sid else None
            if not user:
                return {"statusCode": 401, "headers": CORS,
                        "body": json.dumps({"error": "Не авторизован."})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}

    finally:
        conn.close()
