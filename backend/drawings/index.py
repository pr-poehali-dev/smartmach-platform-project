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


REV_LETTERS = "АБВГДЕЖИКЛМНПРСТУФХЦЭЮЯ"


def rev_letter_for(n):
    """Буква изменения по ГОСТ 2.503: рев.1 — без буквы, далее А, Б, В... (без З, Й, О, Ч, Ъ, Ы, Ь)."""
    if n <= 1:
        return None
    i = n - 2
    if i < len(REV_LETTERS):
        return REV_LETTERS[i]
    return REV_LETTERS[i % len(REV_LETTERS)] + str(i // len(REV_LETTERS) + 1)


def count_objects(canvas_json):
    """Количество графических объектов в снимке — для сравнения ревизий."""
    if not canvas_json:
        return 0
    try:
        data = json.loads(canvas_json) if isinstance(canvas_json, str) else canvas_json
        return len(data.get("objects") or [])
    except Exception:
        return 0


def make_revision(cur, drawing_id, company_id, author_id, rev_no, data, note=None, reason=None):
    """Создаёт снимок ревизии и делает его текущим."""
    cur.execute(
        f"UPDATE {S}.drawing_revisions SET is_current = false WHERE drawing_id = %s",
        (drawing_id,)
    )
    letter = rev_letter_for(rev_no)
    cur.execute(f"""
        INSERT INTO {S}.drawing_revisions
            (drawing_id, company_id, author_id, rev_no, rev_letter, name,
             paper_size, theme, file_url, file_size, canvas_json, layers_json,
             gost_meta, change_note, change_reason, objects_count, is_current)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,true)
        RETURNING id
    """, (
        drawing_id, company_id, author_id, rev_no, letter,
        data.get("name") or "Чертёж",
        data.get("paper_size"), data.get("theme"),
        data.get("file_url"), data.get("file_size"),
        data.get("canvas_json"), data.get("layers_json"),
        json.dumps(data["gost_meta"], ensure_ascii=False) if data.get("gost_meta") else None,
        note, reason, count_objects(data.get("canvas_json")),
    ))
    cur.execute(
        f"UPDATE {S}.drawings SET current_rev = %s, rev_letter = %s WHERE id = %s",
        (rev_no, letter, drawing_id)
    )
    return cur.fetchone()["id"], letter


def handler(event: dict, context) -> dict:
    """Drawings: сохранение 2D-чертежей (canvas JSON + PNG превью) с историей версий по ГОСТ 2.503."""
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

        # ── GET ?revisions=N — история версий чертежа ────────────────
        if method == "GET" and qs.get("revisions"):
            did = int(qs["revisions"])
            cur.execute(f"SELECT id FROM {S}.drawings WHERE id=%s AND company_id=%s", (did, company_id))
            if not cur.fetchone():
                return err("Чертёж не найден.", 404)
            cur.execute(f"""
                SELECT r.id, r.rev_no, r.rev_letter, r.name, r.paper_size, r.theme,
                       r.file_url, r.file_size, r.change_note, r.change_reason,
                       r.objects_count, r.is_current, r.created_at,
                       u.name AS author_name
                FROM {S}.drawing_revisions r
                LEFT JOIN {S}.users u ON u.id = r.author_id
                WHERE r.drawing_id = %s
                ORDER BY r.rev_no DESC
            """, (did,))
            return ok(list(cur.fetchall()))

        # ── GET ?revision_id=N — одна ревизия целиком (для отката/просмотра) ──
        if method == "GET" and qs.get("revision_id"):
            cur.execute(f"""
                SELECT r.*, u.name AS author_name
                FROM {S}.drawing_revisions r
                LEFT JOIN {S}.users u ON u.id = r.author_id
                WHERE r.id = %s AND r.company_id = %s
            """, (int(qs["revision_id"]), company_id))
            row = cur.fetchone()
            if not row:
                return err("Версия не найдена.", 404)
            return ok(dict(row))

        # ── GET ?diff_a=N&diff_b=M — сравнение двух ревизий ───────────
        if method == "GET" and qs.get("diff_a") and qs.get("diff_b"):
            cur.execute(f"""
                SELECT id, rev_no, rev_letter, name, paper_size, theme, file_url,
                       objects_count, canvas_json, created_at
                FROM {S}.drawing_revisions
                WHERE id IN (%s, %s) AND company_id = %s
            """, (int(qs["diff_a"]), int(qs["diff_b"]), company_id))
            rows = {r["id"]: r for r in cur.fetchall()}
            a = rows.get(int(qs["diff_a"]))
            b = rows.get(int(qs["diff_b"]))
            if not a or not b:
                return err("Версии для сравнения не найдены.", 404)

            def types_of(cj):
                out = {}
                try:
                    for o in (json.loads(cj) or {}).get("objects", []):
                        t = o.get("cadType") or o.get("type") or "объект"
                        out[t] = out.get(t, 0) + 1
                except Exception:
                    pass
                return out

            ta, tb = types_of(a["canvas_json"]), types_of(b["canvas_json"])
            changes = []
            for key in sorted(set(ta) | set(tb)):
                was, now = ta.get(key, 0), tb.get(key, 0)
                if was != now:
                    changes.append({"kind": key, "was": was, "now": now, "delta": now - was})

            for r in (a, b):
                r.pop("canvas_json", None)
            return ok({
                "a": dict(a), "b": dict(b), "changes": changes,
                "objects_delta": (b["objects_count"] or 0) - (a["objects_count"] or 0),
                "name_changed": a["name"] != b["name"],
                "paper_changed": a["paper_size"] != b["paper_size"],
            })

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
        if method == "POST" and not qs.get("restore"):
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

            make_revision(cur, drawing_id, company_id, user_id, 1, {
                "name": name, "paper_size": paper_size, "theme": theme,
                "file_url": cdn_url, "file_size": file_size,
                "canvas_json": canvas_json, "layers_json": layers_json,
                "gost_meta": gost_meta,
            }, note=body.get("change_note") or "Первичная разработка")

            conn.commit()
            return ok({"id": drawing_id, "file_url": cdn_url, "file_size": file_size, "rev_no": 1}, 201)

        # ── POST ?restore=REV_ID — откат к версии (новой ревизией) ────
        if method == "POST" and qs.get("restore"):
            body = json.loads(event.get("body") or "{}")
            cur.execute(f"""
                SELECT * FROM {S}.drawing_revisions WHERE id=%s AND company_id=%s
            """, (int(qs["restore"]), company_id))
            src = cur.fetchone()
            if not src:
                return err("Версия не найдена.", 404)

            did = src["drawing_id"]
            cur.execute(f"SELECT current_rev FROM {S}.drawings WHERE id=%s AND company_id=%s", (did, company_id))
            drw = cur.fetchone()
            if not drw:
                return err("Чертёж не найден.", 404)

            rev_no = (drw["current_rev"] or 1) + 1
            cur.execute(f"""
                UPDATE {S}.drawings
                SET canvas_json=%s, layers_json=%s, file_url=%s, file_size=%s,
                    paper_size=%s, theme=%s, gost_meta=%s, updated_at=now()
                WHERE id=%s
            """, (
                src["canvas_json"], src["layers_json"], src["file_url"], src["file_size"],
                src["paper_size"], src["theme"],
                json.dumps(src["gost_meta"], ensure_ascii=False) if src["gost_meta"] else None,
                did,
            ))
            _, letter = make_revision(cur, did, company_id, user_id, rev_no, {
                "name": src["name"], "paper_size": src["paper_size"], "theme": src["theme"],
                "file_url": src["file_url"], "file_size": src["file_size"],
                "canvas_json": src["canvas_json"], "layers_json": src["layers_json"],
                "gost_meta": src["gost_meta"],
            },
                note=body.get("change_note") or f"Возврат к версии {src['rev_no']}",
                reason=body.get("change_reason") or "Откат изменений")
            conn.commit()
            return ok({"ok": True, "rev_no": rev_no, "rev_letter": letter, "restored_from": src["rev_no"]})

        # ── PUT ?id=N — обновить чертёж ───────────────────────────────
        if method == "PUT" and qs.get("id"):
            body = json.loads(event.get("body") or "{}")
            did  = int(qs["id"])

            cur.execute(f"SELECT * FROM {S}.drawings WHERE id=%s AND company_id=%s", (did, company_id))
            cur_row = cur.fetchone()
            if not cur_row:
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

            new_file_url  = cdn_url if body.get("image") else cur_row["file_url"]
            new_file_size = file_size if body.get("image") else cur_row["file_size"]

            if sets:
                sets.append("updated_at = now()")
                vals.append(did)
                cur.execute(f"UPDATE {S}.drawings SET {', '.join(sets)} WHERE id=%s", vals)

            # Новая ревизия — только если менялась сама графика
            rev_no = cur_row["current_rev"]
            letter = cur_row["rev_letter"]
            if body.get("canvas_json") is not None and body.get("new_revision") is not False:
                rev_no = (cur_row["current_rev"] or 1) + 1
                _, letter = make_revision(cur, did, company_id, user_id, rev_no, {
                    "name":        body.get("name", cur_row["name"]),
                    "paper_size":  body.get("paper_size", cur_row["paper_size"]),
                    "theme":       body.get("theme", cur_row["theme"]),
                    "file_url":    new_file_url,
                    "file_size":   new_file_size,
                    "canvas_json": body.get("canvas_json"),
                    "layers_json": body.get("layers_json", cur_row["layers_json"]),
                    "gost_meta":   body.get("gost_meta", cur_row["gost_meta"]),
                }, note=body.get("change_note"), reason=body.get("change_reason"))

            conn.commit()
            return ok({"ok": True, "rev_no": rev_no, "rev_letter": letter})

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