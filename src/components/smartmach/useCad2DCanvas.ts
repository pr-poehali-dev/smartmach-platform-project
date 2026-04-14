/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Line, Rect, IText } from "fabric";
import { type Tool, type Layer, PAPER_SIZES, GRID, GRID_MAJOR } from "@/components/smartmach/cad2d.data";

export interface GostFrameOptions {
  paperSize: string;
  drawingNumber: string;
  drawingName: string;
  company: string;
  designer: string;
  checker: string;
  scale: string;
  mass: string;
  sheet: string;
  sheets: string;
}

/**
 * Рисует рамку и основную надпись по ГОСТ 2.104-2006 (форма 1).
 * Линии рамки — по ГОСТ 2.303:
 *   - Сплошная основная (S ≈ 0.8–1.4мм) — рамка поля чертежа, внешние контуры ОН
 *   - Сплошная тонкая (S/3 ≈ 0.3мм) — разграфка ОН, внешняя граница листа
 *
 * Основная надпись — в правом нижнем углу.
 * Для A4 верт. — вдоль короткой стороны (185×55мм).
 * Поля: левое 20мм, остальные 5мм.
 *
 * Форма 1 (ГОСТ 2.104-2006), графы:
 *   1  — наименование изделия
 *   2  — обозначение документа
 *   3  — обозначение материала (деталь)
 *   4  — литера
 *   5  — масса
 *   6  — масштаб
 *   7  — порядковый № листа
 *   8  — общее кол-во листов
 *   9  — наименование / индекс предприятия
 *   10 — характер работы (разработал, проверил…) + подпись + дата
 *   11 — нормоконтроль
 *   12 — утвердил
 */
