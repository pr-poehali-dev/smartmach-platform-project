"""
Drawings API — сохранение и управление 2D-чертежами.
POST /             — создать чертёж (base64 PNG + canvas_json + метаданные)
PUT  ?id=N         — обновить canvas_json / превью чертежа
GET  ?id=N         — конкретный чертёж (с canvas_json)
GET  ?part_id=N    — список чертежей детали
GET  ?module=X     — список чертежей по модулю (machine, cad и т.д.)
GET                — все чертежи компании
DELETE ?id=N       — удалить чертёж
"""
import os, json, base64, uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3

S = "t_p45794133_smartmach_platform_p"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS, "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_session(cur, sid):
    if not sid:
        return None, None
    cur.execute(
        f"SELECT u.id, s.company_id FROM {S}.sessions s JOIN {S}.users u ON u.id = s.user_id "
        f"WHERE s.id = %s AND s.expires_at > now() AND u.is_active = true LIMIT 1",
        (sid,)
    )
    row = cur.fetchone()
    if not row:
        return None, None
    return row["id"], row["company_id"]


def upload_preview(s3_client, company_id, image_b64):
    """Загружает base64 PNG превью в S3 и возвращает (cdn_url, file_size)."""
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]
    img_bytes = base64.b64decode(image_b64)
    key = f"drawings/{company_id}/{uuid.uuid4()}.png"
    s3_client.put_object(
        Bucket="files",
        Key=key,
        Body=img_bytes,
        ContentType="image/png",
    )
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return cdn_url, len(img_bytes)


