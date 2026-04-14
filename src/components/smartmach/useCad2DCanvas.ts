/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Line, Rect, IText } from "fabric";
import { type Tool, type Layer, PAPER_SIZES, GRID, GRID_MAJOR } from "@/components/smartmach/cad2d.data";

export interface GostFrameOptions {
  paperSize: string;
  drawingNumber: string;   // Гр. 2 — обозначение документа
  drawingName: string;     // Гр. 1 — наименование изделия
  company: string;         // Гр. 9 — наименование организации
  designer: string;        // Гр. 11а — разработал (ФИО)
  checker: string;         // Гр. 11б — проверил (ФИО)
  normController: string;  // Гр. 11д — нормоконтроль (ФИО)
  approver: string;        // Гр. 11е — утвердил (ФИО)
  material: string;        // Гр. 3 — обозначение материала
  litera: string;          // Гр. 4 — литера документа
  scale: string;           // Гр. 6 — масштаб
  mass: string;            // Гр. 5 — масса изделия
  sheet: string;           // Гр. 7 — порядковый номер листа
  sheets: string;          // Гр. 8 — общее число листов
}

/**
 * Рамка и основная надпись по ГОСТ Р 2.104-2023 (форма 1).
 *
 * Линии — по ГОСТ 2.303-68:
 *   Тип 01 сплошная основная  S=0.8..1мм  — рамка чертежа, внешний контур ОН
 *   Тип 01 сплошная тонкая    S/3≈0.3мм   — разграфка ОН, граница листа
 *
 * Поля листа: левое 20мм, остальные 5мм (ГОСТ Р 2.104-2023 п.3.1).
 *
 * Основная надпись — в правом нижнем углу чертежа (п.3.3).
 * На листе А4 — вдоль короткой стороны (п.3.4).
 *
 * Форма 1 — для первого листа чертежей и схем (п.4.1).
 * Размеры штампа: ширина 185мм, высота 55мм.
 *
 * Точная разграфка по ГОСТ Р 2.104-2023 (все размеры в мм):
 *
 * Горизонтальные колонки (累积 от левого края ОН):
 *   Гр.10(должность):  0..7   = 7мм
 *   Гр.11а(фамилия):   7..17  = 10мм
 *   Гр.11б(подпись):   17..32 = 15мм  ← в 2023 увеличена с 10 до 15мм
 *   Гр.11в(дата):      32..40 = 8мм   ← в 2023 изменена с 15 до 8мм
 *   Гр.3(материал):    40..55 = 15мм
 *   Гр.1(наименование):55..120= 65мм  ← в 2023 уменьшена с 70 до 65мм
 *   Гр.2(обозначение): 55..120 (то же поле, строка 2)
 *   Гр.4(литера):     120..128= 8мм
 *   Гр.5(масса):      128..143= 15мм
 *   Гр.6(масштаб):    143..153= 10мм
 *   Гр.7(лист):       153..163= 10мм
 *   Гр.8(листов):     163..175= 12мм
 *   Гр.9(орг.):       175..185= 10мм  ← правый блок
 *   Итого: 185мм ✓
 *
 * Вертикальные строки (от верха ОН):
 *   Строка A (гр.1 наименование):    0..15  h=15мм
 *   Строка B (гр.2 обозначение):    15..30  h=15мм  ← в 2023 h=15 вместо 10+10
 *   Строка C (Разработал):          30..37  h=7мм
 *   Строка D (Проверил):            37..44  h=7мм
 *   Строка E (Т.контр./Н.контр.):  44..51  h=7мм
 *   Строка F (Утвердил):            51..55  h=4мм   ← в 2023 последняя строка h=4мм
 *   Итого: 55мм ✓
 *
 * Таблица изменений (графы 14–18) — слева от ОН по ГОСТ Р 2.104-2023 п.4.5:
 *   Гр.14(Изм):        7мм
 *   Гр.15(Лист):       7мм
 *   Гр.16(№ докум.):  14мм
 *   Гр.17(Подп.):      7мм
 *   Гр.18(Дата):       7мм
 *   Итого: 42мм — повторяется при необходимости
 */
