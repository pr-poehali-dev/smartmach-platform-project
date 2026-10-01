"""
Техкарты: маршрут операций, переходы, режимы резания и нормы времени.
Расчёт по общемашиностроительным нормативам:
  n   = 1000·V / (π·D)                 — частота вращения, об/мин
  То  = (L + l_вр) · i / (n · S)       — основное время перехода, мин
  Тшт = (То + Тв) · (1 + К/100)         — штучное время, мин
  Тшк = Тшт + Тпз / N                   — штучно-калькуляционное время, мин
"""
import math
import re

S = "t_p45794133_smartmach_platform_p"

PROCESS_FIELDS = ("part_id", "code", "name", "material", "blank_type", "blank_size",
                  "blank_mass", "part_mass", "batch_size", "status", "developer",
                  "checker", "approver", "notes")
OPERATION_FIELDS = ("op_no", "name", "workshop", "area", "equipment_id", "equipment_name",
                    "cam_program_id", "fixture", "profession", "worker_rank", "workers",
                    "t_aux", "k_service_pct", "t_pz", "notes", "sort")
STEP_FIELDS = ("step_no", "description", "tool", "measuring_tool", "diameter", "length",
               "overrun", "depth", "passes", "feed", "speed", "spindle", "t_main",
               "manual_time", "sort")


def num(v, default=None):
    if v is None or v == "":
        return default
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        return default


def parse_minutes(text):
    """'1ч 20м', '01:20', '45 мин', '80' → минуты."""
    if not text:
        return 0.0
    t = str(text).lower().strip()
    m = re.match(r"^(\d+):(\d{1,2})(?::(\d{1,2}))?$", t)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2)) + int(m.group(3) or 0) / 60
    total, found = 0.0, False
    for val, unit in re.findall(r"(\d+(?:[.,]\d+)?)\s*(ч|h|м|m|с|s)", t):
        found = True
        x = float(val.replace(",", "."))
        total += x * 60 if unit in ("ч", "h") else x / 60 if unit in ("с", "s") else x
    if found:
        return total
    return num(t, 0.0) or 0.0


def calc_step(step):
    """Досчитывает частоту вращения и основное время перехода."""
    d = num(step.get("diameter"))
    v = num(step.get("speed"))
    n = num(step.get("spindle"))
    s = num(step.get("feed"))
    length = num(step.get("length"), 0) or 0
    over = num(step.get("overrun"), 0) or 0
    passes = int(num(step.get("passes"), 1) or 1)

    if (not n) and v and d:
        n = round(1000 * v / (math.pi * d), 1)
    if (not v) and n and d:
        v = round(math.pi * d * n / 1000, 2)
    step["spindle"] = n
    step["speed"] = v

    if not step.get("manual_time"):
        if n and s and length:
            step["t_main"] = round((length + over) * passes / (n * s), 3)
        else:
            step["t_main"] = num(step.get("t_main"), 0) or 0
    return step


def calc_operation(op, steps, batch, cam_minutes=0.0):
    """Нормы времени операции. Если переходов нет — основное время берётся из CAM-программы."""
    t_main = sum(num(s.get("t_main"), 0) or 0 for s in steps)
    if t_main == 0 and cam_minutes:
        t_main = cam_minutes
    t_aux = num(op.get("t_aux"), 0) or 0
    k = num(op.get("k_service_pct"), 8) or 0
    t_pz = num(op.get("t_pz"), 0) or 0
    t_sht = (t_main + t_aux) * (1 + k / 100)
    t_sht_k = t_sht + (t_pz / max(batch or 1, 1))
    return round(t_main, 3), round(t_sht, 3), round(t_sht_k, 3)


def recalc_process(cur, process_id):
    """Пересчитывает все переходы и операции техкарты."""
    cur.execute(f"SELECT batch_size FROM {S}.tech_processes WHERE id=%s", (process_id,))
    row = cur.fetchone()
    if not row:
        return
    batch = row["batch_size"] or 1
    cur.execute(f"""
        SELECT o.*, c.est_time AS cam_est
        FROM {S}.tech_operations o
        LEFT JOIN {S}.cnc_programs c ON c.id = o.cam_program_id
        WHERE o.process_id=%s
    """, (process_id,))
    for op in cur.fetchall():
        cur.execute(f"SELECT * FROM {S}.tech_steps WHERE operation_id=%s", (op["id"],))
        steps = []
        for st in cur.fetchall():
            st = calc_step(dict(st))
            cur.execute(f"UPDATE {S}.tech_steps SET spindle=%s, speed=%s, t_main=%s WHERE id=%s",
                        (st["spindle"], st["speed"], st["t_main"], st["id"]))
            steps.append(st)
        t_main, t_sht, t_sht_k = calc_operation(op, steps, batch, parse_minutes(op["cam_est"]))
        cur.execute(f"UPDATE {S}.tech_operations SET t_main=%s, t_sht=%s, t_sht_k=%s WHERE id=%s",
                    (t_main, t_sht, t_sht_k, op["id"]))
    cur.execute(f"UPDATE {S}.tech_processes SET updated_at=now() WHERE id=%s", (process_id,))


