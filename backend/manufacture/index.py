"""
Manufacture API v2 — полный производственный цикл SmartMach.
Маршрутизация: ?resource=parts|machines|programs|simulations|jobs|stats|users
Для операций с конкретной записью: ?resource=parts&id=5
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

S = "t_p45794133_smartmach_platform_p"


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Manufacture: полный производственный цикл — детали, станки, программы ЧПУ, расчёты, задания."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    resource = qs.get("resource", "")
    rid = qs.get("id")
    if rid and str(rid).isdigit():
        rid = int(rid)
    else:
        rid = None

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    conn = db()
    cur = conn.cursor()

    try:
        # ─── USERS ───────────────────────────────────────────────────────────
        if resource == "users":
            cur.execute(f"SELECT id, name, email, role FROM {S}.users ORDER BY name")
            return ok(list(cur.fetchall()))

        # ─── STATS ───────────────────────────────────────────────────────────
        if resource == "stats":
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.parts")
            parts_total = cur.fetchone()["cnt"]
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.machines")
            machines_total = cur.fetchone()["cnt"]
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.machines WHERE status = 'running'")
            machines_running = cur.fetchone()["cnt"]
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.cnc_programs WHERE status = 'running'")
            programs_running = cur.fetchone()["cnt"]
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.jobs WHERE status != 'done'")
            jobs_active = cur.fetchone()["cnt"]
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.jobs WHERE status = 'done'")
            jobs_done = cur.fetchone()["cnt"]
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.simulations WHERE status = 'error'")
            sims_error = cur.fetchone()["cnt"]
            cur.execute(f"SELECT COUNT(*) AS cnt FROM {S}.products")
            products_total = cur.fetchone()["cnt"]
            return ok({
                "parts_total": parts_total,
                "machines_total": machines_total,
                "machines_running": machines_running,
                "programs_running": programs_running,
                "jobs_active": jobs_active,
                "jobs_done": jobs_done,
                "sims_error": sims_error,
                "products_total": products_total,
            })

        # ─── PARTS (CAD) ─────────────────────────────────────────────────────
        if resource == "parts":
            if method == "GET":
                only_templates = qs.get("templates") == "1"
                only_mine = qs.get("templates") == "0"
                where = ""
                if only_templates:
                    where = "WHERE p.is_template = TRUE"
                elif only_mine:
                    where = "WHERE p.is_template = FALSE"
                cur.execute(f"""
                    SELECT p.id, p.code, p.name, p.material, p.version, p.status,
                           p.collisions, p.notes, p.category, p.is_template,
                           p.dimensions, p.weight_kg, p.standard,
                           p.created_at, p.updated_at,
                           u.name AS author_name,
                           pr.name AS product_name, pr.code AS product_code
                    FROM {S}.parts p
                    LEFT JOIN {S}.users u ON u.id = p.author_id
                    LEFT JOIN {S}.products pr ON pr.id = p.product_id
                    {where}
                    ORDER BY p.category, p.name
                """)
                return ok(list(cur.fetchall()))

            if method == "POST":
                cur.execute(f"""
                    INSERT INTO {S}.parts (product_id, code, name, material, version, status, collisions,
                                           author_id, notes, category, is_template, dimensions, weight_kg, standard)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
                """, (
                    body.get("product_id"), body["code"], body["name"],
                    body.get("material"), body.get("version", "v1.0"),
                    body.get("status", "ok"), body.get("collisions", 0),
                    body.get("author_id"), body.get("notes"),
                    body.get("category", "Прочее"), body.get("is_template", False),
                    body.get("dimensions"), body.get("weight_kg"), body.get("standard"),
                ))
                new_id = cur.fetchone()["id"]
                conn.commit()
                return ok({"id": new_id}, 201)

            if method == "PUT" and rid:
                fields, vals = [], []
                for f in ("code", "name", "material", "version", "status", "collisions", "notes",
                          "product_id", "category", "dimensions", "weight_kg", "standard"):
                    if f in body:
                        fields.append(f"{f} = %s")
                        vals.append(body[f])
                fields.append("updated_at = NOW()")
                vals.append(rid)
                cur.execute(f"UPDATE {S}.parts SET {', '.join(fields)} WHERE id = %s", vals)
                conn.commit()
                return ok({"ok": True})

        # ─── MACHINES (CNC) ───────────────────────────────────────────────────
        if resource == "machines":
            if method == "GET":
                cur.execute(f"""
                    SELECT m.id, m.name, m.type, m.status, m.load_pct,
                           m.program, m.notes, m.updated_at,
                           u.name AS operator_name
                    FROM {S}.machines m
                    LEFT JOIN {S}.users u ON u.id = m.operator_id
                    ORDER BY m.name
                """)
                return ok(list(cur.fetchall()))

            if method == "POST":
                cur.execute(f"""
                    INSERT INTO {S}.machines (name, type, status, load_pct, program, operator_id, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
                """, (
                    body["name"], body["type"],
                    body.get("status", "idle"), body.get("load_pct", 0),
                    body.get("program"), body.get("operator_id"), body.get("notes"),
                ))
                new_id = cur.fetchone()["id"]
                conn.commit()
                return ok({"id": new_id}, 201)

            if method == "PUT" and rid:
                fields, vals = [], []
                for f in ("name", "type", "status", "load_pct", "program", "operator_id", "notes"):
                    if f in body:
                        fields.append(f"{f} = %s")
                        vals.append(body[f])
                fields.append("updated_at = NOW()")
                vals.append(rid)
                cur.execute(f"UPDATE {S}.machines SET {', '.join(fields)} WHERE id = %s", vals)
                conn.commit()
                return ok({"ok": True})

        # ─── PROGRAMS (CAM) ───────────────────────────────────────────────────
        if resource == "programs":
            if method == "GET":
                cur.execute(f"""
                    SELECT pg.id, pg.name, pg.code, pg.status, pg.est_time,
                           pg.started_at, pg.finished_at, pg.created_at,
                           p.name AS part_name, p.code AS part_code,
                           m.name AS machine_name,
                           u.name AS author_name
                    FROM {S}.cnc_programs pg
                    LEFT JOIN {S}.parts p ON p.id = pg.part_id
                    LEFT JOIN {S}.machines m ON m.id = pg.machine_id
                    LEFT JOIN {S}.users u ON u.id = pg.author_id
                    ORDER BY pg.created_at DESC
                """)
                return ok(list(cur.fetchall()))

            if method == "POST":
                cur.execute(f"""
                    INSERT INTO {S}.cnc_programs (part_id, machine_id, name, code, status, est_time, author_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
                """, (
                    body.get("part_id"), body.get("machine_id"),
                    body["name"], body.get("code"),
                    body.get("status", "queue"), body.get("est_time"),
                    body.get("author_id"),
                ))
                new_id = cur.fetchone()["id"]
                conn.commit()
                return ok({"id": new_id}, 201)

            if method == "PUT" and rid:
                fields, vals = [], []
                for f in ("status", "machine_id", "part_id", "est_time", "code"):
                    if f in body:
                        fields.append(f"{f} = %s")
                        vals.append(body[f])
                if body.get("status") == "running":
                    fields.append("started_at = NOW()")
                if body.get("status") == "done":
                    fields.append("finished_at = NOW()")
                vals.append(rid)
                cur.execute(f"UPDATE {S}.cnc_programs SET {', '.join(fields)} WHERE id = %s", vals)
                conn.commit()
                return ok({"ok": True})

        # ─── SIMULATIONS (CAE) ────────────────────────────────────────────────
        if resource == "simulations":
            if method == "GET":
                cur.execute(f"""
                    SELECT s.id, s.name, s.sim_type, s.status, s.result, s.stress_pct,
                           s.created_at, s.updated_at,
                           p.name AS part_name, p.code AS part_code,
                           u.name AS author_name
                    FROM {S}.simulations s
                    LEFT JOIN {S}.parts p ON p.id = s.part_id
                    LEFT JOIN {S}.users u ON u.id = s.author_id
                    ORDER BY s.created_at DESC
                """)
                return ok(list(cur.fetchall()))

            if method == "POST":
                cur.execute(f"""
                    INSERT INTO {S}.simulations (part_id, name, sim_type, status, result, stress_pct, author_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
                """, (
                    body.get("part_id"), body["name"], body["sim_type"],
                    body.get("status", "queue"), body.get("result"),
                    body.get("stress_pct"), body.get("author_id"),
                ))
                new_id = cur.fetchone()["id"]
                conn.commit()
                return ok({"id": new_id}, 201)

            if method == "PUT" and rid:
                fields, vals = [], []
                for f in ("status", "result", "stress_pct"):
                    if f in body:
                        fields.append(f"{f} = %s")
                        vals.append(body[f])
                fields.append("updated_at = NOW()")
                vals.append(rid)
                cur.execute(f"UPDATE {S}.simulations SET {', '.join(fields)} WHERE id = %s", vals)
                conn.commit()
                return ok({"ok": True})

        # ─── JOBS ────────────────────────────────────────────────────────────
        if resource == "jobs":
            if method == "GET":
                cur.execute(f"""
                    SELECT j.id, j.status, j.priority, j.qty, j.due_date, j.notes,
                           j.created_at, j.updated_at,
                           pr.name AS product_name, pr.code AS product_code,
                           p.name AS part_name, p.code AS part_code,
                           m.name AS machine_name,
                           u.name AS assignee_name
                    FROM {S}.jobs j
                    LEFT JOIN {S}.products pr ON pr.id = j.product_id
                    LEFT JOIN {S}.parts p ON p.id = j.part_id
                    LEFT JOIN {S}.machines m ON m.id = j.machine_id
                    LEFT JOIN {S}.users u ON u.id = j.assignee_id
                    ORDER BY
                        CASE j.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
                        j.created_at DESC
                """)
                return ok(list(cur.fetchall()))

            if method == "POST":
                cur.execute(f"""
                    INSERT INTO {S}.jobs (product_id, part_id, machine_id, status, priority, qty, assignee_id, due_date, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
                """, (
                    body.get("product_id"), body.get("part_id"), body.get("machine_id"),
                    body.get("status", "new"), body.get("priority", "normal"),
                    body.get("qty", 1), body.get("assignee_id"),
                    body.get("due_date") or None, body.get("notes"),
                ))
                new_id = cur.fetchone()["id"]
                conn.commit()
                return ok({"id": new_id}, 201)

            if method == "PUT" and rid:
                fields, vals = [], []
                for f in ("status", "priority", "qty", "machine_id", "part_id", "assignee_id", "due_date", "notes"):
                    if f in body:
                        fields.append(f"{f} = %s")
                        vals.append(body[f])
                fields.append("updated_at = NOW()")
                vals.append(rid)
                cur.execute(f"UPDATE {S}.jobs SET {', '.join(fields)} WHERE id = %s", vals)
                conn.commit()
                return ok({"ok": True})

        return err("Маршрут не найден", 404)

    finally:
        cur.close()
        conn.close()