"""
Drawings API — сохранение и управление 2D-чертежами.
POST /           — загрузить чертёж (base64 PNG) + метаданные
GET  ?part_id=N  — список чертежей детали
GET  ?id=N       — конкретный чертёж
DELETE ?id=N     — удалить чертёж
"""
import os, json, base64, uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3

S = "t_p45794133_smartmach_platform_p"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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


def handler(event: dict, context) -> dict:
    """Drawings: сохранение 2D-чертежей в S3 и привязка к деталям."""
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

        # GET ?id=N — один чертёж
        if method == "GET" and qs.get("id"):
            cur.execute(f"""
                SELECT d.*, u.name AS author_name, p.name AS part_name, p.code AS part_code
                FROM {S}.drawings d
                LEFT JOIN {S}.users u ON u.id = d.author_id
                LEFT JOIN {S}.parts p ON p.id = d.part_id
                WHERE d.id = %s AND d.company_id = %s
            """, (int(qs["id"]), company_id))
            row = cur.fetchone()
            if not row:
                return err("Чертёж не найден.", 404)
            return ok(dict(row))

        # GET ?part_id=N — чертежи детали
        if method == "GET" and qs.get("part_id"):
            cur.execute(f"""
                SELECT d.id, d.name, d.paper_size, d.theme, d.file_url, d.file_size,
                       d.gost_meta, d.created_at, u.name AS author_name
                FROM {S}.drawings d
                LEFT JOIN {S}.users u ON u.id = d.author_id
                WHERE d.part_id = %s AND d.company_id = %s
                ORDER BY d.created_at DESC
            """, (int(qs["part_id"]), company_id))
            return ok(list(cur.fetchall()))

        # GET — все чертежи компании
        if method == "GET":
            cur.execute(f"""
                SELECT d.id, d.name, d.paper_size, d.theme, d.file_url, d.file_size,
                       d.created_at, u.name AS author_name,
                       p.name AS part_name, p.code AS part_code
                FROM {S}.drawings d
                LEFT JOIN {S}.users u ON u.id = d.author_id
                LEFT JOIN {S}.parts p ON p.id = d.part_id
                WHERE d.company_id = %s
                ORDER BY d.created_at DESC
                LIMIT 100
            """, (company_id,))
            return ok(list(cur.fetchall()))

        # POST — сохранить чертёж
        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            image_b64 = body.get("image")  # base64 PNG
            name      = (body.get("name") or "Чертёж").strip()
            part_id   = body.get("part_id")
            paper_size = body.get("paper_size", "A4 горизонт.")
            theme      = body.get("theme", "light")
            gost_meta  = body.get("gost_meta")  # dict с данными рамки

            if not image_b64:
                return err("Нет изображения чертежа.")

            # Декодируем base64
            if "," in image_b64:
                image_b64 = image_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(image_b64)
            file_size = len(img_bytes)

            # Загружаем в S3
            key = f"drawings/{company_id}/{uuid.uuid4()}.png"
            s3_client = s3()
            s3_client.put_object(
                Bucket="files",
                Key=key,
                Body=img_bytes,
                ContentType="image/png",
            )
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            # Сохраняем в БД
            cur.execute(f"""
                INSERT INTO {S}.drawings
                    (part_id, company_id, author_id, name, paper_size, theme, file_url, file_size, gost_meta)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                part_id, company_id, user_id, name,
                paper_size, theme, cdn_url, file_size,
                json.dumps(gost_meta, ensure_ascii=False) if gost_meta else None,
            ))
            drawing_id = cur.fetchone()["id"]
            conn.commit()

            return ok({"id": drawing_id, "file_url": cdn_url, "file_size": file_size}, 201)

        # DELETE ?id=N
        if method == "DELETE" and qs.get("id"):
            cur.execute(f"""
                UPDATE {S}.drawings SET updated_at = now()
                WHERE id = %s AND company_id = %s RETURNING file_url
            """, (int(qs["id"]), company_id))
            row = cur.fetchone()
            if not row:
                return err("Чертёж не найден.", 404)
            # Помечаем как удалённый (не удаляем из S3 физически — сохраняем историю)
            cur.execute(f"UPDATE {S}.drawings SET name = name || ' [удалён]' WHERE id = %s", (int(qs["id"]),))
            conn.commit()
            return ok({"ok": True})

        return err("Маршрут не найден.", 404)

    finally:
        cur.close()
        conn.close()
