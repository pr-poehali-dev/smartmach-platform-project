"""
Projects API — управление проектами (аналог Advanta).

GET  ?resource=list            — список проектов компании
GET  ?resource=one&id=N        — проект + задачи + бюджет + участники
GET  ?resource=tasks&project_id=N — задачи проекта
GET  ?resource=employees       — список сотрудников для выбора
GET  ?resource=dashboard       — сводные KPI по всем проектам

POST ?resource=project         — создать проект
POST ?resource=task            — создать задачу
POST ?resource=budget_item     — добавить статью бюджета
POST ?resource=member          — добавить участника

PUT  ?resource=project&id=N    — обновить проект
PUT  ?resource=task&id=N       — обновить задачу
PUT  ?resource=budget_item&id=N — обновить статью
PUT  ?resource=task_status&id=N — быстрое изменение статуса задачи
"""
import json, os
import psycopg2
from psycopg2.extras import RealDictCursor

S = "t_p45794133_smartmach_platform_p"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

STATUS_LABELS = {
    "planning": "Планирование", "active": "Активный",
    "paused": "Приостановлен", "completed": "Завершён", "cancelled": "Отменён",
}
PRIORITY_LABELS = {
    "low": "Низкий", "medium": "Средний", "high": "Высокий", "critical": "Критический",
}
TASK_STATUS_LABELS = {
    "todo": "К выполнению", "in_progress": "В работе",
    "review": "На проверке", "done": "Готово", "cancelled": "Отменена",
}
BUDGET_CATEGORIES = {
    "materials": "Материалы", "labor": "Трудозатраты",
    "equipment": "Оборудование", "services": "Услуги", "other": "Прочее",
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
        f"SELECT company_id FROM {S}.sessions WHERE id=%s AND expires_at>now() LIMIT 1", (sid,)
    )
    row = cur.fetchone()
    return row["company_id"] if row else None


