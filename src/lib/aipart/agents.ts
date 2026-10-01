/**
 * ИИ-конструктор и ИИ-технолог.
 * Конструктор: описание → параметрическая модель детали (чертёж строит программа).
 * Технолог: модель + оборудование цеха + партия → маршрутно-операционный техпроцесс.
 * Ответы моделей всегда проходят проверку и нормализацию — в систему не попадает «сырой» ответ.
 */
import { URLS } from "@/lib/api";
import { normalizeModel, type PartModel, type Normalized, totalLength, fmt, num } from "@/lib/aipart/model";
import { gearGeometry, fmtAngle } from "@/lib/aipart/gear";

export const CONSTRUCTOR_MODEL = "openai/gpt-4o";
export const TECHNOLOGIST_MODEL = "openai/gpt-4o";

export const CONSTRUCTOR_PROMPT = `Ты — ведущий инженер-конструктор машиностроительного КБ (ЕСКД; ГОСТ 2.307, 2.308, 2.309; допуски ГОСТ 25347; шпонки ГОСТ 23360).
По описанию детали определи её ПАРАМЕТРИЧЕСКУЮ МОДЕЛЬ. Чертёж по модели построит программа — ты отвечаешь за инженерное содержание: размеры, допуски, шероховатость, материал, технические требования.

Выбери один класс:
- "shaft" — тела вращения, длина больше диаметра: валы, оси, пальцы, штифты, втулки, гильзы (втулка = shaft + bore).
- "disc" — тела вращения, диаметр больше длины: фланцы, крышки, диски, ступицы, шкивы, заготовки колёс, кольца, шайбы.
- "plate" — призматические плоские детали: плиты, пластины, планки, прокладки, накладки.
- "gear" — цилиндрические зубчатые колёса и шестерни внешнего зацепления (прямозубые и косозубые), насаживаемые на вал. Вал-шестерню описывай как "shaft".

Верни ТОЛЬКО JSON без markdown и комментариев:
{
 "kind": "shaft|disc|plate",
 "name": "Вал тихоходный",
 "designation": "СМ.01.001",
 "material": "Сталь 45 ГОСТ 1050-2013",
 "hardness": "235...262 HB" | null,
 "ra_general": 6.3,
 "requirements": ["Неуказанные предельные отклонения размеров: H14, h14, ±IT14/2.", "..."],
 "shaft": {
   "sections": [ {"d": 35, "l": 40, "tol": "k6", "ra": 0.8, "thread": null, "note": "под подшипник"} ],
   "chamfer": 1.6,
   "bore": {"d": 20, "tol": "H7", "l": 0} | null,
   "keyways": [ {"section": 1, "b": 12, "l": 50, "t1": 5, "from": 5} ],
   "center_holes": true
 } | null,
 "disc": {
   "D": 160, "D_tol": "h9", "H": 30,
   "hub": {"d": 80, "h": 55} | null,
   "bore": {"d": 50, "tol": "H7"},  (для глухих крышек и дисков без отверстия — d: 0)
   "holes": {"n": 6, "d": 13.5, "pcd": 130} | null,
   "keyway": {"b": 14, "t2": 3.8} | null,
   "chamfer": 2, "ra_bore": 1.6, "ra_faces": 3.2
 } | null,
 "plate": {
   "L": 200, "W": 120, "H": 20,
   "holes": [ {"x": 20, "y": 20, "d": 11, "thread": null} ],
   "chamfer": 1, "ra_faces": 3.2
 } | null,
 "gear": {
   "m": 2, "z": 78, "beta": 0, "hand": "right|left" | null, "x": 0, "b": 40,
   "accuracy": "8-B", "mate_z": 22 | null, "aw": 100 | null,
   "bore": {"d": 50, "tol": "H7"},
   "keyway": {"b": 14, "t2": 3.8} | null,
   "hub": {"d": 80, "h": 55} | null,
   "web": {"t": 14, "d_rim": 130, "holes": {"n": 6, "d": 18, "pcd": 108} | null} | null,
   "chamfer": 1, "ra_teeth": 1.6, "ra_bore": 1.6
 } | null
}
Заполняй только объект своего класса, остальные — null.

ПРАВИЛА:
1. Ступени вала — слева направо. В keyways "section" — индекс ступени в массиве sections, считая с 0 (проверь: ширина паза должна соответствовать диаметру ЭТОЙ ступени по ГОСТ 23360, а длина — помещаться на ней), "from" — отступ паза от левого торца ступени; l + 2·from ≤ длины ступени. bore.l = 0 — сквозное отверстие.
2. Размеры — из нормальных рядов ГОСТ 6636. Под подшипники качения — k6 (или js6), Ra 0,8; под зубчатые колёса, шкивы, муфты — k6/m6/n6, Ra 1,6; свободные ступени — tol null, ra null. Отверстия под валы — H7, Ra 1,6.
3. Шпоночные пазы — по ГОСТ 23360 для данного диаметра: b, t1 (вал), t2 (ступица); длина из ряда 14…200 и меньше длины ступени.
4. Резьба на ступени: "thread": "М30×1,5-6g" — тогда d = наружный диаметр резьбы.
5. Отверстия плиты: координаты x (вдоль L) и y (вдоль W) от левого верхнего угла; резьбовые — d = диаметр под резьбу, "thread": "М12-7H".
6. Если в описании чего-то нет — прими типовое инженерное решение и отрази его в requirements.
7. requirements — 3–6 пунктов по ГОСТ 2.316: неуказанные предельные отклонения, неуказанные радиусы/фаски, допуски формы и расположения посадочных мест (радиальное биение), покрытие. Твёрдость — только в поле hardness, не дублируй её в requirements.
8. Обозначение — если не задано, придумай в формате "СМ.XX.XXX".
9. Зубчатые колёса: m — из ряда ГОСТ 9563 (1; 1,25; 1,5; 2; 2,5; 3; 4; 5; 6; 8; 10…); z ≥ 17 без смещения; β для косозубых 8–20°; b ≈ (0,2…0,4)·d; степень точности 7-B…9-B (редукторы общего назначения — 8-B); если известна пара — укажи mate_z и aw = m·(z1+z2)/(2·cos β). Колёса с d > 150 мм — с диском (web): толщина диска ≈ 0,3·b, d_rim = d_f − 5m, облегчающие отверстия по желанию. Ступица (hub) d ≈ 1,6·отверстие, длина ≥ b. Материал — стали 40Х, 45, 40ХН; hardness — улучшение 269…302 HB или ТВЧ HRC 45…50.`;