def handler(event: dict, context) -> dict:
    """Drawings: сохранение 2D-чертежей (canvas JSON + PNG превью) с привязкой к модулю."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    sid = event.get("headers", {}).get("X-Session-Id") or ""

    conn = db()
    cur = conn.cursor()

    try:
        user_id, company_id = get_session(cur, sid)
        if not user_id:
            return err("Не авторизован.", 401)

        # ── GET ?id=N — один чертёж с canvas_json ────────────────────
        if method == "GET" and qs.get("id"):
            cur.execute(f"""
                SELECT d.*, u.name AS author_name,
                       p.name AS part_name, p.code AS part_code
                FROM {S}.drawings d
                LEFT JOIN {S}.users u ON u.id = d.author_id
                LEFT JOIN {S}.parts p ON p.id = d.part_id
                WHERE d.id = %s AND d.company_id = %s
            """, (int(qs["id"]), company_id))
            row = cur.fetchone()
            if not row:
                return err("Чертёж не найден.", 404)
            return ok(dict(row))

        # ── GET ?part_id=N — чертежи детали ──────────────────────────
        if method == "GET" and qs.get("part_id"):
            cur.execute(f"""
                SELECT d.id, d.name, d.paper_size, d.theme, d.file_url, d.file_size,
                       d.module, d.description, d.gost_meta, d.created_at, d.updated_at,
                       u.name AS author_name
                FROM {S}.drawings d
                LEFT JOIN {S}.users u ON u.id = d.author_id
                WHERE d.part_id = %s AND d.company_id = %s
                ORDER BY d.created_at DESC
            """, (int(qs["part_id"]), company_id))
            return ok(list(cur.fetchall()))

        # ── GET ?module=X — чертежи по модулю ────────────────────────
        if method == "GET" and qs.get("module"):
            cur.execute(f"""
                SELECT d.id, d.name, d.paper_size, d.theme, d.file_url, d.file_size,
                       d.module, d.description, d.gost_meta, d.created_at, d.updated_at,
                       u.name AS author_name,
                       p.name AS part_name, p.code AS part_code
                FROM {S}.drawings d
                LEFT JOIN {S}.users u ON u.id = d.author_id
                LEFT JOIN {S}.parts p ON p.id = d.part_id
                WHERE d.module = %s AND d.company_id = %s
                  AND d.name NOT LIKE '%%[удалён]'
                ORDER BY d.updated_at DESC
                LIMIT 200
            """, (qs["module"], company_id))
            return ok(list(cur.fetchall()))

        # ── GET — все чертежи компании ────────────────────────────────
        if method == "GET":
            cur.execute(f"""
                SELECT d.id, d.name, d.paper_size, d.theme, d.file_url, d.file_size,
                       d.module, d.description, d.created_at, d.updated_at,
                       u.name AS author_name,
                       p.name AS part_name, p.code AS part_code
                FROM {S}.drawings d
                LEFT JOIN {S}.users u ON u.id = d.author_id
                LEFT JOIN {S}.parts p ON p.id = d.part_id
                WHERE d.company_id = %s AND d.name NOT LIKE '%%[удалён]'
                ORDER BY d.updated_at DESC
                LIMIT 100
            """, (company_id,))
            return ok(list(cur.fetchall()))

        # ── POST — создать чертёж ─────────────────────────────────────
        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            image_b64   = body.get("image")
            canvas_json = body.get("canvas_json")
            layers_json = body.get("layers_json")
            name        = (body.get("name") or "Новый чертёж").strip()
            part_id     = body.get("part_id")
            paper_size  = body.get("paper_size", "A4 горизонт.")
            theme       = body.get("theme", "light")
            gost_meta   = body.get("gost_meta")
            module      = body.get("module", "cad")
            description = body.get("description", "")

            if not image_b64:
                return err("Нет превью чертежа (image).")

            cdn_url, file_size = upload_preview(s3(), company_id, image_b64)

            cur.execute(f"""
                INSERT INTO {S}.drawings
                    (part_id, company_id, author_id, name, paper_size, theme,
                     file_url, file_size, gost_meta, canvas_json, layers_json,
                     module, description)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id
            """, (
                part_id, company_id, user_id, name,
                paper_size, theme, cdn_url, file_size,
                json.dumps(gost_meta, ensure_ascii=False) if gost_meta else None,
                canvas_json,
                layers_json,
                module, description,
            ))
            drawing_id = cur.fetchone()["id"]
            conn.commit()
            return ok({"id": drawing_id, "file_url": cdn_url, "file_size": file_size}, 201)

        # ── PUT ?id=N — обновить чертёж ───────────────────────────────
        if method == "PUT" and qs.get("id"):
            body = json.loads(event.get("body") or "{}")
            did  = int(qs["id"])

            # Проверяем права
            cur.execute(f"SELECT id FROM {S}.drawings WHERE id=%s AND company_id=%s", (did, company_id))
            if not cur.fetchone():
                return err("Чертёж не найден.", 404)

            sets, vals = [], []
            for field in ("name", "description", "paper_size", "theme"):
                if field in body:
                    sets.append(f"{field} = %s"); vals.append(body[field])
            if "canvas_json" in body:
                sets.append("canvas_json = %s"); vals.append(body["canvas_json"])
            if "layers_json" in body:
                sets.append("layers_json = %s"); vals.append(body["layers_json"])
            if "gost_meta" in body:
                sets.append("gost_meta = %s")
                vals.append(json.dumps(body["gost_meta"], ensure_ascii=False) if body["gost_meta"] else None)

            # Обновляем превью если передан image
            if body.get("image"):
                cdn_url, file_size = upload_preview(s3(), company_id, body["image"])
                sets.append("file_url = %s"); vals.append(cdn_url)
                sets.append("file_size = %s"); vals.append(file_size)

            if sets:
                sets.append("updated_at = now()")
                vals.append(did)
                cur.execute(f"UPDATE {S}.drawings SET {', '.join(sets)} WHERE id=%s", vals)
                conn.commit()

            return ok({"ok": True})

        # ── DELETE ?id=N ──────────────────────────────────────────────
        if method == "DELETE" and qs.get("id"):
            did = int(qs["id"])
            cur.execute(f"""
                SELECT id FROM {S}.drawings WHERE id=%s AND company_id=%s
            """, (did, company_id))
            if not cur.fetchone():
                return err("Чертёж не найден.", 404)
            cur.execute(f"DELETE FROM {S}.drawings WHERE id=%s", (did,))
            conn.commit()
            return ok({"ok": True})

        return err("Маршрут не найден.", 404)

    finally:
        cur.close()
        conn.close()
