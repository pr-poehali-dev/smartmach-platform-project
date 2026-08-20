/**
 * Формирование протокола испытаний адаптивного управления гибридным
 * лазерно-плазменным процессом.
 *
 * Документ предназначен для приложения к заявке на грант и к отчёту
 * по НИОКР, поэтому это не скриншот страницы, а сформированный PDF:
 * текстовый слой доступен для поиска и копирования, таблицы верстаются
 * с переносом по страницам, есть колонтитулы и место для подписей.
 */
import { jsPDF } from 'jspdf';

import {
  AppliedRule,
  Correction,
  Detection,
  MAX_STEP_PCT,
  PARAM_LABELS,
  ProcessDef,
  SignalData,
} from '@/lib/hybridControl';

const FONT = 'NotoSans';

/**
 * Подготовка текста к выводу в PDF.
 *
 * Noto Sans не содержит глифа стрелки (U+2192) — он вынесен в отдельную
 * гарнитуру Noto Sans Symbols. Вместо утяжеления PDF вторым шрифтом
 * стрелка заменяется на длинное тире, доступное в основном начертании.
 * В интерфейсе панели стрелка сохраняется.
 */
function pdfText(s: string): string {
  return s.replace(/→/g, '\u2014').replace(/←/g, '\u2014');
}

/* ─────────────────── Данные протокола ─────────────────── */

export interface ProtocolLogEntry {
  time: string;
  text: string;
}

export interface ProtocolData {
  process: ProcessDef;
  conditions: {
    gapMm: number;
    surface: string;
    electrodeWearPct: number;
    qualityTarget: string;
  };
  signalLabel: string;
  signal: SignalData;
  baseParams: Record<string, number>;
  activeParams: Record<string, number>;
  appliedRules: AppliedRule[];
  detections: Detection[];
  features: Record<string, number>;
  stabilityIndex: number;
  status: 'stable' | 'warning' | 'unstable';
  corrections: Correction[];
  log: ProtocolLogEntry[];
  operator?: string;
  organization?: string;
}

const SURFACE_LABELS: Record<string, string> = {
  clean: 'чистая',
  oxidized: 'окисленная',
  contaminated: 'загрязнённая',
};

const QUALITY_LABELS: Record<string, string> = {
  standard: 'стандартное',
  high: 'повышенное',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'критическое',
  high: 'высокое',
  medium: 'среднее',
  low: 'низкое',
};

const STATUS_LABELS: Record<string, string> = {
  stable: 'СТАБИЛЕН',
  warning: 'ТРЕБУЕТ ВНИМАНИЯ',
  unstable: 'НЕСТАБИЛЕН',
};

/* ─────────────────── Геометрия страницы ─────────────────── */

const PAGE = { w: 210, h: 297, ml: 18, mr: 15, mt: 18, mb: 20 };
const CONTENT_W = PAGE.w - PAGE.ml - PAGE.mr;

type RGB = [number, number, number];

const COLOR = {
  text: [17, 24, 39] as RGB,
  muted: [107, 114, 128] as RGB,
  line: [209, 213, 219] as RGB,
  head: [243, 244, 246] as RGB,
  accent: [29, 78, 216] as RGB,
  green: [5, 150, 105] as RGB,
  amber: [217, 119, 6] as RGB,
  red: [185, 28, 28] as RGB,
};

/**
 * Курсор документа: отслеживает вертикальную позицию и сам переносит
 * содержимое на новую страницу, когда блок не помещается.
 */
class DocCursor {
  y = PAGE.mt;
  page = 1;

  constructor(private pdf: jsPDF) {}

  /** Резервирует место под блок; при нехватке открывает новую страницу. */
  need(h: number): void {
    if (this.y + h <= PAGE.h - PAGE.mb) return;
    this.pdf.addPage();
    this.page += 1;
    this.y = PAGE.mt;
  }

  gap(h: number): void {
    this.y += h;
  }
}

/* ─────────────────── Примитивы вёрстки ─────────────────── */