export const TECHNOLOGIST_PROMPT = `Ты — главный технолог машиностроительного завода (ЕСТД, ГОСТ 3.1118, 3.1702; общемашиностроительные нормативы режимов резания и времени).
По параметрической модели детали, программе выпуска и оборудованию цеха разработай маршрутно-операционный техпроцесс механической обработки.

Верни ТОЛЬКО JSON без markdown:
{
 "blank_type": "Прокат круглый ГОСТ 2590-2006",
 "blank_size": "∅55×305",
 "blank_mass": 5.6,
 "ops": [
  {"op_no": "005", "name": "Отрезная", "equipment_id": 3, "equipment_name": "Ленточнопильный станок",
   "fixture": "Тиски станочные", "profession": "Резчик на пилах", "worker_rank": 2,
   "t_aux": 1.2, "t_pz": 6, "k_service_pct": 6,
   "steps": [
     {"description": "Точить поверхность ∅45,6 на L=60 предварительно", "tool": "Резец проходной PCLNR 2525M12 T15K6",
      "measuring_tool": "Штангенциркуль ШЦ-I-250-0,05", "diameter": 50, "length": 60, "overrun": 3,
      "depth": 2.2, "passes": 1, "feed": 0.35, "speed": 160, "t_main": null}
   ]}
 ]
}

ПРАВИЛА:
1. Номера операций 005, 010, 015… Порядок: заготовительная → базирование (торцы, центровые) → черновая → (термообработка «улучшение», если задана твёрдость) → чистовая → фрезерные/сверлильные (пазы, отверстия, резьбы) → шлифование поверхностей Ra ≤ 0,8 → слесарная (притупить кромки) → моечная → контрольная.
2. equipment_id — СТРОГО id из списка оборудования, подходящий по типу. Если подходящего нет — null и типовая модель станка в equipment_name (например «16К20Ф3 Токарный с ЧПУ»).
3. Каждый переход резания — с режимами: diameter (мм: обрабатываемый диаметр; для фрезерования и сверления — диаметр инструмента), length (длина рабочего хода, мм), overrun (врезание + перебег 2–5 мм), depth, passes, feed (мм/об), speed (м/мин), t_main = null — его рассчитает система.
4. Переходы без резания (термообработка, мойка, контроль, слесарная) — diameter/length/feed/speed = null, t_main — норма времени в минутах.
5. Ориентиры режимов (твёрдый сплав, сталь 45/40Х): черновое точение t=2–3, S=0,3–0,5, V=140–180; чистовое t=0,3–1, S=0,1–0,2, V=180–250. Шпоночный паз концевой фрезой HSS: S=0,05–0,12 мм/об, V=20–30, проходы по глубине. Сверление HSS: S=0,15–0,3, V=18–25. Круглое шлифование: V детали 25–40 м/мин, S 0,3–0,6 ширины круга (мм/об), припуск 0,15–0,3, 5–10 проходов. Чугун — V на 30% ниже; алюминий — в 2–3 раза выше; нержавеющая сталь — на 40% ниже.
6. Припуски: под чистовое точение 1–1,5 мм на сторону, под шлифование 0,2–0,3 мм на диаметр. Заготовка — ближайший больший размер сортамента + 2–3 мм на торец.
7. t_aux — вспомогательное время на операцию 0,5–4 мин; t_pz — подготовительно-заключительное 5–30 мин; k_service_pct 6–9.
8. Профессия и разряд — по ЕТКС.
9. Обработай ВСЕ поверхности модели: каждую ступень с допуском и Ra, каждый паз, каждое отверстие и резьбу.
10. Учитывай возможности станков: круглошлифовальный станок шлифует только НАРУЖНЫЕ цилиндрические поверхности тел вращения — не отверстия и не зубья. Отверстия H7 — чистовое растачивание/развёртывание на токарном или внутреннее шлифование (внутришлифовальный станок). Зубья 8-й степени точности и грубее после зубофрезерования не шлифуют.
11. Зубчатые колёса: заготовка — поковка или прокат; токарная обработка с базированием по отверстию (отверстие H7 — растачивание или протягивание, торец за один установ с отверстием для перпендикулярности); долбление/протягивание шпоночного паза в отверстии; зубофрезерование червячной модульной фрезой (ГОСТ 9324) — diameter = диаметр фрезы (63–125 мм), length = ширина венца + врезание, feed — осевая подача на оборот заготовки 1–3 мм/об, speed 25–40 м/мин; для 7-й степени и выше или после закалки — зубошевингование или зубошлифование; снятие фасок на зубьях; термообработка по hardness; контроль длины общей нормали W зубомером/микрометром.`;