def pick(body, fields):
    return {k: body[k] for k in fields if k in body}


def own_process(cur, pid, company_id):
    cur.execute(f"SELECT id FROM {S}.tech_processes WHERE id=%s AND company_id=%s", (pid, company_id))
    return cur.fetchone() is not None


def op_process(cur, op_id, company_id):
    cur.execute(f"SELECT process_id FROM {S}.tech_operations WHERE id=%s AND company_id=%s",
                (op_id, company_id))
    r = cur.fetchone()
    return r["process_id"] if r else None


def full_process(cur, pid, company_id):
    cur.execute(f"""
        SELECT t.*, p.code AS part_code, p.name AS part_name, u.name AS author_name
        FROM {S}.tech_processes t
        LEFT JOIN {S}.parts p ON p.id = t.part_id
        LEFT JOIN {S}.users u ON u.id = t.author_id
        WHERE t.id=%s AND t.company_id=%s
    """, (pid, company_id))
    proc = cur.fetchone()
    if not proc:
        return None
    proc = dict(proc)
    cur.execute(f"""
        SELECT o.*, e.name AS eq_name, e.model AS eq_model,
               c.name AS cam_name, c.code AS cam_code, c.est_time AS cam_est
        FROM {S}.tech_operations o
        LEFT JOIN {S}.equipment e ON e.id = o.equipment_id
        LEFT JOIN {S}.cnc_programs c ON c.id = o.cam_program_id
        WHERE o.process_id=%s ORDER BY o.sort, o.op_no
    """, (pid,))
    ops = [dict(o) for o in cur.fetchall()]
    ids = [o["id"] for o in ops]
    steps_by_op = {i: [] for i in ids}
    if ids:
        cur.execute(f"SELECT * FROM {S}.tech_steps WHERE operation_id = ANY(%s) ORDER BY sort, step_no",
                    (ids,))
        for st in cur.fetchall():
            steps_by_op[st["operation_id"]].append(dict(st))
    for o in ops:
        o["steps"] = steps_by_op[o["id"]]
    proc["operations"] = ops
    proc["total_t_sht"] = round(sum(float(o["t_sht"] or 0) for o in ops), 3)
    proc["total_t_sht_k"] = round(sum(float(o["t_sht_k"] or 0) for o in ops), 3)
    proc["total_t_pz"] = round(sum(float(o["t_pz"] or 0) for o in ops), 3)
    return proc


def insert(cur, table, data):
    cols = list(data.keys())
    cur.execute(
        f"INSERT INTO {S}.{table} ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))}) RETURNING id",
        [data[c] for c in cols],
    )
    return cur.fetchone()["id"]


def update(cur, table, rid, data):
    if not data:
        return
    sets = ", ".join(f"{k}=%s" for k in data)
    cur.execute(f"UPDATE {S}.{table} SET {sets} WHERE id=%s", list(data.values()) + [rid])


def clean(data):
    """Пустые строки в числовых/ссылочных полях → NULL."""
    return {k: (None if v == "" else v) for k, v in data.items()}