export function drawGostFrame(fc: Canvas, pw: number, ph: number, opts: GostFrameOptions) {
  fc.getObjects().filter((o) => (o as any).__frame).forEach((o) => fc.remove(o));

  const FONT = "Courier Prime, Courier New, monospace";
  const INK  = "#000000";

  const add = (obj: any) => {
    (obj as any).__frame = true;
    fc.add(obj);
    fc.sendObjectToBack(obj);
    return obj;
  };

  // Тонкая сплошная — разграфка, граница листа (ГОСТ 2.303 тип 01, S/3)
  const thin = (x1: number, y1: number, x2: number, y2: number) =>
    add(new Line([x1, y1, x2, y2], { stroke: INK, strokeWidth: 0.35, selectable: false, evented: false }));

  // Основная сплошная — рамка чертежа и внешний контур ОН (ГОСТ 2.303 тип 01, S≈1мм)
  const main = (x1: number, y1: number, x2: number, y2: number) =>
    add(new Line([x1, y1, x2, y2], { stroke: INK, strokeWidth: 1.2, selectable: false, evented: false }));

  // Текст-значение в ячейке (шрифт по ГОСТ 2.304-81, тип А с наклоном 75°)
  const val = (str: string, cx: number, cy: number, size = 7, bold = false) =>
    add(new IText(str || "", {
      left: cx, top: cy, fontSize: size, fontFamily: FONT,
      fontWeight: bold ? "bold" : "normal", fill: INK,
      selectable: false, evented: false, originX: "center", originY: "center",
    }));

  // Заголовок-подпись графы (малый шрифт 3.5 в левом верхнем углу ячейки)
  const cap = (str: string, lx: number, ty: number, size = 4.5) =>
    add(new IText(str, {
      left: lx + 1 * mX, top: ty + 0.7 * mY,
      fontSize: size, fontFamily: FONT, fill: INK,
      selectable: false, evented: false, originX: "left", originY: "top",
    }));

  // ── Масштаб px/мм ────────────────────────────────────────────────
  // Базовые форматы: A4=297×210, A3=420×297, A2=594×420, A1=841×594
  // px-размеры: A4горизонт=1122×794, значит 1мм = 1122/297 ≈ 3.779px
  const isVert = ph > pw;
  const mX = isVert ? ph / 297 : pw / 297;
  const mY = isVert ? pw / 210 : ph / 210;

  // ── Поля листа по ГОСТ Р 2.104-2023 п.3.1 ───────────────────────
  const fL = 20 * mX;       // левое: 20мм (для подшивки)
  const fT = 5  * mY;       // верхнее: 5мм
  const fR = pw - 5 * mX;   // правый край рамки
  const fB = ph - 5 * mY;   // нижний край рамки

  // ── 1. Внешняя граница листа (тонкая) ───────────────────────────
  add(new Rect({
    left: 0, top: 0, width: pw - 0.5, height: ph - 0.5,
    stroke: INK, strokeWidth: 0.35, fill: "transparent",
    selectable: false, evented: false,
  }));

  // ── 2. Рамка поля чертежа (основная линия) ───────────────────────
  main(fL, fT, fL, fB);
  main(fL, fT, fR, fT);
  main(fR, fT, fR, fB);
  main(fL, fB, fR, fB);

  // ── 3. Основная надпись, форма 1 (ГОСТ Р 2.104-2023) ─────────────
  const SW = 185 * mX;  // ширина штампа
  const SH = 55  * mY;  // высота штампа
  const SL = fR  - SW;  // левый  край штампа
  const ST = fB  - SH;  // верхний край штампа

  // Вертикальные позиции колонок (нарастающий итог от SL, мм)
  // По ГОСТ Р 2.104-2023: 7|10|15|8|15|65|8|15|10|10|12|10 = 185
  const CM = [0, 7, 17, 32, 40, 55, 120, 128, 143, 153, 163, 175, 185];
  const C  = CM.map((mm) => SL + mm * mX);
  //  C[0]=SL   C[1]=+7    C[2]=+17   C[3]=+32   C[4]=+40
  //  C[5]=+55  C[6]=+120  C[7]=+128  C[8]=+143  C[9]=+153
  //  C[10]=+163 C[11]=+175 C[12]=fR

  // Горизонтальные позиции строк (нарастающий итог от ST, мм)
  // По ГОСТ Р 2.104-2023: 15|15|7|7|7|4 = 55
  const RM = [0, 15, 30, 37, 44, 51, 55];
  const R  = RM.map((mm) => ST + mm * mY);
  //  R[0]=ST   R[1]=+15   R[2]=+30
  //  R[3]=+37  R[4]=+44   R[5]=+51  R[6]=fB

  const m = (a: number, b: number) => (a + b) / 2;

  // Внешний контур ОН (основная линия — п.3.6 ГОСТ Р 2.104-2023)
  main(SL, ST, fR, ST);  // верхняя граница ОН
  main(SL, ST, SL, fB);  // левая граница ОН
  // Нижняя и правая совпадают с рамкой чертежа

  // Горизонтальные линии разграфки ОН (тонкие)
  R.slice(1, -1).forEach((y) => thin(SL, y, fR, y));

  // Вертикальные линии разграфки ОН
  // Полные (от ST до fB):
  [C[1], C[2], C[5], C[6], C[7], C[8], C[9], C[10], C[11]].forEach((x) => {
    if (x > SL && x < fR) thin(x, ST, x, fB);
  });
  // C[3], C[4] — только в зоне подписей (R[2]..fB)
  [C[3], C[4]].forEach((x) => {
    if (x > SL && x < fR) thin(x, R[2], x, fB);
  });

  // Гр.4 (литера) — три клетки 8÷3мм по горизонтали внутри C[6]..C[7]
  const litW = (C[7] - C[6]) / 3;
  thin(C[6] + litW,   ST, C[6] + litW,   R[2]);
  thin(C[6] + litW*2, ST, C[6] + litW*2, R[2]);

  // ── 4. Заполнение граф ────────────────────────────────────────────

  // Гр.1 — Наименование изделия (строка A, h=15мм, шрифт 5 по ГОСТ)
  val(opts.drawingName || "Наименование изделия", m(C[5], C[6]), m(R[0], R[1]), 10, true);
  // Гр.2 — Обозначение документа (строка B, h=15мм, шрифт 5)
  val(opts.drawingNumber || "XXXX.XXXXXX.XXX СБ",  m(C[5], C[6]), m(R[1], R[2]), 8, false);

  // Гр.3 — Материал (колонка C[4]..C[5], строки A+B)
  cap("Материал", C[4], R[0]);
  val(opts.material || "", m(C[4], C[5]), m(R[0], R[2]), 6);

  // Гр.4 — Литера (три клетки)
  cap("Лит.", C[6], R[0], 4);
  val(opts.litera || "", m(C[6], C[7]), m(R[0], R[2]), 6);

  // Гр.5 — Масса
  cap("Масса", C[7], R[0], 4);
  val(opts.mass || "", m(C[7], C[8]), m(R[1], R[2]), 7);

  // Гр.6 — Масштаб
  cap("Масштаб", C[8], R[0], 4);
  val(opts.scale || "1:1", m(C[8], C[9]), m(R[1], R[2]), 7);

  // Гр.7 — Лист
  cap("Лист", C[9], R[0], 4);
  val(opts.sheet || "1", m(C[9], C[10]), m(R[1], R[2]), 7);

  // Гр.8 — Листов
  cap("Листов", C[10], R[0], 4);
  val(opts.sheets || "1", m(C[10], C[11]), m(R[1], R[2]), 7);

  // Гр.9 — Организация
  cap("Организация", C[11], R[0], 4);
  val(opts.company || "", m(C[11], C[12] ?? fR), m(R[0], R[2]), 6);

  // Заголовки колонок подписей (гр.10-11)
  cap("Должность", C[0], R[2], 4);
  cap("Фамилия",   C[1], R[2], 4);
  cap("Подпись",   C[2], R[2], 4);
  cap("Дата",      C[3], R[2], 4);

  // Гр.10 — Строки должностей (Разраб / Пров / Т.контр / Н.контр / Утв)
  const sigRows: [string, string, number, number][] = [
    ["Разраб.",   opts.designer       || "", R[2], R[3]],
    ["Пров.",     opts.checker        || "", R[3], R[4]],
    ["Т.контр.",  "",                         R[4], R[5]],
    ["Н.контр.",  opts.normController || "", R[5], R[5] + 4*mY],
    ["Утв.",      opts.approver       || "", R[5] + 4*mY, fB],
  ];
  // Добавляем разделительную линию между Т.контр и Н.контр
  thin(SL, R[5], C[4], R[5]);

  sigRows.forEach(([role, name, y0, y1]) => {
    if (y0 >= fB || y1 > fB + 1) return;
    cap(role, C[0], y0, 4.5);             // должность
    val(name, m(C[1], C[2]), m(y0, y1), 6); // фамилия
  });

  // Гр.9 (нижняя часть) — организация крупно под обозначением
  val(opts.company || "Наименование организации",
    m(C[5], fR), m(R[2], fB), 6);

  // ── 5. Таблица изменений (гр.14–18) по ГОСТ Р 2.104-2023 п.4.5 ──
  // Располагается слева от основной надписи.
  // Колонки по 7|7|14|7|7 = 42мм (повторяется если нужно больше).
  const TW = 42 * mX;   // ширина одного блока таблицы изменений
  const TX = SL - TW;   // левый край

  if (TX >= fL) {
    // Внешний контур блока изменений (основная линия)
    main(TX, ST, SL, ST);
    main(TX, ST, TX, fB);

    // Колонки: Изм.(7) | Лист(7) | № докум.(14) | Подп.(7) | Дата(7)
    const tchM = [0, 7, 14, 28, 35, 42];
    const tch  = tchM.map((mm) => TX + mm * mX);
    tch.slice(1, -1).forEach((x) => thin(x, ST, x, fB));

    // Строка заголовка (h=7мм)
    thin(TX, ST + 7*mY, SL, ST + 7*mY);
    const tR = ST + 7*mY;

    // Заголовки граф
    const tchLabels = [
      ["Изм.",     m(tch[0], tch[1])],
      ["Лист",     m(tch[1], tch[2])],
      ["№ докум.", m(tch[2], tch[3])],
      ["Подп.",    m(tch[3], tch[4])],
      ["Дата",     m(tch[4], tch[5])],
    ] as [string, number][];
    tchLabels.forEach(([l, cx]) => val(l, cx, m(ST, tR), 4.5));

    // Строки данных (пустые, по 7мм каждая)
    let y = tR;
    while (y + 7*mY <= fB) {
      thin(TX, y + 7*mY, SL, y + 7*mY);
      y += 7*mY;
    }

    // Надпись «Изм.» повёрнутая вертикально слева от блока (при необходимости)
  }

  // ── 6. Зональные риски по ГОСТ Р 2.104-2023 п.3.7 ───────────────
  // Риски делят стороны рамки через 25мм на зоны (A, B, C... / 1, 2, 3...)
  // Горизонтальные зоны — по верхнему и нижнему краям
  const zoneH = 25 * mX;
  let zi = 0;
  for (let x = fL; x < fR; x += zoneH, zi++) {
    thin(x, fT, x, fT + 5*mY);
    thin(x, fB - 5*mY, x, fB);
    if (zi > 0 && x + zoneH/2 < fR) {
      // Буква зоны (A, B, C...)
      val(String.fromCharCode(64 + zi), x + zoneH/2, fT + 3*mY, 4.5);
    }
  }
  // Вертикальные зоны — по левому и правому краям
  const zoneV = 25 * mY;
  let zj = 0;
  for (let y = fT; y < fB; y += zoneV, zj++) {
    thin(fL,        y, fL + 5*mX, y);
    thin(fR - 5*mX, y, fR,        y);
    if (zj > 0 && y + zoneV/2 < fB) {
      // Цифра зоны (1, 2, 3...)
      val(String(zj), fL + 3*mX, y + zoneV/2, 4.5);
    }
  }

  fc.renderAll();
}

