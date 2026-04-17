"""
Assembly API — модуль «Состав изделия» (BOM/Assembly Tree) для SmartMach.
Маршруты:
  GET  ?resource=assemblies              — список сборок предприятия
  GET  ?resource=assemblies&id=N         — одна сборка + корневые узлы
  POST ?resource=assemblies              — создать сборку
  PUT  ?resource=assemblies&id=N         — обновить сборку
  GET  ?resource=nodes&assembly_id=N     — полное дерево сборки
  GET  ?resource=nodes&id=N             — один узел
  POST ?resource=nodes                   — добавить узел
  PUT  ?resource=nodes&id=N             — обновить узел
  GET  ?resource=bom&assembly_id=N       — BOM (спецификация) плоским списком
  GET  ?resource=stats&assembly_id=N     — сводная статистика по сборке
  POST ?resource=snapshot                — зафиксировать версию (снапшот)
  GET  ?resource=snapshots&assembly_id=N — история версий
  GET  ?resource=parts_list              — детали CAD для выбора (связка)
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}
S = "t_p45794133_smartmach_platform_p"

NODE_TYPE_SECTION = {
    "assembly":  "Сборочные единицы",
    "part":      "Детали",
    "standard":  "Стандартные изделия",
    "fastener":  "Стандартные изделия",
    "material":  "Материалы",
    "purchased": "Покупные изделия",
}

NODE_TYPE_ORDER = {
    "assembly": 1,
    "part": 2,
    "standard": 3,
    "fastener": 3,
    "purchased": 4,
    "material": 5,
}


def db():
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=RealDictCursor)


def ok(data, status=200):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps(data, default=str, ensure_ascii=False)}


def err(msg, status=400):
    return {"statusCode": status, "headers": CORS,
            "body": json.dumps({"error": msg}, ensure_ascii=False)}


def get_company(cur, sid):
    if not sid:
        return None
    cur.execute(
        f"SELECT company_id FROM {S}.sessions WHERE id=%s AND expires_at>now() LIMIT 1",
        (sid,)
    )
    row = cur.fetchone()
    return row["company_id"] if row else None


def handler(event: dict, context) -> dict:
    """Assembly API — сборочные единицы и BOM-спецификации."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method  = event.get("httpMethod", "GET")
    qs      = event.get("queryStringParameters") or {}
    resource = qs.get("resource", "")
    rid     = qs.get("id")
    rid     = int(rid) if rid and str(rid).isdigit() else None

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    sid = (event.get("headers") or {}).get("X-Session-Id") or qs.get("sid")

    conn = db()
    cur  = conn.cursor()
    company_id = get_company(cur, sid)

    try:
        # ── ASSEMBLIES ────────────────────────────────────────────
        if resource == "assemblies":
            if method == "GET" and not rid:
                return _list_assemblies(cur, company_id)
            if method == "GET" and rid:
                return _get_assembly(cur, rid, company_id)
            if method == "POST":
                return _create_assembly(cur, conn, body, company_id)
            if method == "PUT" and rid:
                return _update_assembly(cur, conn, rid, body, company_id)

        # ── NODES ─────────────────────────────────────────────────
        elif resource == "nodes":
            asm_id = qs.get("assembly_id")
            asm_id = int(asm_id) if asm_id and str(asm_id).isdigit() else None

            if method == "GET" and asm_id:
                return _get_tree(cur, asm_id, company_id)
            if method == "GET" and rid:
                return _get_node(cur, rid, company_id)
            if method == "POST":
                return _create_node(cur, conn, body, company_id)
            if method == "PUT" and rid:
                return _update_node(cur, conn, rid, body, company_id)
            if method == "DELETE" and rid:
                return _delete_node(cur, conn, rid, company_id)

        # ── BOM ───────────────────────────────────────────────────
        elif resource == "bom":
            asm_id = qs.get("assembly_id")
            asm_id = int(asm_id) if asm_id and str(asm_id).isdigit() else None
            if asm_id:
                return _get_bom(cur, asm_id, company_id)

        # ── STATS ─────────────────────────────────────────────────
        elif resource == "stats":
            asm_id = qs.get("assembly_id")
            asm_id = int(asm_id) if asm_id and str(asm_id).isdigit() else None
            if asm_id:
                return _get_stats(cur, asm_id, company_id)

        # ── SNAPSHOT ──────────────────────────────────────────────
        elif resource == "snapshot" and method == "POST":
            return _create_snapshot(cur, conn, body, company_id)

        elif resource == "snapshots":
            asm_id = qs.get("assembly_id")
            asm_id = int(asm_id) if asm_id and str(asm_id).isdigit() else None
            if asm_id:
                return _list_snapshots(cur, asm_id)

        # ── PARTS LIST (для связки узлов с CAD) ───────────────────
        elif resource == "parts_list":
            return _parts_list(cur, company_id)

        return err("unknown resource", 404)

    except Exception as e:
        conn.rollback()
        return err(str(e), 500)
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────
# ASSEMBLIES
# ─────────────────────────────────────────────────────────────────