def import_process(body, cur, conn, company_id, user_id, ok, err):
    """Создаёт техкарту целиком: шапка + операции + переходы, затем пересчёт норм.
    Если part_id не задан, а передан part — создаёт деталь."""
    proc = body.get("process") or {}
    ops = body.get("operations") or []
    if not (proc.get("name") or "").strip():
        return err("Укажите наименование техпроцесса.")
    if not ops:
        return err("В техпроцессе нет операций.")
    if len(ops) > 40:
        return err("Слишком много операций (максимум 40).")

    part_id = proc.get("part_id")
    part = body.get("part")
    if part_id:
        cur.execute(f"SELECT id FROM {S}.parts WHERE id=%s AND company_id=%s", (part_id, company_id))
        if not cur.fetchone():
            return err("Деталь не найдена.", 404)
    elif part and (part.get("code") or "").strip() and (part.get("name") or "").strip():
        cur.execute(f"""INSERT INTO {S}.parts (code, name, material, version, status, collisions, author_id,
            notes, category, is_template, dimensions, weight_kg, company_id)
            VALUES (%s,%s,%s,'v1.0','ok',0,%s,%s,%s,false,%s,%s,%s) RETURNING id""",
            (part["code"].strip()[:100], part["name"].strip()[:300], part.get("material"), user_id,
             part.get("notes"), part.get("category") or "Прочее", part.get("dimensions"),
             num(part.get("weight_kg")), company_id))
        part_id = cur.fetchone()["id"]

    data = clean(pick(proc, PROCESS_FIELDS))
    data.update(company_id=company_id, author_id=user_id, part_id=part_id)
    pid = insert(cur, "tech_processes", data)

    cur.execute(f"SELECT id FROM {S}.equipment WHERE company_id=%s", (company_id,))
    own_eq = {r["id"] for r in cur.fetchall()}
    cur.execute(f"SELECT id FROM {S}.cnc_programs WHERE company_id=%s", (company_id,))
    own_cam = {r["id"] for r in cur.fetchall()}

    for i, op in enumerate(ops):
        od = clean(pick(op, OPERATION_FIELDS))
        if not od.get("name"):
            od["name"] = f"Операция {i + 1}"
        if not od.get("op_no"):
            od["op_no"] = f"{(i + 1) * 5:03d}"
        if od.get("equipment_id") not in own_eq:
            od["equipment_id"] = None
        if od.get("cam_program_id") not in own_cam:
            od["cam_program_id"] = None
        od.setdefault("sort", int(od["op_no"]) if str(od["op_no"]).isdigit() else i)
        od.update(process_id=pid, company_id=company_id)
        op_id = insert(cur, "tech_operations", od)
        for j, st in enumerate((op.get("steps") or [])[:40]):
            sd = clean(pick(st, STEP_FIELDS))
            if not sd.get("description"):
                continue
            sd.setdefault("step_no", j + 1)
            sd.setdefault("sort", j + 1)
            if sd.get("t_main") is None:
                sd.pop("t_main", None)
            elif not sd.get("feed") or not sd.get("length"):
                sd["manual_time"] = True
            sd.update(operation_id=op_id, company_id=company_id)
            insert(cur, "tech_steps", sd)

    recalc_process(cur, pid)
    conn.commit()
    return ok({"id": pid, "part_id": part_id}, 201)


