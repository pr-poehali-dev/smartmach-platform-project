"""
Company Management API — управление предприятием.
GET  ?action=info          — данные предприятия + участники
POST ?action=rename        — сменить название {name}
POST ?action=invite        — создать инвайт {email?, role}
GET  ?action=invites       — список активных инвайтов
POST ?action=revoke&id=N   — отозвать инвайт
GET  ?action=join&token=X  — информация об инвайте (публичный)
POST ?action=join           — принять инвайт {token, name, password} (публичный)
POST ?action=kick&id=N     — удалить участника из предприятия (admin)
"""
import os, json, secrets, re
import psycopg2
from psycopg2.extras import RealDictCursor

S = "t_p45794133_smartmach_platform_p"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_session(cur, sid):
    if not sid:
        return None
    cur.execute(
        f"""SELECT u.id, u.name, u.email, u.role, u.company_id
            FROM {S}.sessions s JOIN {S}.users u ON u.id = s.user_id
            WHERE s.id = %s AND s.expires_at > now() AND u.is_active = true LIMIT 1""",
        (sid,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """Company Manage: управление предприятием — название, участники, приглашения."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "info")
    sid = event.get("headers", {}).get("X-Session-Id") or ""

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    conn = db()
    cur = conn.cursor()

    try:
        # ── Публичные эндпоинты (без авторизации) ───────────────────

        # GET ?action=join&token=X — инфо об инвайте
        if method == "GET" and action == "join":
            token = qs.get("token", "")
            cur.execute(f"""
                SELECT i.id, i.email, i.role, i.expires_at,
                       c.name AS company_name, c.plan
                FROM {S}.invites i
                JOIN {S}.companies c ON c.id = i.company_id
                WHERE i.token = %s AND i.used_at IS NULL AND i.expires_at > now()
            """, (token,))
            row = cur.fetchone()
            if not row:
                return err("Ссылка недействительна или истекла.", 404)
            return ok(dict(row))

        # POST ?action=join — принять инвайт (регистрация через ссылку)
        if method == "POST" and action == "join":
            token   = body.get("token", "")
            name    = (body.get("name") or "").strip()
            password = body.get("password") or ""

            if not token or not name or len(password) < 6:
                return err("Заполните все поля. Пароль минимум 6 символов.")

            cur.execute(f"""
                SELECT i.id, i.email, i.role, i.company_id, i.expires_at
                FROM {S}.invites i
                WHERE i.token = %s AND i.used_at IS NULL AND i.expires_at > now()
            """, (token,))
            invite = cur.fetchone()
            if not invite:
                return err("Ссылка недействительна или истекла.", 404)

            import bcrypt, hashlib
            pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

            email = invite["email"] or body.get("email", "")
            if not email:
                return err("Укажите email.")

            cur.execute(f"SELECT id FROM {S}.users WHERE email = %s", (email,))
            if cur.fetchone():
                return err("Пользователь с таким email уже зарегистрирован.")

            cur.execute(f"""
                INSERT INTO {S}.users (name, email, role, password_hash, company_id)
                VALUES (%s,%s,%s,%s,%s) RETURNING id
            """, (name, email, invite["role"], pw_hash, invite["company_id"]))
            user_id = cur.fetchone()["id"]

            cur.execute(f"""
                UPDATE {S}.invites SET used_by = %s, used_at = now() WHERE id = %s
            """, (user_id, invite["id"]))

            sid_new = secrets.token_hex(32)
            cur.execute(f"""
                INSERT INTO {S}.sessions (id, user_id, company_id) VALUES (%s,%s,%s)
            """, (sid_new, user_id, invite["company_id"]))
            conn.commit()

            cur.execute(f"""
                SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at,
                       u.company_id, c.name AS company_name, c.plan AS company_plan
                FROM {S}.users u LEFT JOIN {S}.companies c ON c.id = u.company_id
                WHERE u.id = %s
            """, (user_id,))
            user = dict(cur.fetchone())
            return ok({"session_id": sid_new, "user": user}, 201)

        # ── Защищённые эндпоинты ─────────────────────────────────────
        me = get_session(cur, sid)
        if not me:
            return err("Не авторизован.", 401)

        company_id = me["company_id"]
        if not company_id:
            return err("Вы не привязаны к предприятию.", 403)

        # GET ?action=info
        if method == "GET" and action == "info":
            cur.execute(f"SELECT id, name, slug, plan, created_at FROM {S}.companies WHERE id = %s", (company_id,))
            company = dict(cur.fetchone())

            cur.execute(f"""
                SELECT id, name, email, role, avatar_url, created_at
                FROM {S}.users WHERE company_id = %s AND is_active = true ORDER BY name
            """, (company_id,))
            members = list(cur.fetchall())

            return ok({"company": company, "members": members, "me": dict(me)})

        # GET ?action=invites
        if method == "GET" and action == "invites":
            cur.execute(f"""
                SELECT i.id, i.email, i.role, i.expires_at, i.created_at, i.token,
                       u.name AS created_by_name, i.used_at
                FROM {S}.invites i
                LEFT JOIN {S}.users u ON u.id = i.created_by
                WHERE i.company_id = %s AND i.expires_at > now() AND i.used_at IS NULL
                ORDER BY i.created_at DESC
            """, (company_id,))
            return ok(list(cur.fetchall()))

        # POST ?action=rename
        if method == "POST" and action == "rename":
            if me["role"] != "admin":
                return err("Только администратор может менять название.", 403)
            new_name = (body.get("name") or "").strip()
            if not new_name or len(new_name) < 2:
                return err("Название должно содержать минимум 2 символа.")
            cur.execute(f"UPDATE {S}.companies SET name = %s WHERE id = %s", (new_name, company_id))
            conn.commit()
            return ok({"ok": True, "name": new_name})

        # POST ?action=invite
        if method == "POST" and action == "invite":
            if me["role"] != "admin":
                return err("Только администратор может приглашать участников.", 403)
            email = (body.get("email") or "").strip().lower() or None
            role  = body.get("role", "engineer")
            if role not in ("admin", "engineer", "technologist"):
                role = "engineer"

            token = secrets.token_urlsafe(32)
            cur.execute(f"""
                INSERT INTO {S}.invites (company_id, token, email, role, created_by)
                VALUES (%s,%s,%s,%s,%s) RETURNING id, token, expires_at
            """, (company_id, token, email, role, me["id"]))
            row = dict(cur.fetchone())
            conn.commit()

            base_url = os.environ.get("APP_URL", "https://preview--smartmach-platform-project.poehali.dev")
            invite_url = f"{base_url}/invite/{row['token']}"
            return ok({"id": row["id"], "token": row["token"], "invite_url": invite_url, "expires_at": str(row["expires_at"])}, 201)

        # POST ?action=revoke&id=N
        if method == "POST" and action == "revoke":
            if me["role"] != "admin":
                return err("Только администратор может отзывать инвайты.", 403)
            invite_id = qs.get("id")
            if not invite_id:
                return err("Укажите id инвайта.")
            cur.execute(f"""
                UPDATE {S}.invites SET expires_at = now()
                WHERE id = %s AND company_id = %s
            """, (int(invite_id), company_id))
            conn.commit()
            return ok({"ok": True})

        # POST ?action=kick&id=N
        if method == "POST" and action == "kick":
            if me["role"] != "admin":
                return err("Только администратор может удалять участников.", 403)
            user_id = qs.get("id")
            if not user_id:
                return err("Укажите id пользователя.")
            if int(user_id) == me["id"]:
                return err("Нельзя удалить себя.")
            cur.execute(f"""
                UPDATE {S}.users SET company_id = NULL WHERE id = %s AND company_id = %s
            """, (int(user_id), company_id))
            conn.commit()
            return ok({"ok": True})

        return err("Неизвестный action.", 404)

    finally:
        cur.close()
        conn.close()
