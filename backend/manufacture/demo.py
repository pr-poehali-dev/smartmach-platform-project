"""
«Заполнить примером» — загружает в компанию правдоподобный пример производства:
изделие «Редуктор цилиндрический Ц2-100», детали, станки, CAM-программы,
задания, расчёты и полную техкарту вала с переходами и нормами времени.
Все записи помечаются is_demo=true и удаляются одной командой.
"""
import psycopg2
import techcard

S = "t_p45794133_smartmach_platform_p"

PARTS = [
    ("Ц2-100.01.001", "Вал тихоходный",       "Сталь 45 ГОСТ 1050-2013", "Валы",     "∅45×320", 3.85, "ok"),
    ("Ц2-100.01.002", "Вал-шестерня быстроходный", "Сталь 40Х ГОСТ 4543-2016", "Валы", "∅40×260", 2.10, "ok"),
    ("Ц2-100.02.001", "Колесо зубчатое m=2 z=78", "Сталь 40Х ГОСТ 4543-2016", "Зубчатые колёса", "∅160×40", 4.60, "warn"),
    ("Ц2-100.03.001", "Корпус редуктора",     "СЧ20 ГОСТ 1412-85",       "Корпуса",  "380×220×200", 18.4, "ok"),
    ("Ц2-100.03.002", "Крышка подшипника глухая", "СЧ15 ГОСТ 1412-85",   "Крышки",   "∅110×22", 0.62, "ok"),
    ("Ц2-100.04.001", "Втулка дистанционная", "Сталь 20 ГОСТ 1050-2013", "Втулки",   "∅52×18", 0.12, "ok"),
]

EQUIPMENT = [
    ("Токарный станок с ЧПУ", "16А20Ф3", "Токарный", "Красный пролетарий", 2019, 2, "FANUC 0i-TF", "2500 об/мин", "ИН-001"),
    ("Фрезерный обрабатывающий центр", "DMU 50", "Фрезерный", "DMG MORI", 2021, 5, "Siemens 840D sl", "14000 об/мин", "ИН-002"),
    ("Зубофрезерный станок", "5К324А", "Зубообрабатывающий", "Саратовский СЗ", 2012, 3, "Ручное", "500 об/мин", "ИН-003"),
    ("Круглошлифовальный станок", "3М151", "Шлифовальный", "ХСЗ", 2015, 2, "Ручное", "1590 об/мин", "ИН-004"),
    ("Ленточнопильный станок", "Pilous ARG 260", "Отрезной", "Pilous", 2020, 1, "Ручное", "—", "ИН-005"),
]

MACHINES = [
    ("16А20Ф3 №1", "Токарный ЧПУ", "running", 78),
    ("DMU 50", "Фрезерный 5-осевой", "idle", 0),
    ("5К324А", "Зубофрезерный", "running", 54),
    ("3М151", "Круглошлифовальный", "alarm", 0),
]


def has_demo(cur, company_id):
    cur.execute(f"SELECT 1 FROM {S}.products WHERE company_id=%s AND is_demo LIMIT 1", (company_id,))
    return cur.fetchone() is not None


def clear(cur, company_id):
    """Удаляет только пример, реальные данные компании не трогает."""
    c = company_id
    cur.execute(f"""DELETE FROM {S}.tech_steps WHERE operation_id IN (
        SELECT o.id FROM {S}.tech_operations o JOIN {S}.tech_processes t ON t.id=o.process_id
        WHERE t.company_id=%s AND t.is_demo)""", (c,))
    cur.execute(f"""DELETE FROM {S}.tech_operations WHERE process_id IN (
        SELECT id FROM {S}.tech_processes WHERE company_id=%s AND is_demo)""", (c,))
    cur.execute(f"DELETE FROM {S}.tech_processes WHERE company_id=%s AND is_demo", (c,))
    # Собственные техкарты пользователя не удаляем — только отвязываем от данных примера
    cur.execute(f"""UPDATE {S}.tech_operations SET equipment_id=NULL WHERE company_id=%s AND equipment_id IN
        (SELECT id FROM {S}.equipment WHERE company_id=%s AND is_demo)""", (c, c))
    cur.execute(f"""UPDATE {S}.tech_operations SET cam_program_id=NULL WHERE company_id=%s AND cam_program_id IN
        (SELECT id FROM {S}.cnc_programs WHERE company_id=%s AND is_demo)""", (c, c))
    cur.execute(f"""UPDATE {S}.tech_processes SET part_id=NULL WHERE company_id=%s AND part_id IN
        (SELECT id FROM {S}.parts WHERE company_id=%s AND is_demo)""", (c, c))
    cur.execute(f"DELETE FROM {S}.jobs WHERE company_id=%s AND is_demo", (c,))
    cur.execute(f"DELETE FROM {S}.simulations WHERE company_id=%s AND is_demo", (c,))
    cur.execute(f"DELETE FROM {S}.cnc_programs WHERE company_id=%s AND is_demo", (c,))
    cur.execute(f"DELETE FROM {S}.machines WHERE company_id=%s AND is_demo", (c,))
    cur.execute(f"DELETE FROM {S}.equipment WHERE company_id=%s AND is_demo", (c,))
    cur.execute(f"DELETE FROM {S}.parts WHERE company_id=%s AND is_demo", (c,))
    cur.execute(f"DELETE FROM {S}.products WHERE company_id=%s AND is_demo", (c,))


