"""
PLM Products API — CRUD изделий, версий, событий и статистики SmartMach.
Все данные изолированы по предприятию (company_id из сессии).
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Session-Id",
}

S = "t_p45794133_smartmach_platform_p"

STAGE_LABELS = {
    "draft": "Черновик", "development": "Разработка", "review": "Согласование",
    "approved": "Утверждено", "production": "Производство", "archive": "Архив",
}


def get_db():
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
    """PLM Products: изделия, версии, события с изоляцией по предприятию."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "list")
    pid = qs.get("id")
    sid = event.get("headers", {}).get("X-Session-Id") or ""

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_db()
    cur = conn.cursor()

    try:
        company_id = get_company_id(cur, sid)
        if not company_id:
            return err("Не авторизован или не выбрано предприятие.", 401)

        if action == "stats":
            cur.execute(f"SELECT stage, COUNT(*) AS cnt FROM {S}.products WHERE company_id = %s GROUP BY stage", (company_id,))
            by_stage = {r["stage"]: int(r["cnt"]) for r in cur.fetchall()}
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.products WHERE company_id = %s", (company_id,))
            total = int(cur.fetchone()["cnt"])
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.product_versions WHERE company_id = %s", (company_id,))
            versions = int(cur.fetchone()["cnt"])
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.users WHERE company_id = %s", (company_id,))
            users = int(cur.fetchone()["cnt"])
            return ok({"by_stage": by_stage, "total": total, "total_versions": versions, "total_users": users})

        if action == "list" and method == "GET":
            cur.execute(f"""
                SELECT p.id, p.code, p.name, p.description, p.stage,
                       p.created_at, p.updated_at,
                       u.name AS owner_name, u.role AS owner_role,
                       (SELECT COUNT(*) FROM {S}.product_versions v WHERE v.product_id = p.id) AS version_count,
                       (SELECT revision FROM {S}.product_versions v WHERE v.product_id = p.id ORDER BY v.created_at DESC LIMIT 1) AS latest_revision
                FROM {S}.products p
                LEFT JOIN {S}.users u ON u.id = p.owner_id
                WHERE p.company_id = %s
                ORDER BY p.updated_at DESC
            """, (company_id,))
            rows = list(cur.fetchall())
            for r in rows:
                r["stage_label"] = STAGE_LABELS.get(r["stage"], r["stage"])
                r["version_count"] = int(r["version_count"])
            return ok(rows)

        if action == "create" and method == "POST":
            cur.execute(f"""
                INSERT INTO {S}.products (code, name, description, stage, owner_id, company_id)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
            """, (body["code"], body["name"], body.get("description"), body.get("stage", "draft"), body.get("owner_id"), company_id))
            new_id = cur.fetchone()["id"]
            cur.execute(f"""
                INSERT INTO {S}.product_events (product_id, actor_id, event_type, new_stage, comment, company_id)
                VALUES (%s,%s,'created',%s,'Изделие создано',%s)
            """, (new_id, body.get("owner_id"), body.get("stage", "draft"), company_id))
            conn.commit()
            return ok({"id": new_id}, 201)

        if action == "get" and pid:
            cur.execute(f"""
                SELECT p.*, u.name AS owner_name, u.role AS owner_role
                FROM {S}.products p LEFT JOIN {S}.users u ON u.id = p.owner_id
                WHERE p.id = %s AND p.company_id = %s
            """, (int(pid), company_id))
            row = cur.fetchone()
            if not row:
                return err("Изделие не найдено", 404)
            row = dict(row)
            row["stage_label"] = STAGE_LABELS.get(row["stage"], row["stage"])
            return ok(row)

        if action == "update" and method in ("POST", "PUT") and pid:
            cur.execute(f"SELECT stage FROM {S}.products WHERE id = %s AND company_id = %s", (int(pid), company_id))
            old = cur.fetchone()
            if not old:
                return err("Изделие не найдено", 404)
            fields, vals = [], []
            for f in ("name", "description", "stage", "owner_id"):
                if f in body:
                    fields.append(f"{f} = %s")
                    vals.append(body[f])
            fields.append("updated_at = NOW()")
            vals += [int(pid), company_id]
            cur.execute(f"UPDATE {S}.products SET {', '.join(fields)} WHERE id = %s AND company_id = %s", vals)
            if "stage" in body and body["stage"] != old["stage"]:
                cur.execute(f"""
                    INSERT INTO {S}.product_events (product_id, actor_id, event_type, old_stage, new_stage, comment, company_id)
                    VALUES (%s,%s,'stage_change',%s,%s,%s,%s)
                """, (int(pid), body.get("actor_id"), old["stage"], body["stage"], body.get("comment", ""), company_id))
            conn.commit()
            return ok({"ok": True})

        if action == "versions" and pid:
            cur.execute(f"""
                SELECT v.id, v.revision, v.notes, v.created_at, u.name AS author_name
                FROM {S}.product_versions v LEFT JOIN {S}.users u ON u.id = v.author_id
                WHERE v.product_id = %s AND v.company_id = %s ORDER BY v.created_at DESC
            """, (int(pid), company_id))
            return ok(list(cur.fetchall()))

        if action == "add_version" and method == "POST" and pid:
            cur.execute(f"""
                INSERT INTO {S}.product_versions (product_id, revision, notes, author_id, company_id)
                VALUES (%s,%s,%s,%s,%s) RETURNING id
            """, (int(pid), body["revision"], body.get("notes"), body.get("author_id"), company_id))
            vid = cur.fetchone()["id"]
            cur.execute(f"""
                INSERT INTO {S}.product_events (product_id, actor_id, event_type, comment, company_id)
                VALUES (%s,%s,'new_version',%s,%s)
            """, (int(pid), body.get("author_id"), f"Добавлена версия {body['revision']}", company_id))
            cur.execute(f"UPDATE {S}.products SET updated_at = NOW() WHERE id = %s AND company_id = %s", (int(pid), company_id))
            conn.commit()
            return ok({"id": vid}, 201)

        if action == "events" and pid:
            cur.execute(f"""
                SELECT e.id, e.event_type, e.old_stage, e.new_stage, e.comment, e.created_at,
                       u.name AS actor_name
                FROM {S}.product_events e LEFT JOIN {S}.users u ON u.id = e.actor_id
                WHERE e.product_id = %s AND e.company_id = %s ORDER BY e.created_at DESC
            """, (int(pid), company_id))
            rows = list(cur.fetchall())
            for r in rows:
                if r["old_stage"]:
                    r["old_stage_label"] = STAGE_LABELS.get(r["old_stage"], r["old_stage"])
                if r["new_stage"]:
                    r["new_stage_label"] = STAGE_LABELS.get(r["new_stage"], r["new_stage"])
            return ok(rows)

        return err("Неизвестный action", 400)

    finally:
        cur.close()
        conn.close()