export function useCad2DCanvas() {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const fabricRef      = useRef<Canvas | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const drawingRef     = useRef(false);
  const startRef       = useRef({ x: 0, y: 0 });
  const activeShapeRef = useRef<any>(null);
  const polyPointsRef  = useRef<{ x: number; y: number }[]>([]);
  const showGridRef    = useRef(true);
  const snapRef        = useRef(true);
  const historyRef     = useRef<string[]>([]);
  const clipboardRef   = useRef<any[]>([]);
  const activeLayerRef = useRef("layer-0");

  const [tool,      setTool]      = useState<Tool>("select");
  const [strokeW,   setStrokeW]   = useState(1);
  const [lineType,  setLineType]  = useState("Сплошная");
  const [showGrid,  setShowGrid]  = useState(true);
  const [snapGrid,  setSnapGrid]  = useState(true);
  const [zoom,      setZoom]      = useState(1);
  const [coords,    setCoords]    = useState({ x: 0, y: 0 });
  const [histIdx,   setHistIdx]   = useState(0);
  const [histLen,   setHistLen]   = useState(1);
  const [paperSize, setPaperSize] = useState("A4 горизонт.");
  const [layers,    setLayers]    = useState<Layer[]>([
    { id: "layer-0", name: "Основной", color: "#000000", visible: true, locked: false },
    { id: "layer-1", name: "Размеры",  color: "#1e40af", visible: true, locked: false },
    { id: "layer-2", name: "Осевые",   color: "#dc2626", visible: true, locked: false },
  ]);
  const [activeLayer,   setActiveLayerState] = useState("layer-0");
  const [showLayers,    setShowLayers]       = useState(false);
  const [showProps,     setShowProps]        = useState(false);
  const [selectedObj,   setSelectedObj]      = useState<any>(null);
  const [showPartPanel, setShowPartPanel]    = useState(false);
  const [theme,         setTheme]            = useState<"light" | "dark">("light");

  const themeRef = useRef<"light" | "dark">("light");

  const getColor = useCallback(() => {
    const l = layers.find((lay) => lay.id === activeLayerRef.current);
    if (themeRef.current === "dark") {
      const c = l?.color ?? "#000000";
      return c === "#000000" ? "#ffffff" : c;
    }
    return l?.color ?? "#000000";
  }, [layers]);

  const drawGrid = useCallback((fc: Canvas, w: number, h: number) => {
    if (!showGridRef.current) return;
    const isDark = themeRef.current === "dark";
    const major = isDark ? "#3a3a5c" : "#c8d0e0";
    const minor = isDark ? "#252540" : "#e8edf5";
    for (let x = 0; x <= w; x += GRID) {
      const isMajor = x % GRID_MAJOR === 0;
      const l = new Line([x, 0, x, h], {
        stroke: isMajor ? major : minor,
        strokeWidth: isMajor ? 0.6 : 0.3,
        selectable: false, evented: false,
      });
      (l as any).__grid = true;
      fc.add(l);
    }
    for (let y = 0; y <= h; y += GRID) {
      const isMajor = y % GRID_MAJOR === 0;
      const l = new Line([0, y, w, y], {
        stroke: isMajor ? major : minor,
        strokeWidth: isMajor ? 0.6 : 0.3,
        selectable: false, evented: false,
      });
      (l as any).__grid = true;
      fc.add(l);
    }
    fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.sendObjectToBack(o));
  }, []);

  const saveHistory = useCallback((fc: Canvas) => {
    const json = JSON.stringify(fc.toJSON());
    const next = historyRef.current.slice(0, historyRef.current.length + 1);
    next.push(json);
    historyRef.current = next;
    setHistIdx(next.length - 1);
    setHistLen(next.length);
  }, []);

  /* ── инициализация ── */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const [pw, ph] = PAPER_SIZES["A4 горизонт."] ?? PAPER_SIZES[Object.keys(PAPER_SIZES)[0]];
    const w = pw || containerRef.current.clientWidth || 1100;
    const h = ph || 600;
    const fc = new Canvas(canvasRef.current, { width: w, height: h, backgroundColor: "#ffffff", selection: true });
    fabricRef.current = fc;
    drawGrid(fc, w, h);
    historyRef.current = [JSON.stringify(fc.toJSON())];
    setHistIdx(0); setHistLen(1);

    fc.on("selection:created", (opt) => setSelectedObj(opt.selected?.[0] ?? null));
    fc.on("selection:updated", (opt) => setSelectedObj(opt.selected?.[0] ?? null));
    fc.on("selection:cleared", () => setSelectedObj(null));

    return () => { fc.dispose(); };
  }, [drawGrid]);

  /* ── сетка ── */
  useEffect(() => {
    showGridRef.current = showGrid;
    const fc = fabricRef.current; if (!fc) return;
    fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
    if (showGrid) drawGrid(fc, fc.width!, fc.height!);
    fc.renderAll();
  }, [showGrid, drawGrid]);

  /* ── размер листа ── */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const [pw, ph] = PAPER_SIZES[paperSize];
    if (pw && ph) {
      fc.setDimensions({ width: pw, height: ph });
      fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
      if (showGridRef.current) drawGrid(fc, pw, ph);
      fc.getObjects().filter((o) => (o as any).__frame).forEach((o) => fc.remove(o));
      // Граница листа — тонкая линия (ГОСТ 2.303)
      const border = new Rect({ left: 0, top: 0, width: pw - 0.5, height: ph - 0.5, stroke: "#000", strokeWidth: 0.4, fill: "transparent", selectable: false, evented: false });
      (border as any).__frame = true; fc.add(border); fc.sendObjectToBack(border);
      // Рамка поля чертежа — основная линия, поля 20/5/5/5 мм
      const isV = ph > pw;
      const mX2 = isV ? ph / 297 : pw / 297;
      const mY2 = isV ? pw / 210 : ph / 210;
      const fL = 20 * mX2, fT = 5 * mY2, fR = pw - 5 * mX2, fB = ph - 5 * mY2;
      const mkLine = (x1: number, y1: number, x2: number, y2: number) => {
        const l = new Line([x1, y1, x2, y2], { stroke: "#000", strokeWidth: 1.4, selectable: false, evented: false });
        (l as any).__frame = true; fc.add(l); fc.sendObjectToBack(l);
      };
      mkLine(fL, fT, fL, fB); mkLine(fL, fT, fR, fT);
      mkLine(fR, fT, fR, fB); mkLine(fL, fB, fR, fB);
      fc.renderAll();
    }
  }, [paperSize, drawGrid]);

  /* ── тема (тёмный/светлый фон) ── */
  useEffect(() => {
    themeRef.current = theme;
    const fc = fabricRef.current; if (!fc) return;
    const bg  = theme === "dark" ? "#12131f" : "#ffffff";
    const frm = theme === "dark" ? "#ffffff" : "#000000";
    fc.backgroundColor = bg;
    // Перерисовываем сетку
    fc.getObjects().filter((o) => (o as any).__grid).forEach((o) => fc.remove(o));
    if (showGridRef.current) drawGrid(fc, fc.width!, fc.height!);
    // Перекрашиваем рамку
    fc.getObjects().filter((o) => (o as any).__frame).forEach((o: any) => {
      if (o.stroke !== undefined) o.set("stroke", frm);
      if (o.fill !== undefined && o.fill !== "transparent" && o.fill !== "") o.set("fill", frm === "#ffffff" ? "#12131f" : "#000000");
      if (o.type === "i-text" || o.type === "text") o.set("fill", frm);
    });
    fc.renderAll();
  }, [theme, drawGrid]);

  /* ── синхронизация инструментов ── */
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    (fc as any).__tool    = tool;
    (fc as any).__color   = getColor();
    (fc as any).__strokeW = strokeW;
    const map: Record<Tool, string> = {
      select: "default", move: "grab", line: "crosshair", polyline: "crosshair",
      rect: "crosshair", circle: "crosshair", ellipse: "crosshair", arc: "crosshair",
      dimension: "crosshair", text: "text", hatch: "crosshair", erase: "not-allowed",
    };
    fc.defaultCursor = map[tool];
  }, [tool, strokeW, getColor]);

  /* ── слой → цвет ── */
  useEffect(() => {
    activeLayerRef.current = activeLayer;
    const fc = fabricRef.current; if (!fc) return;
    (fc as any).__color = getColor();
  }, [activeLayer, layers, getColor]);

  /* ── снапинг ── */
  useEffect(() => { snapRef.current = snapGrid; }, [snapGrid]);

  return {
    canvasRef, fabricRef, containerRef,
    drawingRef, startRef, activeShapeRef, polyPointsRef,
    showGridRef, snapRef, historyRef, clipboardRef, activeLayerRef,
    tool, setTool,
    strokeW, setStrokeW,
    lineType, setLineType,
    showGrid, setShowGrid,
    snapGrid, setSnapGrid,
    zoom, setZoom,
    coords, setCoords,
    histIdx, setHistIdx,
    histLen, setHistLen,
    paperSize, setPaperSize,
    layers, setLayers,
    activeLayer, setActiveLayerState,
    showLayers, setShowLayers,
    showProps, setShowProps,
    selectedObj, setSelectedObj,
    showPartPanel, setShowPartPanel,
    theme, setTheme,
    themeRef,
    getColor, drawGrid, saveHistory,
  };
}