def seed(cur, company_id, user_id):
    c = company_id
    cur.execute(f"""INSERT INTO {S}.products (code, name, description, stage, owner_id, company_id, is_demo)
        VALUES (%s,%s,%s,%s,%s,%s,true) RETURNING id""",
        ("Ц2-100", "Редуктор цилиндрический двухступенчатый Ц2-100",
         "Пример изделия: передаточное число 12,5, крутящий момент 250 Н·м",
         "production", user_id, c))
    product_id = cur.fetchone()["id"]

    part_ids = {}
    for code, name, mat, cat, dims, mass, st in PARTS:
        cur.execute(f"""INSERT INTO {S}.parts (product_id, code, name, material, version, status,
            collisions, author_id, category, dimensions, weight_kg, company_id, is_demo)
            VALUES (%s,%s,%s,%s,'v1.0',%s,%s,%s,%s,%s,%s,%s,true) RETURNING id""",
            (product_id, code, name, mat, st, 1 if st == "warn" else 0, user_id, cat, dims, mass, c))
        part_ids[code] = cur.fetchone()["id"]

    eq_ids = []
    for name, model, typ, man, year, axes, cs, spindle, inv in EQUIPMENT:
        cur.execute(f"""INSERT INTO {S}.equipment (name, model, type, manufacturer, year, axes,
            control_system, spindle_speed, status, location, inventory_number, company_id, is_demo)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'active','Цех №1',%s,%s,true) RETURNING id""",
            (name, model, typ, man, year, axes, cs, spindle, inv, c))
        eq_ids.append(cur.fetchone()["id"])

    m_ids = []
    for name, typ, st, load in MACHINES:
        cur.execute(f"""INSERT INTO {S}.machines (name, type, status, load_pct, operator_id, company_id, is_demo)
            VALUES (%s,%s,%s,%s,%s,%s,true) RETURNING id""", (name, typ, st, load, user_id, c))
        m_ids.append(cur.fetchone()["id"])

    shaft = part_ids["Ц2-100.01.001"]
    gear = part_ids["Ц2-100.02.001"]
    body = part_ids["Ц2-100.03.001"]
    progs = [
        (shaft, m_ids[0], "Вал тихоходный — черновое точение", "O1001", "done", "6 мин"),
        (shaft, m_ids[0], "Вал тихоходный — чистовое точение", "O1002", "running", "8 мин"),
        (shaft, m_ids[1], "Вал тихоходный — шпоночный паз", "O2001", "queue", "4 мин"),
        (body,  m_ids[1], "Корпус — фрезерование плоскости разъёма", "O2101", "review", "1ч 20м"),
    ]
    prog_ids = []
    for part_id, m_id, name, code, st, est in progs:
        cur.execute(f"""INSERT INTO {S}.cnc_programs (part_id, machine_id, name, code, status, est_time,
            author_id, company_id, is_demo) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,true) RETURNING id""",
            (part_id, m_id, name, code, st, est, user_id, c))
        prog_ids.append(cur.fetchone()["id"])

    for part_id, prog, m_id, st, pr, qty, days, note in [
        (shaft, prog_ids[1], m_ids[0], "cnc", "high", 50, 5, "Партия под заказ №2026-114"),
        (gear, None, m_ids[2], "cam", "normal", 50, 9, "Ждёт программу зубофрезерования"),
        (body, prog_ids[3], m_ids[1], "cad", "normal", 20, 14, "Согласование чертежа после замечаний ОТК"),
        (part_ids["Ц2-100.04.001"], None, m_ids[0], "done", "low", 100, -3, "Закрыто"),
    ]:
        cur.execute(f"""INSERT INTO {S}.jobs (product_id, part_id, program_id, machine_id, status, priority,
            qty, assignee_id, due_date, notes, company_id, is_demo)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s, CURRENT_DATE + %s, %s,%s,true)""",
            (product_id, part_id, prog, m_id, st, pr, qty, user_id, days, note, c))

    for part_id, name, typ, st, res, pct in [
        (shaft, "Вал тихоходный — проверка на кручение", "Статический (линейный)", "done",
         "Запас прочности 2,4. Макс. напряжения по Мизесу 148 МПа.", 62),
        (gear, "Колесо — контактная прочность зуба", "Прочностной МКЭ", "review",
         "Контактные напряжения 870 МПа при допускаемых 900 МПа — на границе.", 96),
        (body, "Корпус — собственные частоты", "Модальный (собственные частоты)", "queue", None, None),
    ]:
        cur.execute(f"""INSERT INTO {S}.simulations (part_id, name, sim_type, status, result, stress_pct,
            author_id, company_id, is_demo) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,true)""",
            (part_id, name, typ, st, res, pct, user_id, c))

    # ── Техкарта вала: полный маршрут с переходами и режимами ──────
    cur.execute(f"""INSERT INTO {S}.tech_processes (company_id, part_id, code, name, material,
        blank_type, blank_size, blank_mass, part_mass, batch_size, status, developer, checker,
        author_id, notes, is_demo)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'approved',%s,%s,%s,%s,true) RETURNING id""",
        (c, shaft, "ТП-Ц2-100.01.001", "Технологический процесс механической обработки вала тихоходного",
         "Сталь 45 ГОСТ 1050-2013", "Прокат круглый", "∅50×325 ГОСТ 2590-2006", 5.01, 3.85, 50,
         "Иванов И.И.", "Петров П.П.", user_id, "Пример техкарты", ))
    tp = cur.fetchone()["id"]

    ops = [
        ("005", "Отрезная", eq_ids[4], None, "Тиски станочные", "Резчик на пилах", 2, 1.2, 4, 6, [
            ("Отрезать заготовку в размер 325±1", "Полотно ленточное 27×0,9 Bi-Metal", "Линейка 500", None, None, 0, None, 1, None, None, None, 2.4)]),
        ("010", "Токарная с ЧПУ (черновая)", eq_ids[0], prog_ids[0], "Патрон 3-кулачковый, центр вращ.", "Оператор станков с ПУ", 4, 1.8, 8, 18, [
            ("Подрезать торец 1, сверлить центровое отв. A3,15", "Резец проходной PCLNR 2525M12", "ШЦ-I-250-0,05", 50, 25, 2, 2.5, 1, 0.25, 180, None, None),
            ("Точить поверхности ∅46,5 и ∅41,5 предварительно", "Резец проходной PCLNR 2525M12", "ШЦ-I-250-0,05", 50, 210, 3, 2.0, 2, 0.35, 170, None, None),
            ("Переустановить, точить ∅36,5 на L=95", "Резец проходной PCLNR 2525M12", "ШЦ-I-250-0,05", 46.5, 95, 3, 2.5, 2, 0.35, 170, None, None)]),
        ("015", "Токарная с ЧПУ (чистовая)", eq_ids[0], prog_ids[1], "Центры, поводковый патрон", "Оператор станков с ПУ", 4, 1.5, 8, 18, [
            ("Точить ∅45k6 (под шлифовку +0,3), ∅40, ∅35k6 (+0,3)", "Резец контурный SVJBR 2525M16", "Скоба 45k6, 35k6", 45.3, 270, 2, 0.6, 1, 0.12, 240, None, None),
            ("Точить канавки b=3 под выход шлифкруга", "Резец канавочный MGEHR 2525-3", "Шаблон", 45, 6, 1, 1.0, 1, 0.08, 120, None, None),
            ("Точить фаски 1,6×45°", "Резец контурный SVJBR 2525M16", None, 45, 4, 1, 1.6, 1, 0.1, 240, None, None)]),
        ("020", "Фрезерная с ЧПУ", eq_ids[1], prog_ids[2], "Призмы, прихваты", "Оператор станков с ПУ", 4, 2.2, 8, 25, [
            ("Фрезеровать шпоночный паз 14P9 на L=70 глубиной 5,5", "Фреза шпоночная ∅14 HSS-Co", "Калибр-пробка 14P9", 14, 70, 4, 1.4, 4, 0.1, 28, None, None)]),
        ("025", "Термическая", None, None, None, "Термист", 4, 0, 0, 30, [
            ("Улучшение 230…260 HB. Контроль твёрдости", None, "Твердомер ТШ-2М", None, None, 0, None, 1, None, None, None, 45)]),
        ("030", "Круглошлифовальная", eq_ids[3], None, "Центры, хомутик", "Шлифовщик", 4, 1.6, 9, 15, [
            ("Шлифовать ∅45k6 (+0,018/+0,002), Ra 0,8", "Круг 1 600×63×305 25А 40 СМ1", "Скоба рычажная 45k6", 45, 60, 10, 0.15, 6, 1.2, 35, 112, None),
            ("Шлифовать ∅35k6 (+0,018/+0,002), Ra 0,8", "Круг 1 600×63×305 25А 40 СМ1", "Скоба рычажная 35k6", 35, 50, 10, 0.15, 6, 1.2, 35, 112, None)]),
        ("035", "Контрольная", None, None, "Плита поверочная", "Контролёр ОТК", 5, 0, 0, 5, [
            ("Контроль размеров, биения ∅45k6 относительно оси центров ≤0,016", None, "Индикатор ИЧ-10, центра", None, None, 0, None, 1, None, None, None, 4)]),
    ]
    for op_no, name, eq, prog, fixture, prof, rank, t_aux, k, t_pz, steps in ops:
        eq_name = None
        if eq:
            cur.execute(f"SELECT name, model FROM {S}.equipment WHERE id=%s", (eq,))
            r = cur.fetchone()
            eq_name = f"{r['model']} {r['name']}"
        cur.execute(f"""INSERT INTO {S}.tech_operations (process_id, company_id, op_no, name, workshop,
            area, equipment_id, equipment_name, cam_program_id, fixture, profession, worker_rank,
            t_aux, k_service_pct, t_pz, sort)
            VALUES (%s,%s,%s,%s,'01','02',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (tp, c, op_no, name, eq, eq_name, prog, fixture, prof, rank, t_aux, k, t_pz, int(op_no)))
        op_id = cur.fetchone()["id"]
        for i, (desc, tool, meas, d, length, over, depth, passes, feed, speed, spindle, t_manual) in enumerate(steps, 1):
            cur.execute(f"""INSERT INTO {S}.tech_steps (operation_id, company_id, step_no, description,
                tool, measuring_tool, diameter, length, overrun, depth, passes, feed, speed, spindle,
                t_main, manual_time, sort) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (op_id, c, i, desc, tool, meas, d, length, over or 0, depth, passes, feed, speed, spindle,
                 t_manual or 0, t_manual is not None, i))
    techcard.recalc_process(cur, tp)

    return {"product_id": product_id, "parts": len(PARTS), "equipment": len(EQUIPMENT),
            "machines": len(MACHINES), "programs": len(progs), "jobs": 4, "simulations": 3,
            "techcards": 1}


def handle(method, qs, cur, conn, company_id, user_id, ok, err):
    if qs.get("resource") != "demo":
        return None
    if method == "GET":
        return ok({"loaded": has_demo(cur, company_id)})
    if method == "POST":
        if has_demo(cur, company_id):
            return err("Пример уже загружен. Сначала удалите его.", 409)
        result = seed(cur, company_id, user_id)
        conn.commit()
        return ok(result, 201)
    if method == "DELETE":
        try:
            clear(cur, company_id)
        except psycopg2.IntegrityError:
            conn.rollback()
            return err("К данным примера уже привязаны ваши записи (задания, чертежи, сборки). "
                       "Отвяжите их или удалите пример вручную.", 409)
        conn.commit()
        return ok({"ok": True})
    return None