def _list_assemblies(cur, company_id):
    cond = "WHERE a.company_id=%s" if company_id else "WHERE a.company_id IS NOT NULL OR a.company_id IS NULL"
    params = (company_id,) if company_id else ()
    if not company_id:
        cond = ""
    cur.execute(f"""
        SELECT
            a.*,
            u.name AS owner_name,
            COUNT(DISTINCT n.id) AS node_count,
            COALESCE(SUM(CASE WHEN n.parent_id IS NULL THEN n.total_weight_kg ELSE 0 END),0) AS calc_weight_kg
        FROM {S}.assemblies a
        LEFT JOIN {S}.users u ON u.id = a.owner_id
        LEFT JOIN {S}.assembly_nodes n ON n.assembly_id = a.id
        {cond}
        GROUP BY a.id, u.name
        ORDER BY a.updated_at DESC
    """, params)
    return ok(cur.fetchall())


def _get_assembly(cur, asm_id, company_id):
    cur.execute(f"""
        SELECT a.*, u.name AS owner_name
        FROM {S}.assemblies a
        LEFT JOIN {S}.users u ON u.id = a.owner_id
        WHERE a.id=%s
    """, (asm_id,))
    asm = cur.fetchone()
    if not asm:
        return err("not found", 404)
    # корневые узлы
    cur.execute(f"""
        SELECT * FROM {S}.assembly_nodes
        WHERE assembly_id=%s AND parent_id IS NULL
        ORDER BY sort_order, position_no
    """, (asm_id,))
    asm = dict(asm)
    asm["root_nodes"] = cur.fetchall()
    return ok(asm)


def _create_assembly(cur, conn, body, company_id):
    cur.execute(f"""
        INSERT INTO {S}.assemblies
          (company_id,code,name,description,asm_type,stage,revision,standard,notes,owner_id,product_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING *
    """, (
        company_id,
        body.get("code","ASM-NEW"),
        body.get("name","Новая сборка"),
        body.get("description"),
        body.get("asm_type","assembly"),
        body.get("stage","draft"),
        body.get("revision","A"),
        body.get("standard"),
        body.get("notes"),
        body.get("owner_id"),
        body.get("product_id"),
    ))
    row = cur.fetchone()
    conn.commit()
    return ok(dict(row), 201)


def _update_assembly(cur, conn, asm_id, body, company_id):
    allowed = ["code","name","description","asm_type","stage","revision",
               "standard","notes","owner_id","product_id","weight_kg"]
    sets = []
    vals = []
    for k in allowed:
        if k in body:
            sets.append(f"{k}=%s")
            vals.append(body[k])
    if not sets:
        return err("nothing to update")
    sets.append("updated_at=now()")
    vals.append(asm_id)
    cur.execute(f"UPDATE {S}.assemblies SET {','.join(sets)} WHERE id=%s RETURNING *", vals)
    row = cur.fetchone()
    conn.commit()
    return ok(dict(row))


# ─────────────────────────────────────────────────────────────────
# NODES — TREE
# ─────────────────────────────────────────────────────────────────

def _get_tree(cur, asm_id, company_id):
    """Возвращает всё дерево узлов одним запросом, фронт строит иерархию."""
    cur.execute(f"""
        SELECT
            n.*,
            p.name AS part_name,
            p.code AS part_code,
            ca.name AS child_asm_name
        FROM {S}.assembly_nodes n
        LEFT JOIN {S}.parts p ON p.id = n.part_id
        LEFT JOIN {S}.assemblies ca ON ca.id = n.child_assembly_id
        WHERE n.assembly_id = %s
        ORDER BY n.sort_order, n.position_no, n.id
    """, (asm_id,))
    nodes = [dict(r) for r in cur.fetchall()]
    return ok(nodes)


def _get_node(cur, node_id, company_id):
    cur.execute(f"""
        SELECT n.*, p.name AS part_name, p.code AS part_code
        FROM {S}.assembly_nodes n
        LEFT JOIN {S}.parts p ON p.id = n.part_id
        WHERE n.id=%s
    """, (node_id,))
    row = cur.fetchone()
    return ok(dict(row)) if row else err("not found", 404)


