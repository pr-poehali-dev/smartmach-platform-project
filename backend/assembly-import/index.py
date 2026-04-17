"""
Assembly Import API — импорт спецификации из Excel/CSV в дерево сборки.

POST ?resource=parse   — разобрать файл, вернуть превью строк (без записи в БД)
POST ?resource=import  — записать строки в БД как узлы сборки
GET  ?resource=template — скачать CSV-шаблон

Поддерживаемые форматы колонок (умный маппинг заголовков):
  - Позиция / Pos / Position / №
  - Обозначение / Code / Код / Артикул / Designation
  - Наименование / Name / Название / Description / Наимен
  - Кол-во / Qty / Quantity / Количество
  - Ед.изм / Unit / Ед / Units
  - Материал / Material / Марка
  - Масса / Weight / Масса ед / Weight kg / Вес
  - Габариты / Dimensions / Размер
  - Тип / Type / Вид
  - Примечание / Notes / Note / Примеч
  - ГОСТ / Standard / Стандарт
  - Термообработка / Heat treatment
  - Поставщик / Supplier
"""
import base64
import io
import json
import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}
S = "t_p45794133_smartmach_platform_p"

# ── Маппинг заголовков Excel → поля БД ─────────────────────────
HEADER_MAP = {
    # position / pos_number
    "позиция": "path", "поз": "path", "pos": "path", "position": "path",
    "№": "path", "n": "path", "no": "path",
    # code
    "обозначение": "code", "код": "code", "code": "code", "артикул": "code",
    "designation": "code", "децимальный номер": "code", "децим": "code",
    # name
    "наименование": "name", "название": "name", "name": "name",
    "description": "name", "наимен": "name", "изделие": "name",
    # qty
    "кол-во": "qty", "количество": "qty", "qty": "qty", "quantity": "qty",
    "кол": "qty", "amount": "qty",
    # unit
    "ед.изм": "unit", "ед": "unit", "unit": "unit", "units": "unit",
    "единица": "unit", "ед изм": "unit",
    # material
    "материал": "material", "material": "material", "марка": "material",
    "марка материала": "material",
    # weight
    "масса ед": "weight_kg", "масса": "weight_kg", "weight": "weight_kg",
    "weight kg": "weight_kg", "вес": "weight_kg", "масса кг": "weight_kg",
    "кг": "weight_kg",
    # dimensions
    "габариты": "dimensions", "размер": "dimensions", "dimensions": "dimensions",
    "размеры": "dimensions", "gabarits": "dimensions",
    # node_type
    "тип": "node_type", "type": "node_type", "вид": "node_type",
    "тип позиции": "node_type",
    # notes
    "примечание": "notes", "примеч": "notes", "notes": "notes", "note": "notes",
    "комментарий": "notes",
    # standard_ref
    "гост": "standard_ref", "standard": "standard_ref", "стандарт": "standard_ref",
    "обозначение гост": "standard_ref",
    # heat_treatment
    "термообработка": "heat_treatment", "heat treatment": "heat_treatment",
    "тто": "heat_treatment",
    # surface_finish
    "шероховатость": "surface_finish", "ra": "surface_finish",
    # supplier
    "поставщик": "supplier", "supplier": "supplier", "производитель": "supplier",
}

# Маппинг типов узлов из Excel
NODE_TYPE_MAP = {
    "сб": "assembly", "сб.ед": "assembly", "сборочная": "assembly",
    "assembly": "assembly", "узел": "assembly", "unit": "assembly",
    "дет": "part", "деталь": "part", "part": "part",
    "стандарт": "standard", "станд": "standard", "standard": "standard",
    "гост": "standard", "крепеж": "fastener", "крепёж": "fastener",
    "fastener": "fastener", "метиз": "fastener",
    "покупное": "purchased", "покупн": "purchased", "purchased": "purchased",
    "материал": "material", "material": "material", "мат": "material",
}