function setFont(pdf: jsPDF, style: 'normal' | 'bold', size: number, color: RGB) {
  pdf.setFont(FONT, style);
  pdf.setFontSize(size);
  pdf.setTextColor(color[0], color[1], color[2]);
}

function heading(pdf: jsPDF, cur: DocCursor, num: string, title: string) {
  cur.need(12);
  setFont(pdf, 'bold', 11, COLOR.text);
  pdf.text(`${num}. ${title}`, PAGE.ml, cur.y);
  cur.gap(1.5);
  pdf.setDrawColor(COLOR.accent[0], COLOR.accent[1], COLOR.accent[2]);
  pdf.setLineWidth(0.4);
  pdf.line(PAGE.ml, cur.y, PAGE.ml + CONTENT_W, cur.y);
  cur.gap(5);
}

function paragraph(pdf: jsPDF, cur: DocCursor, text: string, size = 8.5) {
  setFont(pdf, 'normal', size, COLOR.muted);
  const lines = pdf.splitTextToSize(pdfText(text), CONTENT_W) as string[];
  lines.forEach((ln) => {
    cur.need(4.5);
    pdf.text(ln, PAGE.ml, cur.y);
    cur.gap(4);
  });
}

interface TableCol {
  title: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

/**
 * Таблица с автоматическим переносом на новую страницу.
 * Шапка повторяется на каждой странице — требование к отчётным документам.
 */
function table(
  pdf: jsPDF,
  cur: DocCursor,
  cols: TableCol[],
  rows: string[][],
  rowColors?: (RGB | null)[],
) {
  const rowH = 6;
  const padX = 2;

  const drawHead = () => {
    cur.need(rowH + 2);
    pdf.setFillColor(COLOR.head[0], COLOR.head[1], COLOR.head[2]);
    pdf.rect(PAGE.ml, cur.y - 4, CONTENT_W, rowH, 'F');
    setFont(pdf, 'bold', 7.5, COLOR.text);
    let x = PAGE.ml;
    cols.forEach((c) => {
      pdf.text(c.title, x + padX, cur.y);
      x += c.width;
    });
    cur.gap(rowH);
  };

  drawHead();
  pdf.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
  pdf.setLineWidth(0.15);

  rows.forEach((row, ri) => {
    // Многострочные ячейки: высота строки считается по самой длинной
    const wrapped = row.map((cell, ci) =>
      pdf.splitTextToSize(pdfText(cell), cols[ci].width - padX * 2) as string[],
    );
    const lineCount = Math.max(...wrapped.map((w) => w.length));
    const h = Math.max(rowH, lineCount * 3.6 + 2.4);

    if (cur.y + h > PAGE.h - PAGE.mb) {
      pdf.addPage();
      cur.page += 1;
      cur.y = PAGE.mt;
      drawHead();
    }

    const tone = rowColors?.[ri] ?? COLOR.text;
    setFont(pdf, 'normal', 7.5, tone);

    let x = PAGE.ml;
    wrapped.forEach((cellLines, ci) => {
      const col = cols[ci];
      cellLines.forEach((ln, li) => {
        const ty = cur.y + li * 3.6;
        if (col.align === 'right') {
          pdf.text(ln, x + col.width - padX, ty, { align: 'right' });
        } else if (col.align === 'center') {
          pdf.text(ln, x + col.width / 2, ty, { align: 'center' });
        } else {
          pdf.text(ln, x + padX, ty);
        }
      });
      x += col.width;
    });

    cur.gap(h - 2);
    pdf.line(PAGE.ml, cur.y, PAGE.ml + CONTENT_W, cur.y);
    cur.gap(2);
  });

  cur.gap(3);
}

/** Пара «параметр — значение» в две колонки. */
function keyValueGrid(pdf: jsPDF, cur: DocCursor, pairs: [string, string][]) {
  const colW = CONTENT_W / 2;
  const rowH = 5;

  for (let i = 0; i < pairs.length; i += 2) {
    cur.need(rowH);
    [pairs[i], pairs[i + 1]].forEach((pair, j) => {
      if (!pair) return;
      const x = PAGE.ml + j * colW;

      // Значение прижато вправо, поэтому подпись обрезается по остатку
      // ширины колонки — иначе длинный текст наезжает на значение.
      setFont(pdf, 'bold', 8, COLOR.text);
      const valueW = pdf.getTextWidth(pair[1]);
      setFont(pdf, 'normal', 8, COLOR.muted);
      const labelMaxW = colW - valueW - 8;
      const label = (pdf.splitTextToSize(pair[0], Math.max(10, labelMaxW)) as string[])[0];

      pdf.text(label, x, cur.y);
      setFont(pdf, 'bold', 8, COLOR.text);
      pdf.text(pair[1], x + colW - 4, cur.y, { align: 'right' });
    });
    cur.gap(rowH);
  }
  cur.gap(2);
}

/* ─────────────────── Графика ─────────────────── */

/** Осциллограмма средствами PDF: векторная линия, а не растровая картинка. */
function oscillogram(
  pdf: jsPDF,
  cur: DocCursor,
  data: number[],
  label: string,
  unit: string,
  color: RGB,
) {
  const h = 26;
  cur.need(h + 8);

  const avg = data.reduce((s, x) => s + x, 0) / data.length;
  const lo = Math.min(...data);
  const hi = Math.max(...data);

  setFont(pdf, 'bold', 7.5, COLOR.text);
  pdf.text(label, PAGE.ml, cur.y);
  setFont(pdf, 'normal', 7, COLOR.muted);
  pdf.text(
    `среднее ${avg.toFixed(1)} ${unit} · мин ${lo.toFixed(1)} · макс ${hi.toFixed(1)}`,
    PAGE.ml + CONTENT_W,
    cur.y,
    { align: 'right' },
  );
  cur.gap(2.5);

  const top = cur.y;
  pdf.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
  pdf.setLineWidth(0.15);
  pdf.rect(PAGE.ml, top, CONTENT_W, h);

  // Масштаб по фактическому размаху с запасом 15%, чтобы выбросы не срезались
  const span = Math.max(hi - lo, Math.abs(avg) * 0.02) * 1.15;
  const mid = (hi + lo) / 2;
  const yLo = mid - span / 2;

  // Прореживание: в PDF нет смысла рисовать больше точек, чем разрешение печати
  const step = Math.max(1, Math.floor(data.length / 260));
  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(0.25);

  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < data.length; i += step) {
    const x = PAGE.ml + (i / (data.length - 1)) * CONTENT_W;
    const y = top + h - ((data[i] - yLo) / span) * h;
    const yc = Math.max(top + 0.3, Math.min(top + h - 0.3, y));
    if (i > 0) pdf.line(prevX, prevY, x, yc);
    prevX = x;
    prevY = yc;
  }