def _create_node(cur, conn, body, company_id):
    asm_id    = body.get("assembly_id")
    parent_id = body.get("parent_id")
    if not asm_id:
        return err("assembly_id required")

    # автопозиция: max(sort_order)+10 среди братьев
    cur.execute(f"""
        SELECT COALESCE(MAX(sort_order),0)+10 AS next_sort
        FROM {S}.assembly_nodes
        WHERE assembly_id=%s AND (parent_id IS NOT DISTINCT FROM %s)
    """, (asm_id, parent_id))
    next_sort = cur.fetchone()["next_sort"]

    # path
    if parent_id:
        cur.execute(f"SELECT path FROM {S}.assembly_nodes WHERE id=%s", (parent_id,))
        par = cur.fetchone()
        parent_path = par["path"] if par else ""
    else:
        parent_path = ""

    cur.execute(f"""
        SELECT COALESCE(MAX(position_no),0)+1 AS next_pos
        FROM {S}.assembly_nodes
        WHERE assembly_id=%s AND (parent_id IS NOT DISTINCT FROM %s)
    """, (asm_id, parent_id))
    next_pos = cur.fetchone()["next_pos"]

    new_path = f"{parent_path}.{next_pos}" if parent_path else str(next_pos)

    cur.execute(f"""
        INSERT INTO {S}.assembly_nodes
          (assembly_id,parent_id,path,position_no,sort_order,
           node_type,code,name,revision,qty,unit,
           material,weight_kg,total_weight_kg,
           dimensions,surface_finish,heat_treatment,
           tolerance_class,fit_type,status,
           part_id,child_assembly_id,
           notes,standard_ref,supplier,supplier_code,lead_time_days,
           issue_flag,issue_note)
        VALUES
          (%s,%s,%s,%s,%s,
           %s,%s,%s,%s,%s,%s,
           %s,%s,%s,
           %s,%s,%s,
           %s,%s,%s,
           %s,%s,
           %s,%s,%s,%s,%s,
           %s,%s)
        RETURNING *
    """, (
        asm_id, parent_id, new_path, next_pos, body.get("sort_order", next_sort),
        body.get("node_type","part"),
        body.get("code",""),
        body.get("name","Новый узел"),
        body.get("revision","A"),
        body.get("qty",1),
        body.get("unit","шт"),
        body.get("material"), body.get("weight_kg"), body.get("total_weight_kg"),
        body.get("dimensions"), body.get("surface_finish"), body.get("heat_treatment"),
        body.get("tolerance_class"), body.get("fit_type"),
        body.get("status","draft"),
        body.get("part_id"), body.get("child_assembly_id"),
        body.get("notes"), body.get("standard_ref"),
        body.get("supplier"), body.get("supplier_code"), body.get("lead_time_days"),
        body.get("issue_flag", False), body.get("issue_note"),
    ))
    row = cur.fetchone()
    conn.commit()
    return ok(dict(row), 201)


def _update_node(cur, conn, node_id, body, company_id):
    allowed = [
        "node_type","code","name","revision","qty","unit",
        "material","weight_kg","total_weight_kg",
        "dimensions","surface_finish","heat_treatment",
        "tolerance_class","fit_type","status",
        "part_id","child_assembly_id",
        "notes","standard_ref","supplier","supplier_code","lead_time_days",
        "issue_flag","issue_note","sort_order","position_no",
    ]
    sets, vals = [], []
    for k in allowed:
        if k in body:
            sets.append(f"{k}=%s")
            vals.append(body[k])
    if not sets:
        return err("nothing to update")
    sets.append("updated_at=now()")
    vals.append(node_id)
    cur.execute(f"UPDATE {S}.assembly_nodes SET {','.join(sets)} WHERE id=%s RETURNING *", vals)
    row = cur.fetchone()
    conn.commit()
    return ok(dict(row))


def _delete_node(cur, conn, node_id, company_id):
    # каскадно удалит дочерние через ON DELETE CASCADE
    cur.execute(f"DELETE FROM {S}.assembly_nodes WHERE id=%s", (node_id,))
    conn.commit()
    return ok({"deleted": node_id})


# ─────────────────────────────────────────────────────────────────
# BOM — Спецификация
# ─────────────────────────────────────────────────────────────────

