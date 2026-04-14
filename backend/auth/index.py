"""
Auth API v2 — аутентификация пользователей с поддержкой мультитенантности.
POST /register  — регистрация (name, email, password, role, company_name?)
POST /login     — вход (email, password)
POST /logout    — выход
GET  /me        — текущий пользователь + предприятие
POST /company   — создать новое предприятие (admin)
GET  /companies — список предприятий пользователя
"""
import os, json, hashlib, secrets, re
import psycopg2
import bcrypt

S = "t_p45794133_smartmach_platform_p"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def hash_password(pwd):
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

def verify_password(pwd, stored):
    if stored.startswith("$2b$") or stored.startswith("$2a$"):
        return bcrypt.checkpw(pwd.encode(), stored.encode())
    return hashlib.sha256(pwd.encode()).hexdigest() == stored

def make_session(conn, user_id, company_id):
    sid = secrets.token_hex(32)
    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {S}.sessions (id, user_id, company_id) VALUES (%s, %s, %s)",
            (sid, user_id, company_id)
        )
    conn.commit()
    return sid

def get_user_by_session(conn, sid):
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at,
                   u.company_id, c.name AS company_name, c.plan AS company_plan
            FROM {S}.sessions s
            JOIN {S}.users u ON u.id = s.user_id
            LEFT JOIN {S}.companies c ON c.id = u.company_id
            WHERE s.id = %s AND s.expires_at > now() AND u.is_active = true
        """, (sid,))
        row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0], "name": row[1], "email": row[2], "role": row[3],
        "avatar_url": row[4], "created_at": str(row[5]),
        "company_id": row[6], "company_name": row[7], "company_plan": row[8],
    }

def get_or_create_company(conn, name):
    slug = re.sub(r"[^a-z0-9]", "-", name.lower())[:40]
    with conn.cursor() as cur:
        cur.execute(f"SELECT id FROM {S}.companies WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if row:
            return row[0]
        cur.execute(
            f"INSERT INTO {S}.companies (name, slug, plan) VALUES (%s, %s, 'start') RETURNING id",
            (name, slug)
        )
        cid = cur.fetchone()[0]
    conn.commit()
    return cid

def handler(event: dict, context) -> dict:
    """Auth: регистрация, вход, выход, профиль с поддержкой мультитенантности предприятий."""
    method = event.get("httpMethod", "GET")
    qs     = event.get("queryStringParameters") or {}
    path   = event.get("path", "/")
    # Поддерживаем оба варианта: ?action=register и /register
    action = qs.get("action") or path.rstrip("/").split("/")[-1] or "me"

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    try:
        # ── POST register ────────────────────────────────────────────
        if method == "POST" and action == "register":
            body     = json.loads(event.get("body") or "{}")
            name     = (body.get("name") or "").strip()
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""
            role     = body.get("role") or "engineer"
            company_name = (body.get("company_name") or "").strip()

            if not name or not email or len(password) < 6:
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Заполните все поля. Пароль минимум 6 символов."})}
            if not EMAIL_RE.match(email):
                return {"statusCode": 400, "headers": CORS,
                        "body": json.dumps({"error": "Некорректный email."})}
            if role not in ("admin", "engineer", "technologist"):
                role = "engineer"

            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {S}.users WHERE email = %s", (email,))
                if cur.fetchone():
                    return {"statusCode": 409, "headers": CORS,
                            "body": json.dumps({"error": "Email уже зарегистрирован."})}

            # Создаём/находим предприятие
            if company_name:
                company_id = get_or_create_company(conn, company_name)
            else:
                # Присваиваем demo-компанию если не указали
                with conn.cursor() as cur:
                    cur.execute(f"SELECT id FROM {S}.companies WHERE slug = 'demo' LIMIT 1")
                    row = cur.fetchone()
                    company_id = row[0] if row else None

            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {S}.users (name, email, role, password_hash, company_id) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                    (name, email, role, hash_password(password), company_id)
                )
                user_id = cur.fetchone()[0]
            conn.commit()

            sid  = make_session(conn, user_id, company_id)
            user = get_user_by_session(conn, sid)
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"session_id": sid, "user": user})}

        # ── POST login ───────────────────────────────────────────────
        if method == "POST" and action == "login":
            body     = json.loads(event.get("body") or "{}")
            email    = (body.get("email") or "").strip().lower()
            password = body.get("password") or ""

            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT id, password_hash, company_id FROM {S}.users WHERE email = %s AND is_active = true",
                    (email,)
                )
                row = cur.fetchone()

            if not row or not verify_password(password, row[1]):
                return {"statusCode": 401, "headers": CORS,
                        "body": json.dumps({"error": "Неверный email или пароль."})}

            user_id, stored_hash, company_id = row[0], row[1], row[2]

            if not (stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$")):
                new_hash = hash_password(password)
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE {S}.users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
                conn.commit()

            sid  = make_session(conn, user_id, company_id)
            user = get_user_by_session(conn, sid)
            return {"statusCode": 200, "headers": CORS,
                    "body": json.dumps({"session_id": sid, "user": user})}

        # ── POST logout ──────────────────────────────────────────────
        if method == "POST" and action == "logout":
            sid = event.get("headers", {}).get("X-Session-Id") or ""
            if sid:
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE {S}.sessions SET expires_at = now() WHERE id = %s", (sid,))
                conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── GET me ───────────────────────────────────────────────────
        if method == "GET" and action in ("me", ""):
            sid  = event.get("headers", {}).get("X-Session-Id") or ""
            user = get_user_by_session(conn, sid) if sid else None
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован."})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"user": user})}

        # ── POST company ─────────────────────────────────────────────
        if method == "POST" and action == "company":
            sid  = event.get("headers", {}).get("X-Session-Id") or ""
            user = get_user_by_session(conn, sid) if sid else None
            if not user:
                return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован."})}
            body = json.loads(event.get("body") or "{}")
            cname = (body.get("name") or "").strip()
            if not cname:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Укажите название предприятия."})}
            company_id = get_or_create_company(conn, cname)
            with conn.cursor() as cur:
                cur.execute(f"UPDATE {S}.users SET company_id = %s WHERE id = %s", (company_id, user["id"]))
            conn.commit()
            user = get_user_by_session(conn, sid)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"company_id": company_id, "user": user})}

        return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}

    except Exception as e:
        import traceback
        print("AUTH ERROR:", traceback.format_exc())
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": f"Внутренняя ошибка: {str(e)}"})}
    finally:
        conn.close()