export function drawGostFrame(fc: Canvas, pw: number, ph: number, opts: GostFrameOptions) {
  // Удаляем все старые объекты рамки
  fc.getObjects().filter((o) => (o as any).__frame).forEach((o) => fc.remove(o));

  // ── Вспомогательные функции ─────────────────────────────────────
  const FONT = "Courier Prime, Courier New, monospace";
  const INK  = "#000000";

  const add = (obj: any) => {
    (obj as any).__frame = true;
    fc.add(obj);
    fc.sendObjectToBack(obj);
    return obj;
  };

  // Сплошная тонкая (ГОСТ 2.303, тип 01) — для разграфки, границы листа
  const thinLine = (x1: number, y1: number, x2: number, y2: number) =>
    add(new Line([x1, y1, x2, y2], {
      stroke: INK, strokeWidth: 0.4,
      selectable: false, evented: false,
    }));

  // Сплошная основная (ГОСТ 2.303, тип 01) — для рамки поля чертежа и внешних контуров ОН
  const mainLine = (x1: number, y1: number, x2: number, y2: number) =>
    add(new Line([x1, y1, x2, y2], {
      stroke: INK, strokeWidth: 1.4,
      selectable: false, evented: false,
    }));

  // Текст по ГОСТ 2.304-81 (Courier Prime как ближайший аналог)
  const txt = (
    str: string, cx: number, cy: number,
    size = 7, bold = false,
  ) => {
    const obj = new IText(str || "", {
      left: cx, top: cy,
      fontSize: size,
      fontFamily: FONT,
      fontWeight: bold ? "bold" : "normal",
      fill: INK,
      selectable: false, evented: false,
      originX: "center", originY: "center",
    });
    return add(obj);
  };

  // Маленький подписной текст (графы-подписи внутри ячеек)
  const label = (str: string, lx: number, ty: number, size = 5) => {
    const obj = new IText(str, {
      left: lx + 1.5 * mX, top: ty + 0.8 * mY,
      fontSize: size, fontFamily: FONT,
      fill: INK, selectable: false, evented: false,
      originX: "left", originY: "top",
    });
    return add(obj);
  };

  // ── Масштаб: px/мм ──────────────────────────────────────────────
  // A4 горизонт = 297×210мм → 1122×794px → 1px ≈ 0.265мм
  // Определяем по фактическому размеру канваса
  const isVert = ph > pw;
  // Для вертикального A4: pw=794px≈210мм, ph=1122px≈297мм
  const mX = isVert ? ph / 297 : pw / 297;
  const mY = isVert ? pw / 210 : ph / 210;

  // ── Поля (ГОСТ) ──────────────────────────────────────────────────
  // Левое — 20мм, остальные — 5мм
  const fL = 20 * mX;   // левое поле  (левый край рамки чертежа)
  const fT = 5  * mY;   // верхнее поле
  const fR = pw - 5 * mX; // правый край рамки
  const fB = ph - 5 * mY; // нижний край рамки

  // ── 1. Внешняя граница листа (тонкая линия) ──────────────────────
  add(new Rect({
    left: 0, top: 0, width: pw - 0.5, height: ph - 0.5,
    stroke: INK, strokeWidth: 0.4, fill: "transparent",
    selectable: false, evented: false,
  }));

  // ── 2. Рамка поля чертежа (сплошная основная) ────────────────────
  // Левая сторона — толще (20мм от края)
  mainLine(fL, fT, fL, fB); // левая
  mainLine(fL, fT, fR, fT); // верхняя
  mainLine(fR, fT, fR, fB); // правая
  mainLine(fL, fB, fR, fB); // нижняя

  // ── 3. Основная надпись (форма 1, ГОСТ 2.104-2006) ──────────────
  //
  // Размеры по ГОСТ (в мм):
  //   Ширина = 185мм, Высота = 55мм
  //   Ширина зоны подписей (гр.10-13) = 7+10+23 = 40мм (левая часть)
  //   Ширина зоны наименования/обозначения = 70мм (графы 1,2)  + 70мм (инфо) = 145мм
  //
  // Разграфка по горизонтали (от левого края ОН, мм):
  //   | 7 | 10 | 23 | 15 | 10 |   70   | 14 | 10 | 16 | 10 |
  //   col0=0  col1=7  col2=17  col3=40  col4=55  col5=65  col6=135  col7=149  col8=159  col9=175  col10=185
  //
  // Разграфка по вертикали (от верха ОН, мм):
  //   row0=0 (верх ОН)
  //   row1=8  (наименование — строка 1, h=8)
  //   row2=16 (обозначение — строка 2, h=8)
  //   row3=23 (разраб — h=7)
  //   row4=30 (пров)
  //   row5=37 (т.контр / н.контр)
  //   row6=44 (утв)
  //   row7=55 (низ ОН = fB)

  const SW = 185 * mX; // ширина штампа
  const SH = 55  * mY; // высота штампа
  const SL = fR - SW;  // левый край штампа
  const ST = fB - SH;  // верхний край штампа

  // Абсолютные координаты вертикальных делителей (от SL, мм)
  const C = [0, 7, 17, 40, 55, 65, 135, 149, 159, 175, 185].map((mm) => SL + mm * mX);
  // Абсолютные координаты горизонтальных делителей (от ST, мм)
  const R2 = [0, 15, 30, 37, 44, 51, 55].map((mm) => ST + mm * mY);
  // R2[0]=ST(верх), R2[1]=строка1, R2[2]=строка2, R2[3]=разраб, R2[4]=пров, R2[5]=н.контр/т.контр, R2[6]=fB(низ)

  // Внешний контур ОН (сплошная основная)
  mainLine(SL, ST, fR, ST); // верх ОН
  mainLine(SL, ST, SL, fB); // левая сторона ОН
  // Правая и нижняя — уже совпадают с рамкой чертежа

  // Горизонтальные линии внутри ОН (тонкие)
  R2.slice(1, -1).forEach((y) => thinLine(SL, y, fR, y));

  // Вертикальные линии внутри ОН (тонкие)
  // Полные (от верха до низа ОН):
  [C[1], C[2], C[5], C[6], C[7], C[8], C[9]].forEach((x) => {
    if (x > SL && x < fR) thinLine(x, ST, x, fB);
  });
  // C[3] и C[4] — только в нижней части (строки подписей)
  [C[3], C[4]].forEach((x) => {
    if (x > SL && x < fR) thinLine(x, R2[2], x, fB);
  });

  // ── 4. Тексты основной надписи ───────────────────────────────────
  const mid = (a: number, b: number) => (a + b) / 2;

  // Гр. 1 — Наименование (строка 1, крупный шрифт h=5 по ГОСТ)
  txt(opts.drawingName || "Наименование изделия",
    mid(C[5], fR), mid(R2[0], R2[1]), 9, true);

  // Гр. 2 — Обозначение документа (строка 2)
  txt(opts.drawingNumber || "XXXX.XXXXXX.XXX",
    mid(C[5], fR), mid(R2[1], R2[2]), 8, false);

  // Гр. 5 — Масса
  txt(opts.mass || "—",    mid(C[6], C[7]), mid(R2[1], R2[2]), 7);
  label("Масса",           C[6], R2[0], 5);

  // Гр. 6 — Масштаб
  txt(opts.scale || "1:1", mid(C[7], C[8]), mid(R2[1], R2[2]), 7);
  label("Масштаб",         C[7], R2[0], 5);

  // Гр. 7 — Лист
  txt(opts.sheet || "1",   mid(C[8], C[9]), mid(R2[1], R2[2]), 7);
  label("Лист",            C[8], R2[0], 5);

  // Гр. 8 — Листов
  txt(opts.sheets || "1",  mid(C[9], fR),   mid(R2[1], R2[2]), 7);
  label("Листов",          C[9], R2[0], 5);

  // Гр. 9 — Наименование предприятия (правый нижний блок)
  txt(opts.company || "Предприятие",
    mid(C[5], fR), mid(R2[2], fB), 7);

  // Подписи (левая колонка, гр. 11-13): Разраб / Пров / Т.контр / Н.контр / Утв
  const rowLabels = [
    ["Разраб.",  opts.designer || "", R2[2], R2[3]],
    ["Пров.",    opts.checker  || "", R2[3], R2[4]],
    ["Т.контр.", "",                  R2[4], R2[5]],
    ["Н.контр.", "",                  R2[5], R2[6] ?? fB],
    ["Утв.",     "",                  R2[6] ?? fB, fB],
  ] as [string, string, number, number][];

  rowLabels.forEach(([lbl, name, y0, y1]) => {
    if (y0 >= fB) return;
    label(lbl, SL, y0, 5);
    txt(name, mid(C[1], C[2]), mid(y0, y1), 6);   // ФИО
    // Подпись и дата — пустые графы (визуальные разделители уже есть)
  });

  // Подписи-заголовки колонок (маленький текст 5)
  label("Фамилия",  C[1], R2[2], 4);
  label("Подпись",  C[2], R2[2], 4);
  label("Дата",     C[3], R2[2], 4);

  // ── 5. Таблица изменений (графы 14–19) слева от ОН ──────────────
  // ГОСТ допускает. Рисуем если есть место (формат ≥ A3).
  const changeW = 12 * mX; // ширина одной графы изменений ≈ 7мм
  const changeX = SL - 55 * mX; // левый край таблицы изменений
  if (changeX >= fL) {
    const CHW = 55 * mX; // суммарная ширина таблицы изменений
    // Внешний контур
    mainLine(changeX, ST, SL, ST);
    mainLine(changeX, ST, changeX, fB);
    // Разграфка внутри (тонкая)
    // Колонки: Изм | Лист докум. | Подп. | Дата | № докум. | Подп. | Дата
    const chCols = [0, 7, 14, 21, 28, 42, 49, 55].map((mm) => changeX + mm * mX);
    chCols.slice(1, -1).forEach((x) => thinLine(x, ST, x, fB));
    thinLine(changeX, R2[1], SL, R2[1]); // горизонт. линия заголовка
    // Заголовки
    const chLabels = ["Изм.", "Лист", "№ докум.", "Подп.", "Дата"];
    const chMids = [mid(chCols[0],chCols[1]), mid(chCols[1],chCols[2]), mid(chCols[2],chCols[4]), mid(chCols[4],chCols[5]), mid(chCols[5],chCols[7])];
    chLabels.forEach((l, i) => txt(l, chMids[i], mid(ST, R2[1]), 5));
  }

  // ── 6. Угловой штамп (маркировка зон) ────────────────────────────
  // ГОСТ допускает: маленькие делители по краям для обозначения зон
  // Верхняя линейка зон (каждые 25мм по горизонтали)
  for (let x = fL + 25*mX; x < fR - 25*mX; x += 25*mX) {
    thinLine(x, fT, x, fT + 5*mY);
    thinLine(x, fB, x, fB - 5*mY);
  }
  // Боковая линейка зон (каждые 25мм по вертикали)
  for (let y = fT + 25*mY; y < fB - 25*mY; y += 25*mY) {
    thinLine(fL, y, fL + 5*mX, y);
    thinLine(fR, y, fR - 5*mX, y);
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