  cur.gap(h + 4);
}

/** Шкала индекса стабильности с указателем текущего значения. */
function stabilityBar(pdf: jsPDF, cur: DocCursor, value: number, status: string) {
  const h = 9;
  cur.need(h + 12);

  const zones: [number, number, RGB][] = [
    [0, 60, COLOR.red],
    [60, 85, COLOR.amber],
    [85, 100, COLOR.green],
  ];

  zones.forEach(([from, to, c]) => {
    const x = PAGE.ml + (from / 100) * CONTENT_W;
    const w = ((to - from) / 100) * CONTENT_W;
    pdf.setFillColor(c[0], c[1], c[2]);
    pdf.rect(x, cur.y, w, h, 'F');
  });

  // Указатель текущего значения
  const px = PAGE.ml + (value / 100) * CONTENT_W;
  pdf.setDrawColor(17, 24, 39);
  pdf.setLineWidth(0.8);
  pdf.line(px, cur.y - 2, px, cur.y + h + 2);

  setFont(pdf, 'bold', 9, COLOR.text);
  const labelX = Math.min(Math.max(px, PAGE.ml + 10), PAGE.ml + CONTENT_W - 10);
  pdf.text(`${value}`, labelX, cur.y - 3.5, { align: 'center' });

  cur.gap(h + 4);
  setFont(pdf, 'normal', 7, COLOR.muted);
  pdf.text('0 — нестабилен', PAGE.ml, cur.y);
  pdf.text('60', PAGE.ml + CONTENT_W * 0.6, cur.y, { align: 'center' });
  pdf.text('85', PAGE.ml + CONTENT_W * 0.85, cur.y, { align: 'center' });
  pdf.text('100 — стабилен', PAGE.ml + CONTENT_W, cur.y, { align: 'right' });
  cur.gap(6);

  const tone =
    status === 'stable' ? COLOR.green : status === 'warning' ? COLOR.amber : COLOR.red;
  setFont(pdf, 'bold', 10, tone);
  pdf.text(`Заключение: процесс ${STATUS_LABELS[status]}`, PAGE.ml, cur.y);
  cur.gap(6);
}