def _get_bom(cur, asm_id, company_id):
    """
    Возвращает спецификацию ГОСТ 2.106:
    Сгруппировано по разделам, внутри — по pos_number.
    Дополнительно: суммарная масса, количество уникальных позиций.
    """
    cur.execute(f"""
        SELECT
            n.id, n.path, n.position_no, n.node_type,
            n.code, n.name, n.revision, n.designation,
            n.qty, n.unit, n.material,
            n.weight_kg, n.total_weight_kg,
            n.dimensions, n.surface_finish, n.heat_treatment,
            n.standard_ref, n.notes, n.status, n.issue_flag, n.issue_note,
            n.supplier, n.lead_time_days,
            n.parent_id,
            p.name AS linked_part_name,
            (SELECT name FROM {S}.assemblies WHERE id=n.child_assembly_id) AS child_asm_name
        FROM {S}.assembly_nodes n
        LEFT JOIN {S}.parts p ON p.id = n.part_id
        WHERE n.assembly_id=%s
        ORDER BY
            CASE n.node_type
                WHEN 'assembly'  THEN 1
                WHEN 'part'      THEN 2
                WHEN 'standard'  THEN 3
                WHEN 'fastener'  THEN 3
                WHEN 'purchased' THEN 4
                WHEN 'material'  THEN 5
                ELSE 6
            END,
            n.sort_order, n.position_no
    """, (asm_id,))
    nodes = [dict(r) for r in cur.fetchall()]

    # группируем по разделам
    sections = {}
    section_order = [
        "Сборочные единицы",
        "Детали",
        "Стандартные изделия",
        "Покупные изделия",
        "Материалы",
    ]
    for n in nodes:
        sec = NODE_TYPE_SECTION.get(n["node_type"], "Прочее")
        if sec not in sections:
            sections[sec] = []
        sections[sec].append(n)

    # суммарная масса
    total_w = sum(
        float(n["total_weight_kg"])
        for n in nodes
        if n["parent_id"] is None and n["total_weight_kg"] is not None
    )

    result = {
        "assembly_id": asm_id,
        "total_weight_kg": round(total_w, 4),
        "total_positions": len(nodes),
        "sections": [
            {"title": sec, "items": sections[sec]}
            for sec in section_order
            if sec in sections
        ],
    }
    return ok(result)


# ─────────────────────────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────────────────────────

def _get_stats(cur, asm_id, company_id):
    cur.execute(f"""
        SELECT
            COUNT(*) AS total_nodes,
            COUNT(*) FILTER (WHERE node_type='part')      AS parts_count,
            COUNT(*) FILTER (WHERE node_type='assembly')  AS subasm_count,
            COUNT(*) FILTER (WHERE node_type IN ('standard','fastener')) AS standards_count,
            COUNT(*) FILTER (WHERE node_type='material')  AS materials_count,
            COUNT(*) FILTER (WHERE node_type='purchased') AS purchased_count,
            COUNT(*) FILTER (WHERE issue_flag=true)       AS issues_count,
            COUNT(*) FILTER (WHERE status='draft')        AS draft_count,
            COUNT(*) FILTER (WHERE status='approved' OR status='production') AS approved_count,
            COALESCE(SUM(CASE WHEN parent_id IS NULL THEN total_weight_kg END),0) AS total_weight_kg
        FROM {S}.assembly_nodes
        WHERE assembly_id=%s
    """, (asm_id,))
    stats = dict(cur.fetchone())
    return ok(stats)


# ─────────────────────────────────────────────────────────────────
# SNAPSHOTS
# ─────────────────────────────────────────────────────────────────

def _create_snapshot(cur, conn, body, company_id):
    asm_id = body.get("assembly_id")
    if not asm_id:
        return err("assembly_id required")

    # снимаем всё дерево
    cur.execute(f"""
        SELECT * FROM {S}.assembly_nodes WHERE assembly_id=%s ORDER BY sort_order, id
    """, (asm_id,))
    nodes = [dict(r) for r in cur.fetchall()]

    cur.execute(f"""
        INSERT INTO {S}.assembly_snapshots (assembly_id, revision, snapshot_json, comment, author_id)
        VALUES (%s, %s, %s, %s, %s) RETURNING id, revision, created_at
    """, (
        asm_id,
        body.get("revision","snap"),
        json.dumps(nodes, default=str),
        body.get("comment"),
        body.get("author_id"),
    ))
    row = cur.fetchone()
    conn.commit()
    return ok(dict(row), 201)


def _list_snapshots(cur, asm_id):
    cur.execute(f"""
        SELECT id, assembly_id, revision, comment, author_id, created_at
        FROM {S}.assembly_snapshots
        WHERE assembly_id=%s ORDER BY created_at DESC
    """, (asm_id,))
    return ok(cur.fetchall())


# ─────────────────────────────────────────────────────────────────
# PARTS LIST (для связки узла с CAD-деталью)
# ─────────────────────────────────────────────────────────────────

def _parts_list(cur, company_id):
    cur.execute(f"""
        SELECT id, code, name, material, version, status
        FROM {S}.parts
        ORDER BY name
        LIMIT 300
    """)
    return ok(cur.fetchall())
