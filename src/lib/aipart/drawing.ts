/**
 * Генератор рабочего чертежа детали по параметрической модели.
 * Лист A4/A3 горизонтальный, рамка и основная надпись — ГОСТ Р 2.104 (рисует холст),
 * здесь — поле чертежа: виды, разрезы, сечения, размеры, шероховатость, ТТ.
 */
import { Sheet, type Prim } from "@/lib/aipart/geom";
import { type PartModel, type ShaftParams, type DiscParams, type PlateParams, fmt, totalLength } from "@/lib/aipart/model";

export interface DrawingResult {
  prims: Prim[];
  paper: "A4 горизонт." | "A3 горизонт.";
  scale: string;
  sheetW: number;
  sheetH: number;
}

/** Поле чертежа (мм): рамка 20/5/5/5, основная надпись 185×55 справа внизу */
interface Field { x0: number; y0: number; x1: number; y1: number; stampTop: number; stampLeft: number }
const field = (w: number, h: number): Field => ({ x0: 20, y0: 5, x1: w - 5, y1: h - 5, stampTop: h - 5 - 55, stampLeft: w - 5 - 185 });

const SCALES: [number, string][] = [[5, "5:1"], [4, "4:1"], [2.5, "2,5:1"], [2, "2:1"], [1, "1:1"], [0.5, "1:2"], [0.4, "1:2,5"], [0.25, "1:4"], [0.2, "1:5"], [0.1, "1:10"], [0.05, "1:20"]];

/** Наибольший стандартный масштаб ГОСТ 2.302, при котором модель (w×h мм) помещается в (W×H) */
export function pickScale(w: number, h: number, W: number, H: number): [number, string] {
  for (const [k, label] of SCALES) if (w * k <= W && h * k <= H) return [k, label];
  return SCALES[SCALES.length - 1];
}

export const tolText = (d: number, tol: string | null, prefix = "∅") => `${prefix}${fmt(d)}${tol ? tol : ""}`;

export function buildDrawing(m: PartModel): DrawingResult {
  if (m.kind === "shaft" && m.shaft) return shaftDrawing(m, m.shaft);
  if (m.kind === "disc" && m.disc) return discDrawing(m, m.disc);
  if (m.kind === "plate" && m.plate) return plateDrawing(m, m.plate);
  throw new Error("Пустая модель детали");
}

/** Технические требования над основной надписью (ГОСТ 2.316) */
function requirements(sh: Sheet, f: Field, m: PartModel, extra: string[] = []) {
  const items = [...extra, ...m.requirements].filter(Boolean);
  const maxChars = Math.floor(185 / (3 * 0.56)) - 4;
  const lines: string[] = [];
  items.forEach((it, i) => {
    lines.push(...wrapText(`${i + 1}. ${it.replace(/^\d+[.)]\s+/, "")}`, maxChars));
  });
  const lh = 4.6;
  const y0 = f.stampTop - 4 - lines.length * lh;
  lines.forEach((l, i) => sh.text(f.stampLeft, y0 + i * lh + 3, l, "start", 3));
  return y0 - 2;
}