/* ─────────────────── Колонтитулы ─────────────────── */

function drawFooters(pdf: jsPDF, docNumber: string) {
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    pdf.setPage(i);
    pdf.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
    pdf.setLineWidth(0.15);
    pdf.line(PAGE.ml, PAGE.h - 14, PAGE.w - PAGE.mr, PAGE.h - 14);

    setFont(pdf, 'normal', 7, COLOR.muted);
    pdf.text(docNumber, PAGE.ml, PAGE.h - 10);
    pdf.text(
      'Программный комплекс адаптивного управления гибридным процессом',
      PAGE.w / 2,
      PAGE.h - 10,
      { align: 'center' },
    );
    pdf.text(`Лист ${i} из ${total}`, PAGE.w - PAGE.mr, PAGE.h - 10, {
      align: 'right',
    });
  }
}

/* ─────────────────── Основной генератор ─────────────────── */

export async function buildProtocolPdf(data: ProtocolData): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Кириллица: без встроенного шрифта jsPDF выдаёт нечитаемый текст.
  // Шрифт грузится динамически — 85 КБ base64 не попадают в основной бандл
  // и скачиваются только при первой выгрузке протокола.
  const { NOTO_SANS_REGULAR, NOTO_SANS_BOLD } = await import('./notoSansFont');
  pdf.addFileToVFS('NotoSans-Regular.ttf', NOTO_SANS_REGULAR);
  pdf.addFont('NotoSans-Regular.ttf', FONT, 'normal');
  pdf.addFileToVFS('NotoSans-Bold.ttf', NOTO_SANS_BOLD);
  pdf.addFont('NotoSans-Bold.ttf', FONT, 'bold');

  const now = new Date();
  const stamp = now.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const docNumber = `ПИ-${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate(),
  ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;

  const cur = new DocCursor(pdf);
  const { process: proc } = data;

  pdf.setProperties({
    title: `Протокол испытаний ${docNumber}`,
    subject: 'Адаптивное управление гибридным лазерно-плазменным процессом',
    author: data.organization ?? 'СмартМаш',
    creator: 'Программный комплекс адаптивного управления',
  });

  /* ── Шапка документа ── */
  setFont(pdf, 'normal', 8, COLOR.muted);
  pdf.text(data.organization ?? 'СмартМаш', PAGE.ml, cur.y);
  pdf.text(docNumber, PAGE.ml + CONTENT_W, cur.y, { align: 'right' });
  cur.gap(7);

  setFont(pdf, 'bold', 14, COLOR.text);
  pdf.text('ПРОТОКОЛ ИСПЫТАНИЙ', PAGE.w / 2, cur.y, { align: 'center' });
  cur.gap(6);

  setFont(pdf, 'normal', 9.5, COLOR.muted);
  const sub = pdf.splitTextToSize(
    'Адаптивное управление гибридным лазерно-плазменным процессом: '
      + 'подбор режима, детекция нестабильности, коррекция параметров',
    CONTENT_W,
  ) as string[];
  sub.forEach((ln) => {
    pdf.text(ln, PAGE.w / 2, cur.y, { align: 'center' });
    cur.gap(4.5);
  });
  cur.gap(2);

  pdf.setDrawColor(COLOR.text[0], COLOR.text[1], COLOR.text[2]);
  pdf.setLineWidth(0.5);
  pdf.line(PAGE.ml, cur.y, PAGE.ml + CONTENT_W, cur.y);
  cur.gap(7);

  /* ── 1. Общие сведения ── */
  heading(pdf, cur, '1', 'Общие сведения об испытании');
  keyValueGrid(pdf, cur, [
    ['Дата и время', stamp],
    ['Номер протокола', docNumber],
    ['Процесс', proc.title],
    ['Вид обработки', proc.kind === 'welding' ? 'сварка' : 'резка'],
    ['Материал', proc.material],
    ['Толщина, мм', String(proc.thicknessMm)],
    ['Защитный газ', proc.gas],
    ['Оператор', data.operator?.trim() || '_______________'],
  ]);

  /* ── 2. Условия ── */
  heading(pdf, cur, '2', 'Условия на рабочем месте');
  keyValueGrid(pdf, cur, [
    ['Зазор в стыке, мм', String(data.conditions.gapMm)],
    ['Состояние поверхности', SURFACE_LABELS[data.conditions.surface] ?? '—'],
    ['Износ электрода, %', String(data.conditions.electrodeWearPct)],
    ['Требование к качеству', QUALITY_LABELS[data.conditions.qualityTarget] ?? '—'],
  ]);

  /* ── 3. Режим обработки ── */
  heading(pdf, cur, '3', 'Режим обработки');
  paragraph(
    pdf,
    cur,
    'Базовый режим — табличное значение из технологической базы. Расчётный — '
      + 'результат применения правил подбора под фактические условия. Фактический — '
      + 'значение после коррекций, выполненных в ходе испытания.',
  );
  cur.gap(1);

  const paramRows = Object.keys(data.activeParams).map((k) => {
    const label = PARAM_LABELS[k];
    const base = data.baseParams[k];
    const active = data.activeParams[k];
    const [lo, hi] = proc.limits[k] ?? [0, 0];
    return [
      label?.label ?? k,
      label?.unit ?? '',
      String(base ?? '—'),
      String(active),
      `${lo}…${hi}`,
    ];
  });

  const paramColors: (RGB | null)[] = Object.keys(data.activeParams).map((k) =>
    data.baseParams[k] !== data.activeParams[k] ? COLOR.amber : null,
  );

  table(
    pdf,
    cur,
    [
      { title: 'Параметр', width: 52 },
      { title: 'Ед. изм.', width: 20 },
      { title: 'Базовый', width: 26, align: 'right' },
      { title: 'Фактический', width: 32, align: 'right' },
      { title: 'Допустимый диапазон', width: 47, align: 'right' },
    ],
    paramRows,
    paramColors,
  );

  /* ── 4. Правила подбора ── */
  heading(pdf, cur, '4', 'Правила, применённые при подборе режима');
  if (data.appliedRules.length === 0) {
    paragraph(pdf, cur, 'Условия штатные, коррекция базового режима не потребовалась.');
  } else {
    table(
      pdf,
      cur,
      [
        { title: 'Код', width: 16 },
        { title: 'Параметр', width: 40 },
        { title: 'Было', width: 20, align: 'right' },
        { title: 'Стало', width: 20, align: 'right' },
        { title: 'Изм., %', width: 18, align: 'right' },
        { title: 'Технологическое обоснование', width: 63 },
      ],
      data.appliedRules.map((r) => [
        r.ruleId,
        PARAM_LABELS[r.param]?.label ?? r.param,
        String(r.from),
        String(r.to),
        `${r.changePct > 0 ? '+' : ''}${r.changePct}`,
        r.reason,
      ]),
    );
  }

  /* ── 5. Осциллограммы ── */
  heading(pdf, cur, '5', 'Осциллограммы контролируемых величин');
  paragraph(pdf, cur, `Записанный режим: ${data.signalLabel}. Окно наблюдения — ${data.signal.voltage.length} отсчётов.`);
  cur.gap(1);
  oscillogram(pdf, cur, data.signal.voltage, 'Напряжение дуги', 'В', [37, 99, 235]);
  oscillogram(pdf, cur, data.signal.current, 'Ток плазмы', 'А', [220, 38, 38]);
  oscillogram(pdf, cur, data.signal.laserPower, 'Мощность лазера', 'Вт', [124, 58, 237]);

  /* ── 6. Признаки ── */
  heading(pdf, cur, '6', 'Расчётные признаки сигнала');
  table(
    pdf,
    cur,
    [
      { title: 'Признак', width: 70 },
      { title: 'Значение', width: 30, align: 'right' },
      { title: 'Назначение', width: 68 },
    ],
    [
      [
        'Среднее напряжение дуги, В',
        data.features.voltageMean.toFixed(2),
        'Косвенная оценка длины дуги и глубины проплавления',
      ],
      [
        'Коэффициент вариации напряжения, %',
        data.features.voltageStdPct.toFixed(2),
        'Мера нестабильности горения дуги',
      ],
      [
        'Коэффициент вариации тока, %',
        data.features.currentStdPct.toFixed(2),
        'Мера нестабильности плазменного шнура',
      ],
      [
        'Пик-фактор тока',
        data.features.currentCrest.toFixed(2),
        'Разделяет равномерный шум и одиночные выбросы',
      ],
      [
        'Максимальный выброс тока, %',
        data.features.currentSpikePct.toFixed(2),
        'Амплитуда отклонения от среднего значения',
      ],
      [
        'Дрейф мощности лазера, %',
        data.features.powerTrendPct.toFixed(2),
        'Выявление загрязнения оптики и расфокусировки',
      ],
    ],
  );

  /* ── 7. Диагностика ── */
  heading(pdf, cur, '7', 'Результаты диагностики');
  if (data.detections.length === 0) {
    setFont(pdf, 'bold', 9, COLOR.green);
    cur.need(6);
    pdf.text('Отклонений не обнаружено, режим соответствует расчётному.', PAGE.ml, cur.y);
    cur.gap(7);
  } else {
    table(
      pdf,
      cur,
      [
        { title: 'Выявленное явление', width: 38 },
        { title: 'Значимость', width: 22 },
        { title: 'Признак', width: 44 },
        { title: 'Вероятная причина', width: 53 },
      ],
      data.detections.map((d) => [
        d.title,
        SEVERITY_LABELS[d.severity] ?? d.severity,
        d.evidence,
        d.cause,
      ]),
      data.detections.map((d) =>
        d.severity === 'critical' ? COLOR.red : d.severity === 'high' ? COLOR.amber : null,
      ),
    );
  }

  /* ── 8. Индекс стабильности ── */
  heading(pdf, cur, '8', 'Интегральный индекс стабильности');
  paragraph(
    pdf,
    cur,
    'Индекс рассчитывается как 100 за вычетом весов выявленных отклонений '
      + '(критическое — 40, высокое — 25, среднее — 12, низкое — 5). '
      + 'Значение ниже 60 указывает на риск получения брака.',
  );
  cur.gap(2);
  stabilityBar(pdf, cur, data.stabilityIndex, data.status);

  /* ── 9. Коррекции ── */
  heading(pdf, cur, '9', 'Выработанные коррекции режима');
  if (data.corrections.length === 0) {
    paragraph(pdf, cur, 'Коррекция не требуется, процесс находится в допуске.');
  } else {
    table(
      pdf,
      cur,
      [
        { title: 'Параметр', width: 40 },
        { title: 'Было', width: 20, align: 'right' },
        { title: 'Стало', width: 20, align: 'right' },
        { title: 'Изм., %', width: 18, align: 'right' },
        { title: 'Основание', width: 40 },
        { title: 'Режим применения', width: 39 },
      ],
      data.corrections.map((c) => [
        PARAM_LABELS[c.param]?.label ?? c.param,
        String(c.oldValue),
        String(c.newValue),
        `${c.changePct > 0 ? '+' : ''}${c.changePct}`,
        c.signature,
        c.requiresConfirm ? 'по подтверждению оператора' : 'автоматически',
      ]),
      data.corrections.map((c) => (c.requiresConfirm ? COLOR.red : null)),
    );
  }

  paragraph(
    pdf,
    cur,
    `Ограничения безопасности: шаг единичной коррекции не превышает ${MAX_STEP_PCT}% от текущего `
      + 'значения параметра; коррекции по критическим событиям не применяются автоматически '
      + 'и требуют подтверждения оператора. Все значения ограничиваются технологическими '
      + 'пределами процесса.',
  );

  /* ── 10. Журнал ── */
  heading(pdf, cur, '10', 'Журнал событий');
  if (data.log.length === 0) {
    paragraph(pdf, cur, 'Действий оператора в ходе испытания не зафиксировано.');
  } else {
    table(
      pdf,
      cur,
      [
        { title: 'Время', width: 22 },
        { title: 'Событие', width: 155 },
      ],
      [...data.log].reverse().map((e) => [e.time, e.text]),
    );
  }

  /* ── 11. Чек-лист ── */
  heading(pdf, cur, '11', 'Чек-лист готовности оборудования');
  proc.checklist.forEach((item) => {
    cur.need(5);
    pdf.setDrawColor(COLOR.muted[0], COLOR.muted[1], COLOR.muted[2]);
    pdf.setLineWidth(0.2);
    pdf.rect(PAGE.ml, cur.y - 2.6, 3, 3);
    setFont(pdf, 'normal', 8, COLOR.text);
    pdf.text(item, PAGE.ml + 5, cur.y);
    cur.gap(5);
  });
  cur.gap(3);

  /* ── 12. Подписи ── */
  heading(pdf, cur, '12', 'Подписи');
  cur.need(26);
  const sigW = CONTENT_W / 2 - 5;
  const sigs: [string, string][] = [
    ['Испытание провёл', data.operator?.trim() || ''],
    ['Технолог', ''],
  ];
  sigs.forEach((s, i) => {
    const x = PAGE.ml + i * (sigW + 10);
    setFont(pdf, 'normal', 8, COLOR.muted);
    pdf.text(s[0], x, cur.y);
    pdf.setDrawColor(COLOR.text[0], COLOR.text[1], COLOR.text[2]);
    pdf.setLineWidth(0.25);
    pdf.line(x, cur.y + 9, x + sigW, cur.y + 9);
    if (s[1]) {
      setFont(pdf, 'normal', 8, COLOR.text);
      pdf.text(s[1], x + 1, cur.y + 7.5);
    }
    setFont(pdf, 'normal', 6.5, COLOR.muted);
    pdf.text('подпись, расшифровка, дата', x, cur.y + 12.5);
  });
  cur.gap(20);

  paragraph(
    pdf,
    cur,
    'Протокол сформирован автоматически программным комплексом адаптивного управления '
      + 'гибридным лазерно-плазменным процессом. Расчётные значения носят рекомендательный '
      + 'характер и подлежат подтверждению технологом предприятия.',
    7,
  );

  drawFooters(pdf, docNumber);
  return pdf;
}

/** Формирует и сохраняет протокол. Возвращает имя файла. */
export async function downloadProtocol(data: ProtocolData): Promise<string> {
  const pdf = await buildProtocolPdf(data);
  const d = new Date();
  const name = `Протокол_испытаний_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.pdf`;
  pdf.save(name);
  return name;
}