CSV_TEMPLATE = """Позиция,Обозначение,Наименование,Кол-во,Ед.изм,Материал,Масса ед,Габариты,Тип,Примечание,ГОСТ
1,РЦ-250-100,Корпус редуктора,1,сб.ед.,,28.5,,сб.,Сборочная единица,
1.1,РЦ-250-101,Корпус нижний,1,шт,СЧ25,18.2,380×240×190,дет.,,ГОСТ 1412
1.2,РЦ-250-102,Крышка корпуса,1,шт,СЧ25,9.8,380×240×80,дет.,,
2,РЦ-250-200,Передача быстроходная,1,сб.ед.,,12.3,,сб.,,
2.1,РЦ-250-201,Вал быстроходный,1,шт,40Х,3.2,Ø65×380,дет.,,
3,,Болт М10×40 ГОСТ 7798,8,шт,Ст5,0.026,,крепёж,,ГОСТ 7798-70
4,,Масло И-Г-А-46,2.5,л,,,,,материал,ГОСТ 17479.4,
"""


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
    """Assembly Import — импорт спецификации из Excel/CSV."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method   = event.get("httpMethod", "GET")
    qs       = event.get("queryStringParameters") or {}
    resource = qs.get("resource", "parse")
    sid      = (event.get("headers") or {}).get("X-Session-Id") or qs.get("sid") or ""

    # ── Шаблон CSV ────────────────────────────────────────────────
    if resource == "template":
        return {
            "statusCode": 200,
            "headers": {
                **CORS,
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="assembly_template.csv"',
            },
            "body": CSV_TEMPLATE,
        }

    body_raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        body_raw = base64.b64decode(body_raw).decode("utf-8", errors="replace")
    try:
        body = json.loads(body_raw)
    except Exception:
        return err("Ожидается JSON с полем file_b64 (base64-контент файла)")

    # ── Парсинг файла ─────────────────────────────────────────────
    if resource == "parse":
        file_b64  = body.get("file_b64")
        file_name = body.get("file_name", "file.csv")
        if not file_b64:
            return err("Поле file_b64 обязательно")
        rows, warnings = parse_file(file_b64, file_name)
        return ok({"rows": rows, "warnings": warnings, "total": len(rows)})

    # ── Импорт в БД ───────────────────────────────────────────────
    if resource == "import":
        assembly_id = body.get("assembly_id")
        rows        = body.get("rows")  # уже разобранные строки (из parse)
        replace     = body.get("replace", False)  # очистить дерево перед импортом?

        if not assembly_id or not rows:
            return err("Нужны assembly_id и rows")

        conn = db()
        cur  = conn.cursor()
        company_id = get_company(cur, sid)

        # проверяем права на сборку
        cur.execute(
            f"SELECT id FROM {S}.assemblies WHERE id=%s AND (company_id=%s OR company_id IS NULL)",
            (assembly_id, company_id)
        )
        if not cur.fetchone():
            return err("Сборка не найдена или нет доступа", 404)

        try:
            if replace:
                cur.execute(
                    f"UPDATE {S}.assembly_nodes SET parent_id=NULL WHERE assembly_id=%s",
                    (assembly_id,)
                )
                cur.execute(
                    f"DELETE FROM {S}.assembly_nodes WHERE assembly_id=%s",
                    (assembly_id,)
                )

            created = import_rows(cur, assembly_id, rows)
            conn.commit()
            return ok({"created": created, "assembly_id": assembly_id})

        except Exception as e:
            conn.rollback()
            return err(str(e), 500)
        finally:
            conn.close()

    return err("unknown resource", 404)


# ─────────────────────────────────────────────────────────────────
# ПАРСЕР ФАЙЛА
# ─────────────────────────────────────────────────────────────────

def parse_file(file_b64: str, file_name: str):
    """Определяет формат и парсит файл. Возвращает (rows, warnings)."""
    raw = base64.b64decode(file_b64)
    ext = file_name.rsplit(".", 1)[-1].lower()

    if ext in ("xlsx", "xls", "ods"):
        return parse_excel(raw, ext)
    else:
        # CSV или txt
        text = raw.decode("utf-8-sig", errors="replace")
        return parse_csv(text)


def detect_delimiter(text: str) -> str:
    """Определяет разделитель CSV: ; или ,"""
    first = text.split("\n")[0] if "\n" in text else text
    return ";" if first.count(";") >= first.count(",") else ","


def normalize_header(h: str) -> str:
    """Нормализует заголовок для маппинга."""
    return re.sub(r"[^\w\s]", "", h.strip().lower()).strip()


def map_headers(headers: list) -> dict:
    """Маппит заголовки Excel → поля БД. Возвращает {col_index: field_name}."""
    result = {}
    for i, h in enumerate(headers):
        norm = normalize_header(h)
        # точное совпадение
        if norm in HEADER_MAP:
            result[i] = HEADER_MAP[norm]
            continue
        # частичное совпадение (ищем по contains)
        for key, field in HEADER_MAP.items():
            if key in norm or norm in key:
                result[i] = field
                break
    return result


def detect_node_type(val: str) -> str:
    """Определяет тип узла по значению в ячейке."""
    v = re.sub(r"[^\w]", "", val.strip().lower())
    for key, nt in NODE_TYPE_MAP.items():
        k = re.sub(r"[^\w]", "", key.lower())
        if k in v or v in k:
            return nt
    # автоопределение по пути: если дробный → деталь, иначе → assembly
    return "part"


def auto_node_type(path: str, code: str, name: str) -> str:
    """Автоопределение типа если колонка Type не заполнена."""
    nm = (name + " " + code).lower()
    # стандартные изделия
    if re.search(r"\bгост\b|\bост\b|\bdin\b|\biso\b", nm):
        if re.search(r"\bболт\b|\bгайка\b|\bшайба\b|\bшпилька\b|\bвинт\b|\bшуруп\b|\bзаклепка\b", nm):
            return "fastener"
        return "standard"
    if re.search(r"\bмасло\b|\bсмазка\b|\bклей\b|\bгерметик\b|\bлак\b|\bкраска\b", nm):
        return "material"
    if re.search(r"\bподшипник\b|\bсальник\b|\bманжет\b|\bкольцо\b.*\bрезин\b", nm):
        return "standard"
    # по пути: если есть точка → деталь, иначе assembly
    if "." in str(path):
        return "part"
    return "assembly"


def row_to_node(mapping: dict, cells: list, warnings: list, row_idx: int) -> dict | None:
    """Конвертирует строку Excel в словарь-узел."""
    node = {
        "path": "", "code": "", "name": "", "qty": 1, "unit": "шт",
        "material": None, "weight_kg": None, "total_weight_kg": None,
        "dimensions": None, "node_type": None, "notes": None,
        "standard_ref": None, "heat_treatment": None, "surface_finish": None,
        "supplier": None, "status": "draft",
    }

    for col_idx, field in mapping.items():
        if col_idx >= len(cells):
            continue
        val = str(cells[col_idx]).strip() if cells[col_idx] is not None else ""
        if val in ("", "None", "nan", "NaN", "-"):
            continue

        if field == "qty":
            try:
                node["qty"] = float(val.replace(",", "."))
            except ValueError:
                warnings.append(f"Строка {row_idx}: не удалось прочитать количество '{val}'")
        elif field == "weight_kg":
            try:
                node["weight_kg"] = float(val.replace(",", "."))
            except ValueError:
                pass
        elif field == "node_type":
            node["node_type"] = detect_node_type(val)
        else:
            node[field] = val

    # Пропускаем строки без имени
    if not node["name"]:
        return None

    # Автозаполнение кода если пусто
    if not node["code"]:
        node["code"] = f"POS-{node['path']}" if node["path"] else "—"

    # Автоопределение типа
    if not node["node_type"]:
        node["node_type"] = auto_node_type(node["path"], node["code"], node["name"])

    # Суммарная масса
    if node["weight_kg"] is not None:
        try:
            node["total_weight_kg"] = round(float(node["weight_kg"]) * float(node["qty"]), 6)
        except Exception:
            pass

    return node


def parse_csv(text: str):
    import csv
    warnings = []
    delimiter = detect_delimiter(text)
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    rows_raw = list(reader)

    if not rows_raw:
        return [], ["Файл пустой"]

    # ищем строку заголовков (первую непустую)
    header_row_idx = 0
    for i, row in enumerate(rows_raw):
        if any(c.strip() for c in row):
            header_row_idx = i
            break

    headers = rows_raw[header_row_idx]
    mapping = map_headers(headers)

    if not mapping:
        warnings.append("Не удалось определить колонки. Используется позиционный маппинг.")
        mapping = {0: "path", 1: "code", 2: "name", 3: "qty", 4: "unit", 5: "material", 6: "weight_kg"}

    nodes = []
    for i, row in enumerate(rows_raw[header_row_idx + 1:], start=header_row_idx + 2):
        if not any(c.strip() for c in row):
            continue
        node = row_to_node(mapping, row, warnings, i)
        if node:
            nodes.append(node)

    return nodes, warnings


def parse_excel(raw: bytes, ext: str):
    import openpyxl
    warnings = []
    wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    ws = wb.active

    rows_raw = []
    for row in ws.iter_rows(values_only=True):
        rows_raw.append(list(row))

    wb.close()

    if not rows_raw:
        return [], ["Файл пустой"]

    # ищем строку заголовков — первую строку где есть текстовые ячейки
    header_row_idx = 0
    for i, row in enumerate(rows_raw):
        if any(isinstance(c, str) and c.strip() for c in row):
            header_row_idx = i
            break

    headers = [str(c) if c is not None else "" for c in rows_raw[header_row_idx]]
    mapping = map_headers(headers)

    if not mapping:
        warnings.append("Не удалось определить колонки. Используется позиционный маппинг.")
        mapping = {0: "path", 1: "code", 2: "name", 3: "qty", 4: "unit", 5: "material", 6: "weight_kg"}

    nodes = []
    for i, row in enumerate(rows_raw[header_row_idx + 1:], start=header_row_idx + 2):
        if not any(c is not None and str(c).strip() for c in row):
            continue
        cells = [str(c) if c is not None else "" for c in row]
        node = row_to_node(mapping, cells, warnings, i)
        if node:
            nodes.append(node)

    return nodes, warnings


# ─────────────────────────────────────────────────────────────────
# ИМПОРТ В БД
# ─────────────────────────────────────────────────────────────────

def import_rows(cur, assembly_id: int, rows: list) -> int:
    """
    Импортирует строки в assembly_nodes.
    Строит иерархию через поле path ("1", "1.1", "1.1.2" и т.д.)
    """
    # path → id для построения parent_id
    path_to_id: dict[str, int] = {}
    created = 0

    for idx, row in enumerate(rows):
        path       = str(row.get("path") or "").strip()
        parent_path = _parent_path(path)
        parent_id  = path_to_id.get(parent_path) if parent_path else None

        # position_no из последней части пути
        try:
            pos_no = int(path.split(".")[-1]) if path else idx + 1
        except ValueError:
            pos_no = idx + 1

        node_type = row.get("node_type") or "part"
        if node_type not in ("assembly", "part", "standard", "material", "purchased", "fastener"):
            node_type = "part"

        cur.execute(f"""
            INSERT INTO {S}.assembly_nodes
              (assembly_id, parent_id, path, position_no, sort_order,
               node_type, code, name, revision, qty, unit,
               material, weight_kg, total_weight_kg,
               dimensions, heat_treatment, surface_finish,
               standard_ref, notes, supplier, status)
            VALUES
              (%s,%s,%s,%s,%s,
               %s,%s,%s,'A',%s,%s,
               %s,%s,%s,
               %s,%s,%s,
               %s,%s,%s,%s)
            RETURNING id
        """, (
            assembly_id,
            parent_id,
            path,
            pos_no,
            (idx + 1) * 10,
            node_type,
            row.get("code") or f"POS-{path}",
            row.get("name") or "—",
            float(row.get("qty") or 1),
            row.get("unit") or "шт",
            row.get("material") or None,
            float(row["weight_kg"]) if row.get("weight_kg") not in (None, "", "None") else None,
            float(row["total_weight_kg"]) if row.get("total_weight_kg") not in (None, "", "None") else None,
            row.get("dimensions") or None,
            row.get("heat_treatment") or None,
            row.get("surface_finish") or None,
            row.get("standard_ref") or None,
            row.get("notes") or None,
            row.get("supplier") or None,
            "draft",
        ))
        new_id = cur.fetchone()["id"]
        if path:
            path_to_id[path] = new_id
        created += 1

    return created


def _parent_path(path: str) -> str | None:
    """Для пути '1.2.3' вернёт '1.2', для '1' вернёт None."""
    if not path or "." not in path:
        return None
    return path.rsplit(".", 1)[0]