/** Перенос строки по словам; продолжение — с отступом */
export function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const wd of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${wd}` : wd;
    if (next.length > maxChars && cur) { out.push(cur); cur = `   ${wd}`; }
    else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/** Общая шероховатость в правом верхнем углу: Ra X (√) */
function generalRa(sh: Sheet, f: Field, ra: number) {
  const x = f.x1 - 28, y = f.y0 + 14;
  sh.roughness(x, y, ra);
  sh.text(x + 17, y - 9.6, "(", "start", 5);
  const cx = x + 20.5, cy = y - 7;
  sh.line(cx - 1.4, cy - 1.6, cx, cy + 0.9, "thin");
  sh.line(cx, cy + 0.9, cx + 2.6, cy - 3.6, "thin");
  sh.text(x + 24, y - 9.6, ")", "start", 5);
}

/* ═══════════════════ ВАЛ ═══════════════════ */

function shaftDrawing(m: PartModel, s: ShaftParams): DrawingResult {
  const L = totalLength(s);
  const Dmax = Math.max(...s.sections.map((x) => x.d));
  const nk = s.keyways.length;
  const needW = (k: number) => L * k + 50 + s.keyways.reduce((a, kw) => a + s.sections[kw.section].d * k + 24, 0) + (nk ? 14 : 0);

  // Лист и масштаб: сначала A4, затем A3; наибольший масштаб, при котором вид + сечения
  // помещаются по ширине, а вид с размерами — по высоте над техтребованиями
  const needH = (k: number) => Dmax * k + 60;
  let paper: DrawingResult["paper"] = "A4 горизонт.";
  let W = 297, H = 210, k = 0.05, label = "1:20";
  outer: for (const [pp, w, h] of [["A4 горизонт.", 297, 210], ["A3 горизонт.", 420, 297]] as const) {
    for (const [kk, lb] of SCALES) {
      if (needW(kk) <= w - 25 && needH(kk) <= h - 10 - 55 - 30) {
        paper = pp; W = w; H = h; k = kk; label = lb;
        if (pp === "A3 горизонт." || kk >= 1) break outer;
        break;
      }
    }
  }
  if (paper === "A4 горизонт." && k < 1) {
    for (const [kk, lb] of SCALES) if (needW(kk) <= 395 && needH(kk) <= 202 && kk > k) { paper = "A3 горизонт."; W = 420; H = 297; k = kk; label = lb; break; }
  }

  const f = field(W, H);
  const sh = new Sheet();
  generalRa(sh, f, m.ra_general);

  const viewW = L * k;
  const sectW = nk ? s.keyways.reduce((a, kw) => a + s.sections[kw.section].d * k + 24, 0) + 14 : 0;
  const left = f.x0 + Math.max(22, (f.x1 - f.x0 - viewW - sectW - 26) / 2);
  const reqTop = requirements(sh, f, m, m.hardness ? [`${m.hardness}.`] : []);
  const cy = f.y0 + 22 + Math.min((Dmax * k) / 2 + 8 * Math.max(1, s.sections.length > 4 ? 2 : 1), (reqTop - f.y0) / 2);
  const X = (mm: number) => left + mm * k;
  const R = (d: number) => (d / 2) * k;
  const c = s.chamfer * k;
  const n = s.sections.length;

  // ── контур ступеней ──
  const xs: number[] = [0];
  s.sections.forEach((sec) => xs.push(xs[xs.length - 1] + sec.l));
  s.sections.forEach((sec, i) => {
    const xa = X(xs[i]), xb = X(xs[i + 1]), r = R(sec.d);
    const ca = i === 0 ? c : 0, cb = i === n - 1 ? c : 0;
    sh.line(xa + ca, cy - r, xb - cb, cy - r);
    sh.line(xa + ca, cy + r, xb - cb, cy + r);
    if (ca) { sh.line(xa, cy - r + ca, xa + ca, cy - r); sh.line(xa, cy + r - ca, xa + ca, cy + r); sh.line(xa + ca, cy - r, xa + ca, cy + r, "main"); }
    if (cb) { sh.line(xb, cy - r + cb, xb - cb, cy - r); sh.line(xb, cy + r - cb, xb - cb, cy + r); sh.line(xb - cb, cy - r, xb - cb, cy + r, "main"); }
    if (i === 0) sh.line(xa, cy - r + ca, xa, cy + r - ca);
    if (i === n - 1) sh.line(xb, cy - r + cb, xb, cy + r - cb);
    if (i < n - 1) {
      const rn = R(s.sections[i + 1].d);
      sh.line(xb, cy - Math.max(r, rn), xb, cy + Math.max(r, rn));
    }
    if (sec.thread) {
      const rin = r * 0.85;
      sh.line(xa + ca, cy - rin, xb - cb, cy - rin, "thin");
      sh.line(xa + ca, cy + rin, xb - cb, cy + rin, "thin");
    }
  });
  sh.line(X(0) - 5, cy, X(L) + 5, cy, "axis");

  // ── осевое отверстие: местный/полный разрез в нижней половине ──
  if (s.bore) {
    const bl = s.bore.l > 0 ? Math.min(s.bore.l, L) : L;
    const rb = R(s.bore.d);
    sh.line(X(0), cy + rb, X(bl), cy + rb);
    sh.line(X(0), cy - rb, X(bl), cy - rb, "hidden");
    if (bl < L) sh.line(X(bl), cy - rb, X(bl), cy + rb);
    const base = s.sections.map((sec, i) => ({ rect: [X(xs[i]), cy, X(xs[i + 1]), cy + R(sec.d)] as [number, number, number, number] }));
    sh.hatch(base, [{ rect: [X(0), cy - 1, X(bl), cy + rb] }]);
    sh.leader(X(Math.min(bl, s.sections[0].l) * 0.5), cy + rb * 0.6, -8, 0, "", true);
    sh.text(X(0) - 6, cy + rb * 0.6 - 3, tolText(s.bore.d, s.bore.tol), "end");
  }

  // ── шпоночные пазы на виде (вид сверху на паз — прямоугольник со скруглениями) ──
  s.keyways.forEach((kw) => {
    const xa = X(xs[kw.section] + kw.from), xb = xa + kw.l * k, hw = (kw.b / 2) * k;
    const rr = Math.min(hw, (xb - xa) / 2);
    sh.line(xa + rr, cy - hw, xb - rr, cy - hw);
    sh.line(xa + rr, cy + hw, xb - rr, cy + hw);
    sh.arc(xa + rr, cy, rr, 90, 270);
    sh.arc(xb - rr, cy, rr, 270, 450);
  });

  // ── диаметры: размерные линии вертикально внутри ступени ──
  s.sections.forEach((sec, i) => {
    // размер диаметра — в свободном от паза промежутке ступени
    const kw = s.keyways.find((q) => q.section === i);
    let xm = X((xs[i] + xs[i + 1]) / 2);
    if (kw) {
      const gapL = kw.from, gapR = sec.l - kw.from - kw.l;
      xm = gapL >= gapR ? X(xs[i] + gapL / 2) : X(xs[i + 1] - gapR / 2);
    }
    const txt = sec.thread ? sec.thread : tolText(sec.d, sec.tol);
    sh.vdim(cy - R(sec.d), cy + R(sec.d), xm, xm, xm, txt);
    if (sec.ra && sec.ra < m.ra_general) sh.roughness(X(xs[i]) + Math.min(4, sec.l * k * 0.25), cy - R(sec.d), sec.ra);
  });

  // ── длины: цепочка снизу + габарит ──
  const yChain = cy + R(Dmax) + 10;
  s.sections.forEach((sec, i) => {
    const rA = R(s.sections[i].d), rB = R(sec.d);
    const yA = i > 0 ? cy + Math.max(R(s.sections[i - 1].d), rA) : cy + rA;
    sh.hdim(X(xs[i]), X(xs[i + 1]), Math.min(yA, cy + rA), cy + rB, yChain, fmt(sec.l));
  });
  sh.hdim(X(0), X(L), cy + R(s.sections[0].d), cy + R(s.sections[n - 1].d), yChain + 9, fmt(L));
  if (s.chamfer > 0) sh.leader(X(0), cy - R(s.sections[0].d) + c / 2, -6, -9, `${fmt(s.chamfer)}×45°`);

  // ── сечения по шпоночным пазам ──
  let sx = X(L) + 26;
  s.keyways.forEach((kw, j) => {
    const sec = s.sections[kw.section];
    const letter = "АБВГДЕЖИ"[j];
    const xm = X(xs[kw.section] + kw.from + kw.l / 2);
    const top = cy - R(Dmax) - 6, bot = cy + R(Dmax) + 4;
    sh.line(xm, top, xm, top + 5);
    sh.line(xm, bot - 5, xm, bot);
    sh.arrow(xm + 4, top + 1, 0); sh.line(xm, top + 1, xm + 4, top + 1, "thin");
    sh.arrow(xm + 4, bot - 1, 0); sh.line(xm, bot - 1, xm + 4, bot - 1, "thin");
    sh.text(xm + 6, top + 2.6, letter, "start", 5);
    sh.text(xm + 6, bot + 1.5, letter, "start", 5);

    const r = R(sec.d);
    const scx = sx + r, scy = cy;
    const hw = (kw.b / 2) * k, depth = kw.t1 * k;
    const yb = scy - r + depth;
    const xe = Math.sqrt(Math.max(r * r - hw * hw, 0));
    const startDeg = (Math.atan2(-xe, hw) * 180) / Math.PI;
    const endDeg = 360 + (Math.atan2(-xe, -hw) * 180) / Math.PI;
    sh.arc(scx, scy, r, startDeg, endDeg);
    sh.line(scx - hw, scy - xe, scx - hw, yb);
    sh.line(scx + hw, scy - xe, scx + hw, yb);
    sh.line(scx - hw, yb, scx + hw, yb);
    sh.hatch([{ circle: [scx, scy, r] }], [{ rect: [scx - hw, scy - r - 1, scx + hw, yb] }]);
    sh.line(scx - r - 3, scy, scx + r + 3, scy, "axis");
    sh.line(scx, scy - r - 3, scx, scy + r + 3, "axis");
    sh.text(scx, scy - r - 10, `${letter}–${letter}`, "middle", 5);
    sh.hdim(scx - hw, scx + hw, scy - xe, scy - xe, scy - r - 5, `${fmt(kw.b)}P9`);
    sh.vdim(yb, scy + r, scx + hw, scx, scx + r + 7, fmt(sec.d - kw.t1));
    sx += 2 * r + 24;
  });

  // ── шпоночный паз: длина над видом ──
  s.keyways.forEach((kw) => {
    const xa = X(xs[kw.section] + kw.from);
    const sec = s.sections[kw.section];
    sh.hdim(xa, xa + kw.l * k, cy - (kw.b / 2) * k, cy - (kw.b / 2) * k, cy - R(Dmax) - 12, fmt(kw.l));
    if (kw.from > 0) sh.hdim(X(xs[kw.section]), xa, cy - R(sec.d), cy - (kw.b / 2) * k, cy - R(Dmax) - 12, fmt(kw.from));
  });

  if (s.center_holes) sh.text(f.x0 + 4, reqTop - 2, "Центровые отверстия — по ГОСТ 14034, форма A.", "start", 3);

  return { prims: sh.prims, paper, scale: label, sheetW: W, sheetH: H };
}

/* ═══════════════════ ДИСК / ФЛАНЕЦ ═══════════════════ */

function discDrawing(m: PartModel, d: DiscParams): DrawingResult {
  const Ht = Math.max(d.H, d.hub?.h ?? 0);
  let paper: DrawingResult["paper"] = "A4 горизонт.";
  let W = 297, H = 210;
  const avail = (w: number, h: number) => [(w - 25 - 50) / 2, h - 70 - 40] as const;
  let [aw, ah] = avail(W, H);
  let [k, label] = pickScale(Math.max(d.D, Ht + 40), d.D, aw, ah);
  if (k < 0.5) { paper = "A3 горизонт."; W = 420; H = 297; [aw, ah] = avail(W, H); [k, label] = pickScale(Math.max(d.D, Ht + 40), d.D, aw, ah); }

  const f = field(W, H);
  const sh = new Sheet();
  generalRa(sh, f, d.ra_faces);
  const reqTop = requirements(sh, f, m, m.hardness ? [`${m.hardness}.`] : []);
  const R = (v: number) => (v / 2) * k;
  const cy = f.y0 + Math.max(R(d.D) + 18, (reqTop - f.y0) / 2);

  // ── главный вид: разрез (фронтальный), ось вертикально ──
  const fx = f.x0 + 30;
  const h = d.H * k, hh = (d.hub?.h ?? d.H) * k;
  const xL = fx, xR = fx + h, xHub = fx + hh;
  const rD = R(d.D), rB = R(d.bore.d), rH = d.hub ? R(d.hub.d) : 0;
  const c = d.chamfer * k;
  const cb = rB > 0 ? c : 0;

  const outline = (sgn: 1 | -1) => {
    const y = (v: number) => cy + sgn * v;
    sh.line(xL, y(rB + cb), xL, y(rD - c));
    sh.line(xL, y(rD - c), xL + c, y(rD));
    sh.line(xL + c, y(rD), xR - c, y(rD));
    sh.line(xR - c, y(rD), xR, y(rD - c));
    if (d.hub) {
      sh.line(xR, y(rD - c), xR, y(rH));
      sh.line(xR, y(rH), xHub, y(rH));
      sh.line(xHub, y(rH), xHub, y(rB + cb));
    } else sh.line(xR, y(rD - c), xR, y(rB + cb));
    sh.line(xL, y(rB + cb), xL + cb, y(rB));
    if (rB > 0) sh.line(xL + cb, y(rB), xHub - cb, y(rB));
    sh.line(xHub - cb, y(rB), xHub, y(rB + cb));
  };
  outline(-1); outline(1);
  if (rB > 0) {
    sh.line(xL + cb, cy - rB, xL + cb, cy + rB, "main");
    sh.line(xHub - cb, cy - rB, xHub - cb, cy + rB, "main");
  }

  const solid = (sgn: 1 | -1): { rect: [number, number, number, number] }[] => {
    const parts: { rect: [number, number, number, number] }[] = [{ rect: [xL, cy + sgn * rB, xR, cy + sgn * rD] }];
    if (d.hub) parts.push({ rect: [xR, cy + sgn * rB, xHub, cy + sgn * rH] });
    return parts;
  };
  const holeR = d.holes ? R(d.holes.d) : 0;
  const pcdR = d.holes ? R(d.holes.pcd) : 0;
  const holeCuts = d.holes ? [{ rect: [xL - 1, cy - pcdR - holeR, xR + 1, cy - pcdR + holeR] as [number, number, number, number] },
    { rect: [xL - 1, cy + pcdR - holeR, xR + 1, cy + pcdR + holeR] as [number, number, number, number] }] : [];
  sh.hatch([...solid(-1), ...solid(1)], holeCuts);
  if (d.holes) {
    [-1, 1].forEach((sg) => {
      sh.line(xL, cy + sg * pcdR - holeR, xR, cy + sg * pcdR - holeR);
      sh.line(xL, cy + sg * pcdR + holeR, xR, cy + sg * pcdR + holeR);
      sh.line(xL - 3, cy + sg * pcdR, xR + 3, cy + sg * pcdR, "axis");
    });
  }
  if (d.keyway) {
    const t = d.keyway.t2 * k;
    sh.line(xL, cy - rB - t, xHub, cy - rB - t);
    sh.line(xL, cy - rB, xL, cy - rB - t);
  }
  sh.line(xL - 6, cy, xHub + 6, cy, "axis");

  // размеры главного вида
  sh.vdim(cy - rD, cy + rD, xL, xL, xL - 12, tolText(d.D, d.D_tol));
  if (rB > 0) sh.vdim(cy - rB, cy + rB, xHub, xHub, xHub + 8, tolText(d.bore.d, d.bore.tol));
  if (d.hub) sh.vdim(cy - rH, cy + rH, xHub, xHub, xHub + 18, tolText(d.hub.d, null));
  sh.hdim(xL, xR, cy + rD, cy + rD, cy + rD + 8, fmt(d.H));
  if (d.hub) sh.hdim(xL, xHub, cy + rD, cy + rH, cy + rD + 16, fmt(d.hub.h));
  if (d.chamfer > 0) sh.leader(xL + c / 2, cy - rD + c / 2, -6, -8, `${fmt(d.chamfer)}×45°`);
  if (rB > 0) sh.roughness(xL + c + 3, cy - rB, d.ra_bore);

  // ── вид слева ──
  const lx = Math.max(xHub + 50, f.x0 + (f.x1 - f.x0) * 0.55);
  const vcx = lx + rD;
  sh.circle(vcx, cy, rD);
  sh.circle(vcx, cy, rD - c, "thin");
  if (rB > 0) sh.circle(vcx, cy, rB);
  if (d.hub) sh.circle(vcx, cy, rH, "hidden");
  if (d.keyway) {
    const hw = R(d.keyway.b), t = d.keyway.t2 * k;
    const ye = Math.sqrt(Math.max(rB * rB - hw * hw, 0));
    sh.line(vcx - hw, cy - ye, vcx - hw, cy - rB - t);
    sh.line(vcx + hw, cy - ye, vcx + hw, cy - rB - t);
    sh.line(vcx - hw, cy - rB - t, vcx + hw, cy - rB - t);
    sh.hdim(vcx - hw, vcx + hw, cy - rB - t, cy - rB - t, cy - rB - t - 6, `${fmt(d.keyway.b)}Js9`);
  }
  sh.line(vcx - rD - 4, cy, vcx + rD + 4, cy, "axis");
  sh.line(vcx, cy - rD - 4, vcx, cy + rD + 4, "axis");
  if (d.holes) {
    sh.circle(vcx, cy, pcdR, "axis");
    for (let i = 0; i < d.holes.n; i++) {
      const a = (2 * Math.PI * i) / d.holes.n - Math.PI / 2;
      sh.circle(vcx + pcdR * Math.cos(a), cy + pcdR * Math.sin(a), holeR);
    }
    const a1 = -Math.PI / 2 + (2 * Math.PI) / d.holes.n;
    const hx = vcx + pcdR * Math.cos(a1), hy = cy + pcdR * Math.sin(a1);
    sh.leader(hx + holeR * 0.7, hy - holeR * 0.7, 10, -12, `${d.holes.n} отв. ∅${fmt(d.holes.d)}`);
    sh.leader(vcx - pcdR * 0.707, cy + pcdR * 0.707, -12, 10, `∅${fmt(d.holes.pcd)}`);
  }

  return { prims: sh.prims, paper, scale: label, sheetW: W, sheetH: H };
}

/* ═══════════════════ ПЛИТА ═══════════════════ */

function plateDrawing(m: PartModel, p: PlateParams): DrawingResult {
  let paper: DrawingResult["paper"] = "A4 горизонт.";
  let W = 297, H = 210;
  const nx = new Set(p.holes.map((ho) => ho.x)).size, ny = new Set(p.holes.map((ho) => ho.y)).size;
  const fit = (w: number, h: number) => pickScale(p.L + 30, p.W + p.H + 30, w - 50 - ny * 7, h - 70 - 50 - nx * 7);
  let [k, label] = fit(W, H);
  if (k < 0.5) { paper = "A3 горизонт."; W = 420; H = 297; [k, label] = fit(W, H); }

  const f = field(W, H);
  const sh = new Sheet();
  generalRa(sh, f, p.ra_faces);
  requirements(sh, f, m, m.hardness ? [`${m.hardness}.`] : []);

  const w = p.L * k, h = p.W * k, t = p.H * k;
  const x0 = f.x0 + 25 + ny * 7;
  const yFront = f.y0 + 25;
  const yTop = yFront + t + 22;
  const c = p.chamfer * k;

  const ux = [...new Set(p.holes.map((ho) => ho.x))].sort((a, b) => a - b);
  const uy = [...new Set(p.holes.map((ho) => ho.y))].sort((a, b) => a - b);

  // главный вид (по высоте плиты)
  sh.line(x0 + c, yFront, x0 + w - c, yFront);
  sh.line(x0, yFront + c, x0, yFront + t);
  sh.line(x0 + w, yFront + c, x0 + w, yFront + t);
  sh.line(x0, yFront + t, x0 + w, yFront + t);
  if (c) { sh.line(x0, yFront + c, x0 + c, yFront); sh.line(x0 + w, yFront + c, x0 + w - c, yFront); }
  p.holes.forEach((ho) => {
    const hx = x0 + ho.x * k, r = (ho.d / 2) * k;
    sh.line(hx - r, yFront, hx - r, yFront + t, "hidden");
    sh.line(hx + r, yFront, hx + r, yFront + t, "hidden");
    sh.line(hx, yFront - 2, hx, yFront + t + 2, "axis");
  });
  sh.vdim(yFront, yFront + t, x0 + w, x0 + w, x0 + w + 8, fmt(p.H));

  // вид сверху
  sh.line(x0, yTop, x0 + w, yTop);
  sh.line(x0, yTop + h, x0 + w, yTop + h);
  sh.line(x0, yTop, x0, yTop + h);
  sh.line(x0 + w, yTop, x0 + w, yTop + h);
  p.holes.forEach((ho) => {
    const hx = x0 + ho.x * k, hy = yTop + ho.y * k, r = (ho.d / 2) * k;
    sh.circle(hx, hy, r);
    if (ho.thread) sh.arc(hx, hy, r * 1.18, 0, 270, "thin");
    sh.line(hx - r - 2, hy, hx + r + 2, hy, "axis");
    sh.line(hx, hy - r - 2, hx, hy + r + 2, "axis");
  });
  sh.hdim(x0, x0 + w, yTop + h, yTop + h, yTop + h + 8 + Math.max(ux.length, 1) * 7, fmt(p.L));
  sh.vdim(yTop, yTop + h, x0, x0, x0 - 8 - Math.max(uy.length, 1) * 7, fmt(p.W));

  // координатный метод: размеры от базовых кромок, каждый на своём уровне
  ux.forEach((hx, i) => sh.hdim(x0, x0 + hx * k, yTop + h, yTop + h, yTop + h + 8 + i * 7, fmt(hx)));
  uy.forEach((hy, i) => sh.vdim(yTop, yTop + hy * k, x0, x0, x0 - 8 - i * 7, fmt(hy)));

  // группы отверстий одного типа — одна выноска
  const groups = new Map<string, typeof p.holes>();
  p.holes.forEach((ho) => {
    const key = ho.thread ?? `∅${fmt(ho.d)}`;
    groups.set(key, [...(groups.get(key) ?? []), ho]);
  });
  let gi = 0;
  groups.forEach((list, key) => {
    const ho = list[0];
    const hx = x0 + ho.x * k, hy = yTop + ho.y * k, r = (ho.d / 2) * k;
    sh.leader(hx + r * 0.7, hy - r * 0.7, 10 + gi * 4, -10 - gi * 6, `${list.length > 1 ? `${list.length} отв. ` : ""}${key}`);
    gi++;
  });
  if (p.chamfer > 0) sh.leader(x0 + c / 2, yFront + c / 2, -6, -8, `${fmt(p.chamfer)}×45°`);

  return { prims: sh.prims, paper, scale: label, sheetW: W, sheetH: H };
}