def handler(event: dict, context) -> dict:
    """Projects API — полный CRUD проектов, задач и бюджетов."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method   = event.get("httpMethod", "GET")
    qs       = event.get("queryStringParameters") or {}
    resource = qs.get("resource", "list")
    sid      = (event.get("headers") or {}).get("X-Session-Id") or qs.get("sid") or ""

    body = {}
    if method in ("POST", "PUT"):
        raw = event.get("body") or ""
        try:
            body = json.loads(raw)
        except Exception:
            body = {}

    conn = db()
    cur  = conn.cursor()
    company_id = get_company(cur, sid)

    # ── Сотрудники ───────────────────────────────────────────────
    if resource == "employees":
        cur.execute(
            f"SELECT id, full_name, position, department FROM {S}.employees "
            f"WHERE company_id=%s AND status!='fired' ORDER BY full_name", (company_id,)
        )
        return ok(cur.fetchall())

    # ── Сводный дашборд ──────────────────────────────────────────
    if resource == "dashboard":
        cur.execute(f"""
            SELECT
                COUNT(*) FILTER (WHERE status='active')    as active_count,
                COUNT(*) FILTER (WHERE status='planning')  as planning_count,
                COUNT(*) FILTER (WHERE status='completed') as completed_count,
                COUNT(*) FILTER (WHERE status='paused')    as paused_count,
                COUNT(*) FILTER (WHERE status='cancelled') as cancelled_count,
                COUNT(*)                                    as total_count,
                COALESCE(SUM(budget_plan),0)               as total_budget_plan,
                COALESCE(SUM(budget_fact),0)               as total_budget_fact,
                COALESCE(AVG(progress_pct),0)              as avg_progress,
                COUNT(*) FILTER (WHERE end_date < now() AND status NOT IN ('completed','cancelled')) as overdue_count
            FROM {S}.projects WHERE company_id=%s
        """, (company_id,))
        stats = dict(cur.fetchone())

        # Задачи — статистика
        cur.execute(f"""
            SELECT
                COUNT(*) FILTER (WHERE t.status='in_progress') as tasks_in_progress,
                COUNT(*) FILTER (WHERE t.status='todo')        as tasks_todo,
                COUNT(*) FILTER (WHERE t.status='done')        as tasks_done,
                COUNT(*) FILTER (WHERE t.due_date < now() AND t.status NOT IN ('done','cancelled')) as tasks_overdue
            FROM {S}.project_tasks t
            JOIN {S}.projects p ON p.id=t.project_id
            WHERE p.company_id=%s
        """, (company_id,))
        task_stats = dict(cur.fetchone())

        # Топ-5 проектов
        cur.execute(f"""
            SELECT p.id, p.name, p.status, p.priority, p.progress_pct,
                   p.budget_plan, p.budget_fact, p.end_date,
                   e.full_name as manager_name
            FROM {S}.projects p
            LEFT JOIN {S}.employees e ON e.id=p.manager_id
            WHERE p.company_id=%s
            ORDER BY p.updated_at DESC LIMIT 5
        """, (company_id,))
        recent = [dict(r) for r in cur.fetchall()]

        conn.close()
        return ok({**stats, **task_stats, "recent_projects": recent})

    # ── Список проектов ──────────────────────────────────────────
    if resource == "list":
        cur.execute(f"""
            SELECT p.id, p.name, p.code, p.status, p.priority, p.stage,
                   p.category, p.start_date, p.end_date, p.actual_end,
                   p.budget_plan, p.budget_fact, p.progress_pct,
                   p.customer, p.notes, p.created_at, p.updated_at,
                   e.full_name as manager_name, e.position as manager_position,
                   (SELECT COUNT(*) FROM {S}.project_tasks t WHERE t.project_id=p.id) as task_count,
                   (SELECT COUNT(*) FROM {S}.project_tasks t WHERE t.project_id=p.id AND t.status='done') as task_done,
                   (SELECT COUNT(*) FROM {S}.project_members m WHERE m.project_id=p.id) as member_count
            FROM {S}.projects p
            LEFT JOIN {S}.employees e ON e.id=p.manager_id
            WHERE p.company_id=%s
            ORDER BY
                CASE p.status WHEN 'active' THEN 0 WHEN 'planning' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,
                CASE p.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                p.updated_at DESC
        """, (company_id,))
        return ok([dict(r) for r in cur.fetchall()])

    # ── Один проект (полный) ─────────────────────────────────────
    if resource == "one":
        pid = qs.get("id")
        if not pid:
            return err("id обязателен")

        cur.execute(f"""
            SELECT p.*, e.full_name as manager_name, e.position as manager_position
            FROM {S}.projects p
            LEFT JOIN {S}.employees e ON e.id=p.manager_id
            WHERE p.id=%s AND p.company_id=%s
        """, (pid, company_id))
        proj = cur.fetchone()
        if not proj:
            return err("Проект не найден", 404)

        cur.execute(f"""
            SELECT t.*, e.full_name as assignee_name
            FROM {S}.project_tasks t
            LEFT JOIN {S}.employees e ON e.id=t.assignee_id
            WHERE t.project_id=%s
            ORDER BY t.parent_id NULLS FIRST, t.sort_order, t.id
        """, (pid,))
        tasks = [dict(r) for r in cur.fetchall()]

        cur.execute(
            f"SELECT * FROM {S}.project_budgets WHERE project_id=%s ORDER BY category, id",
            (pid,)
        )
        budgets = [dict(r) for r in cur.fetchall()]

        cur.execute(f"""
            SELECT m.*, e.full_name, e.position, e.department
            FROM {S}.project_members m
            JOIN {S}.employees e ON e.id=m.employee_id
            WHERE m.project_id=%s
        """, (pid,))
        members = [dict(r) for r in cur.fetchall()]

        conn.close()
        return ok({**dict(proj), "tasks": tasks, "budgets": budgets, "members": members})

    # ── Задачи проекта ───────────────────────────────────────────
    if resource == "tasks":
        pid = qs.get("project_id")
        if not pid:
            return err("project_id обязателен")
        cur.execute(f"""
            SELECT t.*, e.full_name as assignee_name
            FROM {S}.project_tasks t
            LEFT JOIN {S}.employees e ON e.id=t.assignee_id
            WHERE t.project_id=%s
            ORDER BY t.parent_id NULLS FIRST, t.sort_order, t.id
        """, (pid,))
        conn.close()
        return ok([dict(r) for r in cur.fetchall()])

    # ── POST: создать проект ─────────────────────────────────────
    if method == "POST" and resource == "project":
        name = body.get("name", "").strip()
        if not name:
            return err("name обязателен")
        cur.execute(f"""
            INSERT INTO {S}.projects
              (company_id, name, code, description, status, priority, stage,
               category, start_date, end_date, budget_plan, manager_id, customer, notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
        """, (
            company_id,
            name,
            body.get("code", ""),
            body.get("description"),
            body.get("status", "planning"),
            body.get("priority", "medium"),
            body.get("stage", "initiation"),
            body.get("category"),
            body.get("start_date") or None,
            body.get("end_date") or None,
            float(body.get("budget_plan") or 0),
            body.get("manager_id") or None,
            body.get("customer"),
            body.get("notes"),
        ))
        row = dict(cur.fetchone())
        conn.commit()
        conn.close()
        return ok(row, 201)

    # ── PUT: обновить проект ─────────────────────────────────────
    if method == "PUT" and resource == "project":
        pid = qs.get("id")
        if not pid:
            return err("id обязателен")
        allowed = ["name","code","description","status","priority","stage","category",
                   "start_date","end_date","actual_end","budget_plan","budget_fact",
                   "progress_pct","manager_id","customer","notes"]
        sets, vals = [], []
        for k in allowed:
            if k in body:
                sets.append(f"{k}=%s")
                v = body[k]
                if v == "":
                    v = None
                vals.append(v)
        if not sets:
            return err("Нет полей для обновления")
        vals += [pid, company_id]
        cur.execute(
            f"UPDATE {S}.projects SET {', '.join(sets)}, updated_at=now() "
            f"WHERE id=%s AND company_id=%s RETURNING *", vals
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return ok(dict(row) if row else {})

    # ── POST: создать задачу ─────────────────────────────────────
    if method == "POST" and resource == "task":
        pid = body.get("project_id")
        name = (body.get("name") or "").strip()
        if not pid or not name:
            return err("project_id и name обязательны")

        cur.execute(
            f"SELECT MAX(sort_order) as mx FROM {S}.project_tasks WHERE project_id=%s", (pid,)
        )
        mx = cur.fetchone()["mx"] or 0

        cur.execute(f"""
            INSERT INTO {S}.project_tasks
              (project_id, parent_id, name, description, status, priority,
               assignee_id, start_date, due_date, estimated_h, sort_order)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
        """, (
            pid,
            body.get("parent_id") or None,
            name,
            body.get("description"),
            body.get("status", "todo"),
            body.get("priority", "medium"),
            body.get("assignee_id") or None,
            body.get("start_date") or None,
            body.get("due_date") or None,
            float(body.get("estimated_h") or 0),
            mx + 10,
        ))
        row = dict(cur.fetchone())
        conn.commit()
        conn.close()
        return ok(row, 201)

    # ── PUT: обновить задачу ─────────────────────────────────────
    if method == "PUT" and resource == "task":
        tid = qs.get("id")
        if not tid:
            return err("id обязателен")
        allowed = ["name","description","status","priority","assignee_id",
                   "start_date","due_date","done_date","estimated_h","spent_h","progress_pct","sort_order"]
        sets, vals = [], []
        for k in allowed:
            if k in body:
                sets.append(f"{k}=%s")
                v = body[k]
                if v == "":
                    v = None
                vals.append(v)
        if not sets:
            return err("Нет полей для обновления")
        # Автоматически ставим done_date если status→done
        if "status" in body and body["status"] == "done" and "done_date" not in body:
            sets.append("done_date=now()")
        vals.append(tid)
        cur.execute(
            f"UPDATE {S}.project_tasks SET {', '.join(sets)}, updated_at=now() WHERE id=%s RETURNING *",
            vals
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return ok(dict(row) if row else {})

    # ── POST: статья бюджета ─────────────────────────────────────
    if method == "POST" and resource == "budget_item":
        pid  = body.get("project_id")
        name = (body.get("name") or "").strip()
        if not pid or not name:
            return err("project_id и name обязательны")
        cur.execute(f"""
            INSERT INTO {S}.project_budgets (project_id, category, name, plan, fact, note)
            VALUES (%s,%s,%s,%s,%s,%s) RETURNING *
        """, (
            pid,
            body.get("category", "other"),
            name,
            float(body.get("plan") or 0),
            float(body.get("fact") or 0),
            body.get("note"),
        ))
        row = dict(cur.fetchone())
        # Пересчитываем budget_fact в проекте
        cur.execute(
            f"UPDATE {S}.projects SET budget_fact=(SELECT COALESCE(SUM(fact),0) FROM {S}.project_budgets WHERE project_id=%s), updated_at=now() WHERE id=%s",
            (pid, pid)
        )
        conn.commit()
        conn.close()
        return ok(row, 201)

    # ── PUT: обновить статью бюджета ─────────────────────────────
    if method == "PUT" and resource == "budget_item":
        bid = qs.get("id")
        if not bid:
            return err("id обязателен")
        allowed = ["category","name","plan","fact","note"]
        sets, vals = [], []
        for k in allowed:
            if k in body:
                sets.append(f"{k}=%s")
                vals.append(body[k] if body[k] != "" else None)
        if not sets:
            return err("Нет полей для обновления")
        vals.append(bid)
        cur.execute(
            f"UPDATE {S}.project_budgets SET {', '.join(sets)} WHERE id=%s RETURNING *", vals
        )
        row = dict(cur.fetchone())
        pid = row["project_id"]
        cur.execute(
            f"UPDATE {S}.projects SET budget_fact=(SELECT COALESCE(SUM(fact),0) FROM {S}.project_budgets WHERE project_id=%s), updated_at=now() WHERE id=%s",
            (pid, pid)
        )
        conn.commit()
        conn.close()
        return ok(row)

    # ── POST: участник проекта ───────────────────────────────────
    if method == "POST" and resource == "member":
        pid = body.get("project_id")
        eid = body.get("employee_id")
        if not pid or not eid:
            return err("project_id и employee_id обязательны")
        cur.execute(
            f"INSERT INTO {S}.project_members (project_id, employee_id, role) "
            f"VALUES (%s,%s,%s) ON CONFLICT (project_id,employee_id) DO UPDATE SET role=%s RETURNING *",
            (pid, eid, body.get("role","member"), body.get("role","member"))
        )
        row = dict(cur.fetchone())
        conn.commit()
        conn.close()
        return ok(row, 201)

    conn.close()
    return err("unknown resource", 404)
