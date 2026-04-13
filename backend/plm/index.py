"""
PLM API — управление жизненным циклом изделий SmartMach.
Маршрутизация через query: ?resource=products|users|versions|events|stats
Для конкретной записи: ?resource=products&id=5
Для версий/событий: ?resource=versions&product_id=5
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


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """PLM: управление изделиями, версиями и историей изменений через query-параметры."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    resource = qs.get("resource", "")
    rec_id = qs.get("id")
    product_id = qs.get("product_id")

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    conn = db()
    cur = conn.cursor()

    try:
        # GET ?resource=users
        if method == "GET" and resource == "users":
            cur.execute("SELECT id, name, email, role, avatar_url, created_at FROM users ORDER BY name")
            return ok(list(cur.fetchall()))

        # GET ?resource=products
        if method == "GET" and resource == "products" and not rec_id:
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
            rows = list(cur.fetchall())
            for r in rows:
                r["stage_label"] = STAGE_LABELS.get(r["stage"], r["stage"])
            return ok(rows)

        # GET ?resource=products&id=5
        if method == "GET" and resource == "products" and rec_id:
            cur.execute("""
                SELECT p.*, u.name AS owner_name, u.role AS owner_role
                FROM products p LEFT JOIN users u ON u.id = p.owner_id
                WHERE p.id = %s
            """, (int(rec_id),))
            row = cur.fetchone()
            if not row:
                return err("Изделие не найдено", 404)
            row["stage_label"] = STAGE_LABELS.get(row["stage"], row["stage"])
            return ok(dict(row))

        # POST ?resource=products
        if method == "POST" and resource == "products":
            cur.execute("""
                INSERT INTO products (code, name, description, stage, owner_id)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (body["code"], body["name"], body.get("description"), body.get("stage", "draft"), body.get("owner_id")))
            pid = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO product_events (product_id, actor_id, event_type, new_stage, comment)
                VALUES (%s, %s, 'created', %s, %s)
            """, (pid, body.get("owner_id"), body.get("stage", "draft"), "Изделие создано"))
            conn.commit()
            return ok({"id": pid}, 201)

        # PUT ?resource=products&id=5
        if method == "PUT" and resource == "products" and rec_id:
            pid = int(rec_id)
            cur.execute("SELECT stage FROM products WHERE id = %s", (pid,))
            old = cur.fetchone()
            if not old:
                return err("Изделие не найдено", 404)
            fields, vals = [], []
            for f in ("name", "description", "stage", "owner_id"):
                if f in body:
                    fields.append(f"{f} = %s")
                    vals.append(body[f])
            fields.append("updated_at = NOW()")
            vals.append(pid)
            cur.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = %s", vals)
            if "stage" in body and body["stage"] != old["stage"]:
                cur.execute("""
                    INSERT INTO product_events (product_id, actor_id, event_type, old_stage, new_stage, comment)
                    VALUES (%s, %s, 'stage_change', %s, %s, %s)
                """, (pid, body.get("actor_id"), old["stage"], body["stage"], body.get("comment", "")))
            conn.commit()
            return ok({"ok": True})

        # GET ?resource=versions&product_id=5
        if method == "GET" and resource == "versions" and product_id:
            cur.execute("""
                SELECT v.id, v.revision, v.notes, v.created_at, u.name AS author_name
                FROM product_versions v LEFT JOIN users u ON u.id = v.author_id
                WHERE v.product_id = %s ORDER BY v.created_at DESC
            """, (int(product_id),))
            return ok(list(cur.fetchall()))

        # POST ?resource=versions&product_id=5
        if method == "POST" and resource == "versions" and product_id:
            pid = int(product_id)
            cur.execute("""
                INSERT INTO product_versions (product_id, revision, notes, author_id)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (pid, body["revision"], body.get("notes"), body.get("author_id")))
            vid = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO product_events (product_id, actor_id, event_type, comment)
                VALUES (%s, %s, 'new_version', %s)
            """, (pid, body.get("author_id"), f"Добавлена версия {body['revision']}"))
            cur.execute("UPDATE products SET updated_at = NOW() WHERE id = %s", (pid,))
            conn.commit()
            return ok({"id": vid}, 201)

        # GET ?resource=events&product_id=5
        if method == "GET" and resource == "events" and product_id:
            cur.execute("""
                SELECT e.id, e.event_type, e.old_stage, e.new_stage, e.comment, e.created_at,
                       u.name AS actor_name
                FROM product_events e LEFT JOIN users u ON u.id = e.actor_id
                WHERE e.product_id = %s ORDER BY e.created_at DESC
            """, (int(product_id),))
            rows = list(cur.fetchall())
            for r in rows:
                if r["old_stage"]:
                    r["old_stage_label"] = STAGE_LABELS.get(r["old_stage"], r["old_stage"])
                if r["new_stage"]:
                    r["new_stage_label"] = STAGE_LABELS.get(r["new_stage"], r["new_stage"])
            return ok(rows)

        # GET ?resource=stats
        if method == "GET" and resource == "stats":
            cur.execute("SELECT stage, COUNT(*) AS cnt FROM products GROUP BY stage")
            rows = cur.fetchall()
            stats = {r["stage"]: r["cnt"] for r in rows}
            cur.execute("SELECT COUNT(*) AS cnt FROM products")
            total = cur.fetchone()["cnt"]
            cur.execute("SELECT COUNT(*) AS cnt FROM product_versions")
            versions = cur.fetchone()["cnt"]
            return ok({"by_stage": stats, "total": total, "total_versions": versions})

        return err("Маршрут не найден", 404)

    finally:
        cur.close()
        conn.close()