def handle(method, qs, body, cur, conn, company_id, user_id, ok, err):
    """resource=techcards | tech_ops | tech_steps"""
    resource = qs.get("resource")
    rid = qs.get("id")
    rid = int(rid) if rid and str(rid).isdigit() else None

    # ─── ТЕХКАРТЫ ─────────────────────────────────────────────────
    if resource == "techcards":
        if method == "GET" and rid:
            proc = full_process(cur, rid, company_id)
            return ok(proc) if proc else err("Техкарта не найдена.", 404)

        if method == "GET":
            params = [company_id]
            where = "t.company_id=%s"
            if qs.get("part_id"):
                where += " AND t.part_id=%s"
                params.append(int(qs["part_id"]))
            cur.execute(f"""
                SELECT t.id, t.code, t.name, t.material, t.status, t.batch_size, t.part_id,
                       t.is_demo, t.updated_at, p.code AS part_code, p.name AS part_name,
                       COUNT(o.id) AS ops_count,
                       COALESCE(SUM(o.t_sht), 0) AS total_t_sht,
                       COALESCE(SUM(o.t_sht_k), 0) AS total_t_sht_k
                FROM {S}.tech_processes t
                LEFT JOIN {S}.parts p ON p.id = t.part_id
                LEFT JOIN {S}.tech_operations o ON o.process_id = t.id
                WHERE {where}
                GROUP BY t.id, p.code, p.name
                ORDER BY t.updated_at DESC
            """, params)
            return ok(list(cur.fetchall()))

        if method == "POST":
            if not (body.get("name") or "").strip():
                return err("Укажите наименование техпроцесса.")
            data = clean(pick(body, PROCESS_FIELDS))
            data.update(company_id=company_id, author_id=user_id)
            new_id = insert(cur, "tech_processes", data)
            conn.commit()
            return ok({"id": new_id}, 201)

        if method == "PUT" and rid:
            if not own_process(cur, rid, company_id):
                return err("Техкарта не найдена.", 404)
            update(cur, "tech_processes", rid, clean(pick(body, PROCESS_FIELDS)))
            recalc_process(cur, rid)
            conn.commit()
            return ok(full_process(cur, rid, company_id))

        if method == "DELETE" and rid:
            if not own_process(cur, rid, company_id):
                return err("Техкарта не найдена.", 404)
            cur.execute(f"DELETE FROM {S}.tech_steps WHERE operation_id IN "
                        f"(SELECT id FROM {S}.tech_operations WHERE process_id=%s)", (rid,))
            cur.execute(f"DELETE FROM {S}.tech_operations WHERE process_id=%s", (rid,))
            cur.execute(f"DELETE FROM {S}.tech_processes WHERE id=%s", (rid,))
            conn.commit()
            return ok({"ok": True})

    # ─── ИМПОРТ ГОТОВОГО ТЕХПРОЦЕССА (ИИ-технолог) ───────────────
    if resource == "techcard_import" and method == "POST":
        return import_process(body, cur, conn, company_id, user_id, ok, err)

    # ─── ОПЕРАЦИИ ─────────────────────────────────────────────────
    if resource == "tech_ops":
        if method == "POST":
            pid = int(body.get("process_id") or 0)
            if not own_process(cur, pid, company_id):
                return err("Техкарта не найдена.", 404)
            data = clean(pick(body, OPERATION_FIELDS))
            if not data.get("name"):
                return err("Укажите наименование операции.")
            if not data.get("op_no"):
                cur.execute(f"SELECT COUNT(*) AS c FROM {S}.tech_operations WHERE process_id=%s", (pid,))
                data["op_no"] = f"{(cur.fetchone()['c'] + 1) * 5:03d}"
            if "sort" not in data:
                data["sort"] = int(data["op_no"]) if str(data["op_no"]).isdigit() else 0
            data.update(process_id=pid, company_id=company_id)
            insert(cur, "tech_operations", data)
            recalc_process(cur, pid)
            conn.commit()
            return ok(full_process(cur, pid, company_id), 201)

        if method == "PUT" and rid:
            pid = op_process(cur, rid, company_id)
            if not pid:
                return err("Операция не найдена.", 404)
            update(cur, "tech_operations", rid, clean(pick(body, OPERATION_FIELDS)))
            recalc_process(cur, pid)
            conn.commit()
            return ok(full_process(cur, pid, company_id))

        if method == "DELETE" and rid:
            pid = op_process(cur, rid, company_id)
            if not pid:
                return err("Операция не найдена.", 404)
            cur.execute(f"DELETE FROM {S}.tech_steps WHERE operation_id=%s", (rid,))
            cur.execute(f"DELETE FROM {S}.tech_operations WHERE id=%s", (rid,))
            recalc_process(cur, pid)
            conn.commit()
            return ok(full_process(cur, pid, company_id))

    # ─── ПЕРЕХОДЫ ─────────────────────────────────────────────────
    if resource == "tech_steps":
        if method == "POST":
            op_id = int(body.get("operation_id") or 0)
            pid = op_process(cur, op_id, company_id)
            if not pid:
                return err("Операция не найдена.", 404)
            data = clean(pick(body, STEP_FIELDS))
            if not data.get("description"):
                return err("Опишите содержание перехода.")
            if not data.get("step_no"):
                cur.execute(f"SELECT COUNT(*) AS c FROM {S}.tech_steps WHERE operation_id=%s", (op_id,))
                data["step_no"] = cur.fetchone()["c"] + 1
            data.setdefault("sort", data["step_no"])
            data.update(operation_id=op_id, company_id=company_id)
            insert(cur, "tech_steps", data)
            recalc_process(cur, pid)
            conn.commit()
            return ok(full_process(cur, pid, company_id), 201)

        if method in ("PUT", "DELETE") and rid:
            cur.execute(f"""
                SELECT o.process_id FROM {S}.tech_steps s
                JOIN {S}.tech_operations o ON o.id = s.operation_id
                WHERE s.id=%s AND s.company_id=%s
            """, (rid, company_id))
            r = cur.fetchone()
            if not r:
                return err("Переход не найден.", 404)
            if method == "PUT":
                data = clean(pick(body, STEP_FIELDS))
                # ручной ввод основного времени отключает автосчёт
                if "t_main" in data and "manual_time" not in data:
                    data["manual_time"] = True
                update(cur, "tech_steps", rid, data)
            else:
                cur.execute(f"DELETE FROM {S}.tech_steps WHERE id=%s", (rid,))
            recalc_process(cur, r["process_id"])
            conn.commit()
            return ok(full_process(cur, r["process_id"], company_id))

    return None