/* ── вызов ИИ ────────────────────────────────────────────────────── */

export class AiError extends Error {}

type Fetcher = typeof fetch;

type UserContent = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } })[];

export async function callAi(system: string, user: UserContent, opts: { model: string; maxTokens: number; fetcher?: Fetcher; signal?: AbortSignal }): Promise<string> {
  const f = opts.fetcher ?? fetch;
  const url = URLS["chatgpt-polza-chatgpt"];
  if (!url) throw new AiError("ИИ не подключён к проекту");
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await f(`${url}?action=generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: opts.signal,
        body: JSON.stringify({
          model: opts.model, temperature: 0.2, max_tokens: opts.maxTokens,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.content) return data.content as string;
      lastErr = data.error || `ИИ вернул ошибку ${res.status}`;
      if (res.status === 400 || res.status === 401) break;
    } catch (e) {
      if (opts.signal?.aborted) throw new AiError("Отменено");
      lastErr = e instanceof Error ? e.message : "Сеть недоступна";
    }
  }
  throw new AiError(humanize(lastErr));
}

function humanize(e: string): string {
  if (/timeout|504/i.test(e)) return "ИИ не успел ответить. Попробуйте ещё раз или упростите описание.";
  if (/api key|401|unauthor/i.test(e)) return "Ключ доступа к ИИ не настроен или недействителен.";
  if (/balance|insufficient|402|quota/i.test(e)) return "На счёте ИИ-сервиса закончились средства.";
  return e || "ИИ не ответил";
}

/** Достаёт JSON-объект из ответа (markdown-обёртки, текст до/после) */
export function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : text;
  const a = body.indexOf("{"), b = body.lastIndexOf("}");
  if (a < 0 || b <= a) throw new AiError("ИИ вернул ответ не в том формате");
  const raw = body.slice(a, b + 1);
  try { return JSON.parse(raw); }
  catch {
    try { return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1").replace(/\/\/[^\n]*/g, "")); }
    catch { throw new AiError("ИИ вернул повреждённые данные. Попробуйте ещё раз."); }
  }
}

/* ── ИИ-конструктор ──────────────────────────────────────────────── */

export const SKETCH_PROMPT = `

РАБОТА С ЭСКИЗОМ. К сообщению приложено изображение: эскиз от руки, фото чертежа или распечатки, скриншот из CAD.
1. Определи по изображению тип детали, виды, все проставленные размеры, обозначения диаметров (∅, ø, Ф), резьбы, допуски, шероховатость, надписи.
2. Размеры с эскиза имеют ПРИОРИТЕТ над типовыми решениями. Пропорции линий на эскизе от руки не точны — не измеряй их, а бери числа из размерных надписей. Если размер не проставлен — оцени по пропорции к ближайшему проставленному и укажи это в "sketch.assumed".
3. Текст пользователя (если есть) уточняет или исправляет эскиз и важнее эскиза.
4. Если изображение не является чертежом/эскизом детали или размеры не читаются — всё равно верни модель по тексту, а в "sketch.confidence" укажи "low" и причину в "sketch.issues".
Добавь в ответ объект:
"sketch": {
  "recognized": "что изображено одной фразой",
  "dimensions": ["∅45k6 L=30", "..."],
  "assumed": ["длина ступени 3 оценена по пропорции ≈ 25"],
  "issues": ["неразборчиво: размер у правого торца"],
  "confidence": "high|medium|low"
}`;

export interface SketchReport {
  recognized: string; dimensions: string[]; assumed: string[]; issues: string[];
  confidence: "high" | "medium" | "low";
}

export function normalizeSketch(raw: unknown): SketchReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 30) : []);
  const c = String(r.confidence ?? "").toLowerCase();
  return {
    recognized: String(r.recognized ?? "").trim() || "Деталь",
    dimensions: arr(r.dimensions), assumed: arr(r.assumed), issues: arr(r.issues),
    confidence: c === "high" || c === "low" ? c : "medium",
  };
}

export async function runConstructor(description: string, opts: { fetcher?: Fetcher; signal?: AbortSignal; image?: string } = {}): Promise<Normalized & { sketch: SketchReport | null }> {
  const text = opts.image
    ? `Эскиз детали приложен.${description.trim() ? ` Пояснение пользователя: ${description}` : " Пояснений нет — бери всё с эскиза."}`
    : `Описание детали: ${description}`;
  const user: UserContent = opts.image
    ? [{ type: "text", text }, { type: "image_url", image_url: { url: opts.image, detail: "high" } }]
    : text;
  const answer = await callAi(CONSTRUCTOR_PROMPT + (opts.image ? SKETCH_PROMPT : ""), user,
    { model: CONSTRUCTOR_MODEL, maxTokens: opts.image ? 3500 : 2500, fetcher: opts.fetcher, signal: opts.signal });
  const raw = extractJson(answer) as Record<string, unknown>;
  const norm = normalizeModel(raw);
  return { ...norm, sketch: opts.image ? normalizeSketch(raw.sketch) : null };
}

/* ── ИИ-технолог ─────────────────────────────────────────────────── */

export interface EquipmentRef { id: number; name: string; model: string; type: string }

export interface PlanStep {
  description: string; tool: string | null; measuring_tool: string | null;
  diameter: number | null; length: number | null; overrun: number; depth: number | null;
  passes: number; feed: number | null; speed: number | null; t_main: number | null;
}
export interface PlanOp {
  op_no: string; name: string; equipment_id: number | null; equipment_name: string | null;
  fixture: string | null; profession: string | null; worker_rank: number | null;
  t_aux: number; t_pz: number; k_service_pct: number; steps: PlanStep[];
}
export interface TechPlan { blank_type: string | null; blank_size: string | null; blank_mass: number | null; ops: PlanOp[] }

/** Краткая сводка модели для технолога — меньше токенов, меньше путаницы */
export function modelBrief(m: PartModel): string {
  const lines = [`${m.name} (${m.designation}), материал: ${m.material}${m.hardness ? `, твёрдость ${m.hardness}` : ""}, общая шероховатость Ra ${fmt(m.ra_general)}.`];
  if (m.shaft) {
    const s = m.shaft;
    lines.push(`Вал, общая длина ${fmt(totalLength(s))} мм. Ступени слева направо:`);
    s.sections.forEach((x, i) => lines.push(`  ${i}: ∅${fmt(x.d)}${x.tol ?? ""} L=${fmt(x.l)}${x.ra ? ` Ra ${fmt(x.ra)}` : ""}${x.thread ? ` резьба ${x.thread}` : ""}`));
    s.keyways.forEach((k) => lines.push(`  Шпоночный паз ${fmt(k.b)}P9 на ступени ${k.section}: длина ${fmt(k.l)}, глубина t1=${fmt(k.t1)}`));
    if (s.bore) lines.push(`  Осевое отверстие ∅${fmt(s.bore.d)}${s.bore.tol ?? ""} ${s.bore.l ? `глубиной ${fmt(s.bore.l)}` : "сквозное"}`);
    lines.push(`  Фаски ${fmt(s.chamfer)}×45°${s.center_holes ? ", центровые отверстия" : ""}`);
  }
  if (m.disc) {
    const d = m.disc;
    lines.push(`Диск/фланец ∅${fmt(d.D)}${d.D_tol ?? ""}, толщина ${fmt(d.H)}, отверстие ∅${fmt(d.bore.d)}${d.bore.tol ?? ""} Ra ${fmt(d.ra_bore)}, торцы Ra ${fmt(d.ra_faces)}.`);
    if (d.hub) lines.push(`  Ступица ∅${fmt(d.hub.d)}, общая высота ${fmt(d.hub.h)}`);
    if (d.holes) lines.push(`  ${d.holes.n} отв. ∅${fmt(d.holes.d)} на ∅${fmt(d.holes.pcd)}`);
    if (d.keyway) lines.push(`  Шпоночный паз в отверстии ${fmt(d.keyway.b)}Js9, t2=${fmt(d.keyway.t2)}`);
  }
  if (m.gear) {
    const g = m.gear, geo = gearGeometry(g);
    lines.push(`Колесо зубчатое цилиндрическое: m=${fmt(g.m)}, z=${g.z}, β=${g.beta ? fmtAngle(g.beta) + (g.hand === "left" ? " лев." : " прав.") : "0°"}, x=${fmt(g.x)}, степень точности ${g.accuracy}.`);
    lines.push(`  da=${fmt(geo.da)}, d=${fmt(geo.d)}, df=${fmt(geo.df)}, ширина венца b=${fmt(g.b)}, W=${fmt(geo.W)} (zw=${geo.zw}), зубья Ra ${fmt(g.ra_teeth)}`);
    lines.push(`  Отверстие ∅${fmt(g.bore.d)}${g.bore.tol ?? ""} Ra ${fmt(g.ra_bore)}${g.keyway ? `, шпоночный паз ${fmt(g.keyway.b)}Js9 t2=${fmt(g.keyway.t2)}` : ""}`);
    if (g.hub) lines.push(`  Ступица ∅${fmt(g.hub.d)} длиной ${fmt(g.hub.h)}`);
    if (g.web) lines.push(`  Диск толщиной ${fmt(g.web.t)}, обод изнутри ∅${fmt(g.web.d_rim)}${g.web.holes ? `, ${g.web.holes.n} облегчающих отв. ∅${fmt(g.web.holes.d)}` : ""}`);
  }
  if (m.plate) {
    const p = m.plate;
    lines.push(`Плита ${fmt(p.L)}×${fmt(p.W)}×${fmt(p.H)}, плоскости Ra ${fmt(p.ra_faces)}.`);
    p.holes.forEach((h) => lines.push(`  Отверстие ${h.thread ?? `∅${fmt(h.d)}`} в точке X=${fmt(h.x)}, Y=${fmt(h.y)}`));
  }
  return lines.join("\n");
}

const n = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const x = num(v, NaN);
  return Number.isFinite(x) ? x : null;
};
const s = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function normalizePlan(raw: unknown, equipment: EquipmentRef[]): { plan: TechPlan; warnings: string[] } {
  const w: string[] = [];
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const ids = new Set(equipment.map((e) => e.id));
  const rawOps = Array.isArray(r.ops) ? r.ops : [];
  if (!rawOps.length) throw new AiError("ИИ-технолог не предложил ни одной операции");

  let noNorm = 0;
  const ops: PlanOp[] = rawOps.slice(0, 30).map((x, i) => {
    const o = (x ?? {}) as Record<string, unknown>;
    let eqId = n(o.equipment_id);
    if (eqId !== null && !ids.has(eqId)) {
      w.push(`Операция «${s(o.name) ?? i + 1}»: станок #${eqId} нет в справочнике — привязка снята`);
      eqId = null;
    }
    const eq = equipment.find((e) => e.id === eqId);
    const steps: PlanStep[] = (Array.isArray(o.steps) ? o.steps : []).slice(0, 30).map((y) => {
      const t = (y ?? {}) as Record<string, unknown>;
      const feed = n(t.feed), speed = n(t.speed);
      return {
        description: s(t.description) ?? "Переход",
        tool: s(t.tool), measuring_tool: s(t.measuring_tool),
        diameter: n(t.diameter), length: n(t.length), overrun: n(t.overrun) ?? 0, depth: n(t.depth),
        passes: Math.max(1, Math.round(n(t.passes) ?? 1)),
        feed: feed !== null && feed > 0 && feed < 20 ? feed : null,
        speed: speed !== null && speed > 0 && speed < 2000 ? speed : null,
        t_main: n(t.t_main),
      };
    }).map((st) => {
      // переход без режимов и без нормы — ставим минимальную норму, чтобы он не обнулял время операции
      const computable = st.feed && st.length && (st.speed || st.diameter);
      if (!computable && (st.t_main === null || st.t_main <= 0)) {
        noNorm++;
        return { ...st, t_main: 1 };
      }
      return st;
    });
    return {
      op_no: String(o.op_no ?? (i + 1) * 5).replace(/\D/g, "").padStart(3, "0") || String((i + 1) * 5).padStart(3, "0"),
      name: s(o.name) ?? `Операция ${i + 1}`,
      equipment_id: eqId,
      equipment_name: eq ? `${eq.model} ${eq.name}` : s(o.equipment_name),
      fixture: s(o.fixture), profession: s(o.profession),
      worker_rank: n(o.worker_rank) !== null ? Math.min(8, Math.max(1, Math.round(n(o.worker_rank)!))) : null,
      t_aux: Math.max(0, n(o.t_aux) ?? 1), t_pz: Math.max(0, n(o.t_pz) ?? 10),
      k_service_pct: Math.min(20, Math.max(0, n(o.k_service_pct) ?? 8)),
      steps,
    };
  });

  // Проверка «операция ↔ станок»: круглошлифовальный станок не обрабатывает зубья и отверстия
  for (const op of ops) {
    const eq = equipment.find((e) => e.id === op.equipment_id);
    const isRoundGrinder = /кругл/i.test(`${eq?.type ?? ""} ${eq?.name ?? ""} ${op.equipment_name ?? ""}`);
    if (!isRoundGrinder) continue;
    const bad = op.steps.filter((st) => /зуб|отверст|расточ|паз/i.test(st.description));
    if (bad.length) {
      w.push(`Операция ${op.op_no} «${op.name}»: круглошлифовальный станок не обрабатывает ${bad.map((b) => b.description.slice(0, 30)).join(", ")} — привязка к станку снята, назначьте зубо- или внутришлифовальный станок`);
      op.equipment_id = null;
      op.equipment_name = "Требуется: зубошлифовальный / внутришлифовальный станок";
    }
  }
  if (noNorm) w.push(`${noNorm} ${noNorm === 1 ? "переход" : "перехода(ов)"} без режимов и нормы времени — принято по 1 мин, уточните в техкарте`);
  const seen = new Set<string>();
  ops.forEach((o, i) => { if (seen.has(o.op_no)) o.op_no = String((i + 1) * 5).padStart(3, "0"); seen.add(o.op_no); });
  ops.sort((a, b) => Number(a.op_no) - Number(b.op_no));

  return {
    plan: { blank_type: s(r.blank_type), blank_size: s(r.blank_size), blank_mass: n(r.blank_mass), ops },
    warnings: w,
  };
}

export async function runTechnologist(m: PartModel, equipment: EquipmentRef[], batch: number, opts: { fetcher?: Fetcher; signal?: AbortSignal } = {}) {
  const eq = equipment.length
    ? equipment.map((e) => `{"id":${e.id},"model":"${e.model}","name":"${e.name}","type":"${e.type}"}`).join("\n")
    : "Справочник оборудования пуст — укажи типовые модели станков, equipment_id = null.";
  const user = `Деталь:\n${modelBrief(m)}\n\nОборудование цеха:\n${eq}\n\nПрограмма выпуска: партия ${batch} шт.`;
  const text = await callAi(TECHNOLOGIST_PROMPT, user, { model: TECHNOLOGIST_MODEL, maxTokens: 6000, ...opts });
  return normalizePlan(extractJson(text), equipment);
}
