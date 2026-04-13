"""
PLM Products API — CRUD изделий, версий, событий и статистики SmartMach.
Маршрутизация через query-параметр: ?action=list|get|create|update|versions|add_version|events|stats
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}

STAGE_LABELS = {
    "draft": "Черновик",
    "development": "Разработка",
    "review": "Согласование",
    "approved": "Утверждено",
    "production": "Производство",
    "archive": "Архив",
}


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def serial(obj):
    if isinstance(obj, list):
        return [serial(i) for i in obj]
    if isinstance(obj, dict):
        return {k: str(v) if hasattr(v, 'isoformat') else v for k, v in obj.items()}
    return obj


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": serial(data)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": {"error": msg}}


def handler(event: dict, context) -> dict:
    """PLM Products: список изделий, версии, события, статистика."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "list")
    pid = qs.get("id")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = get_db()
    cur = conn.cursor()

    try:
        # --- Статистика ---
        if action == "stats":
            cur.execute("SELECT stage, COUNT(*) AS cnt FROM products GROUP BY stage")
            rows = cur.fetchall()
            by_stage = {r["stage"]: int(r["cnt"]) for r in rows}
            cur.execute("SELECT COUNT(*) AS cnt FROM products")
            total = int(cur.fetchone()["cnt"])
            cur.execute("SELECT COUNT(*) AS cnt FROM product_versions")
            versions = int(cur.fetchone()["cnt"])
            cur.execute("SELECT COUNT(*) AS cnt FROM users")
            users = int(cur.fetchone()["cnt"])
            return ok({"by_stage": by_stage, "total": total, "total_versions": versions, "total_users": users})

        # --- Список изделий ---
        if action == "list" and method == "GET":
            cur.execute("""
                SELECT p.id, p.code, p.name, p.description, p.stage,
                       p.created_at, p.updated_at,
                       u.name AS owner_name, u.role AS owner_role,
                       (SELECT COUNT(*) FROM product_versions v WHERE v.product_id = p.id) AS version_count,
                       (SELECT revision FROM product_versions v WHERE v.product_id = p.id ORDER BY v.created_at DESC LIMIT 1) AS latest_revision
                FROM products p
                LEFT JOIN users u ON u.id = p.owner_id
                ORDER BY p.updated_at DESC
            """)
            rows = cur.fetchall()
            for r in rows:
                r["stage_label"] = STAGE_LABELS.get(r["stage"], r["stage"])
                r["version_count"] = int(r["version_count"])
            return ok(rows)

        # --- Создать изделие ---
        if action == "create" and method == "POST":
            cur.execute("""
                INSERT INTO products (code, name, description, stage, owner_id)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (body["code"], body["name"], body.get("description"), body.get("stage", "draft"), body.get("owner_id")))
            new_id = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO product_events (product_id, actor_id, event_type, new_stage, comment)
                VALUES (%s, %s, 'created', %s, 'Изделие создано')
            """, (new_id, body.get("owner_id"), body.get("stage", "draft")))
            conn.commit()
            return ok({"id": new_id}, 201)

        # --- Получить изделие ---
        if action == "get" and pid:
            cur.execute("""
                SELECT p.*, u.name AS owner_name, u.role AS owner_role
                FROM products p LEFT JOIN users u ON u.id = p.owner_id
                WHERE p.id = %s
            """, (int(pid),))
            row = cur.fetchone()
            if not row:
                return err("Изделие не найдено", 404)
            row["stage_label"] = STAGE_LABELS.get(row["stage"], row["stage"])
            return ok(row)

        # --- Обновить изделие ---
        if action == "update" and method in ("POST", "PUT") and pid:
            cur.execute("SELECT stage FROM products WHERE id = %s", (int(pid),))
            old = cur.fetchone()
            if not old:
                return err("Изделие не найдено", 404)
            fields, vals = [], []
            for f in ("name", "description", "stage", "owner_id"):
                if f in body:
                    fields.append(f"{f} = %s")
                    vals.append(body[f])
            fields.append("updated_at = NOW()")
            vals.append(int(pid))
            cur.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = %s", vals)
            if "stage" in body and body["stage"] != old["stage"]:
                cur.execute("""
                    INSERT INTO product_events (product_id, actor_id, event_type, old_stage, new_stage, comment)
                    VALUES (%s, %s, 'stage_change', %s, %s, %s)
                """, (int(pid), body.get("actor_id"), old["stage"], body["stage"], body.get("comment", "")))
            conn.commit()
            return ok({"ok": True})

        # --- Версии изделия ---
        if action == "versions" and pid:
            cur.execute("""
                SELECT v.id, v.revision, v.notes, v.created_at, u.name AS author_name
                FROM product_versions v LEFT JOIN users u ON u.id = v.author_id
                WHERE v.product_id = %s ORDER BY v.created_at DESC
            """, (int(pid),))
            return ok(cur.fetchall())

        # --- Добавить версию ---
        if action == "add_version" and method == "POST" and pid:
            cur.execute("""
                INSERT INTO product_versions (product_id, revision, notes, author_id)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (int(pid), body["revision"], body.get("notes"), body.get("author_id")))
            vid = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO product_events (product_id, actor_id, event_type, comment)
                VALUES (%s, %s, 'new_version', %s)
            """, (int(pid), body.get("author_id"), f"Добавлена версия {body['revision']}"))
            cur.execute("UPDATE products SET updated_at = NOW() WHERE id = %s", (int(pid),))
            conn.commit()
            return ok({"id": vid}, 201)

        # --- История событий ---
        if action == "events" and pid:
            cur.execute("""
                SELECT e.id, e.event_type, e.old_stage, e.new_stage, e.comment, e.created_at,
                       u.name AS actor_name
                FROM product_events e LEFT JOIN users u ON u.id = e.actor_id
                WHERE e.product_id = %s ORDER BY e.created_at DESC
            """, (int(pid),))
            rows = cur.fetchall()
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