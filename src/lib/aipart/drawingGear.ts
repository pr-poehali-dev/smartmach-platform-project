/**
 * Рабочий чертёж цилиндрического зубчатого колеса по ГОСТ 2.403-75 и условностям ГОСТ 2.402-68:
 * — главный вид — фронтальный разрез; в разрезе зуб не штрихуется, впадина показана основной линией,
 *   окружность вершин — основной, делительная — штрихпунктирной;
 * — вид слева упрощённый: окружности вершин (основная) и делительная (штрихпунктир), впадины не показываются;
 * — таблица параметров в правом верхнем углу поля чертежа (ширина 110 мм: 65 + 10 + 35, строки 8 мм).
 */
import { Sheet } from "@/lib/aipart/geom";
import { fmt } from "@/lib/aipart/model";
import { type GearParams, gearGeometry, gearTable } from "@/lib/aipart/gear";

const TABLE_W = [65, 10, 35];
const ROW_H = 8;

export function gearTableHeight(g: GearParams) {
  return gearTable(g, gearGeometry(g)).length * ROW_H;
}

/** Таблица параметров: верхний правый угол поля, примыкает к рамке */
export function drawGearTable(sh: Sheet, g: GearParams, xRight: number, yTop: number) {
  const rows = gearTable(g, gearGeometry(g));
  const W = TABLE_W.reduce((a, b) => a + b, 0);
  const x0 = xRight - W;
  const H = rows.length * ROW_H;
  sh.line(x0, yTop, x0, yTop + H);
  sh.line(x0, yTop + H, xRight, yTop + H);
  const xs = [x0, x0 + TABLE_W[0], x0 + TABLE_W[0] + TABLE_W[1]];
  xs.slice(1).forEach((x) => sh.line(x, yTop, x, yTop + H, "thin"));
  rows.forEach((r, i) => {
    const y = yTop + (i + 1) * ROW_H;
    if (i < rows.length - 1) sh.line(x0, y, xRight, y, "thin");
    // разделитель групп ГОСТ 2.403: основная линия перед делительным диаметром (справочные данные)
    if (r[0] === "Делительный диаметр") sh.line(x0, y - ROW_H, xRight, y - ROW_H, "main");
    const base = y - 2.4;
    sh.text(x0 + 1.5, base, r[0], "start", r[0].length > 30 ? 2.6 : 3);
    sh.text(xs[1] + TABLE_W[1] / 2, base, r[1], "middle", 3);
    sh.text(xs[2] + TABLE_W[2] / 2, base, r[2], "middle", r[2].length > 14 ? 2.6 : 3);
  });
  return { x0, H };
}

export function gearDrawing(g: GearParams, field: { x0: number; y0: number; x1: number; y1: number; stampTop: number; stampLeft: number },
  scale: number, sh: Sheet, reqTop: number) {
  const geo = gearGeometry(g);
  const k = scale;
  const R = (d: number) => (d / 2) * k;
  const Bt = Math.max(g.b, g.hub?.h ?? 0);
  const { x0: tableX0 } = drawGearTable(sh, g, field.x1, field.y0);

  const rA = R(geo.da), rP = R(geo.d), rF = R(geo.df), rB = R(g.bore.d);
  const cy = field.y0 + Math.max(rA + 16, (reqTop - field.y0) / 2);

  // ── главный вид: разрез, ось колеса горизонтальна ──
  const xL = field.x0 + 30;
  const bw = g.b * k;
  const hubOff = g.hub ? ((g.hub.h - g.b) / 2) * k : 0;
  const xW0 = xL, xW1 = xL + bw;
  const xH0 = xL - hubOff, xH1 = xL + bw + hubOff;
  const c = Math.min(g.chamfer * k, (rA - rF) * 0.6);
  const rimIn = g.web ? R(g.web.d_rim) : 0;
  const hubR = g.hub ? R(g.hub.d) : 0;
  const webT = g.web ? g.web.t * k : 0;
  const xT0 = xL + (bw - webT) / 2, xT1 = xT0 + webT;
  const innerR = g.hub ? hubR : rB;

  for (const sg of [-1, 1] as const) {
    const y = (v: number) => cy + sg * v;
    // венец: вершины с фасками
    sh.line(xW0, y(rA - c), xW0 + c, y(rA));
    sh.line(xW0 + c, y(rA), xW1 - c, y(rA));
    sh.line(xW1 - c, y(rA), xW1, y(rA - c));
    // впадина в разрезе — основная линия (ГОСТ 2.402 п.6)
    sh.line(xW0, y(rF), xW1, y(rF));
    // делительная — штрихпунктир с выходом за торцы
    sh.line(xW0 - 2, y(rP), xW1 + 2, y(rP), "axis");

    if (g.web) {
      // обод → диск → ступица
      sh.line(xW0, y(rA - c), xW0, y(rimIn));
      sh.line(xW1, y(rA - c), xW1, y(rimIn));
      sh.line(xW0, y(rimIn), xT0, y(rimIn));
      sh.line(xT1, y(rimIn), xW1, y(rimIn));
      sh.line(xT0, y(rimIn), xT0, y(innerR));
      sh.line(xT1, y(rimIn), xT1, y(innerR));
      if (g.hub) {
        sh.line(xH0, y(hubR), xT0, y(hubR));
        sh.line(xT1, y(hubR), xH1, y(hubR));
      }
    } else if (g.hub) {
      sh.line(xW0, y(rA - c), xW0, y(hubR));
      sh.line(xW1, y(rA - c), xW1, y(hubR));
      sh.line(xH0, y(hubR), xW0, y(hubR));
      sh.line(xW1, y(hubR), xH1, y(hubR));
    } else {
      sh.line(xW0, y(rA - c), xW0, y(rB));
      sh.line(xW1, y(rA - c), xW1, y(rB));
    }
    const hx0 = g.hub ? xH0 : xW0, hx1 = g.hub ? xH1 : xW1;
    if (g.hub) { sh.line(hx0, y(hubR), hx0, y(rB)); sh.line(hx1, y(hubR), hx1, y(rB)); }
    sh.line(hx0, y(rB), hx1, y(rB));

    // облегчающие отверстия в диске (в секущей плоскости — сверху и снизу)
    if (g.web?.holes) {
      const hr = R(g.web.holes.d), pr = R(g.web.holes.pcd);
      sh.line(xT0, y(pr - hr), xT1, y(pr - hr));
      sh.line(xT0, y(pr + hr), xT1, y(pr + hr));
      sh.line(xT0 - 2, y(pr), xT1 + 2, y(pr), "axis");
    }
  }

  // штриховка: тело колеса от отверстия до впадин; зубья не штрихуются
  const solids: { rect: [number, number, number, number] }[] = [];
  const holes: { rect: [number, number, number, number] }[] = [];
  for (const sg of [-1, 1] as const) {
    const Y = (v: number) => cy + sg * v;
    if (g.web) {
      solids.push({ rect: [xW0, Y(rimIn), xW1, Y(rF)] });
      solids.push({ rect: [xT0, Y(innerR), xT1, Y(rimIn)] });
      if (g.hub) solids.push({ rect: [xH0, Y(rB), xH1, Y(hubR)] });
      else solids.push({ rect: [xW0, Y(rB), xW1, Y(rB * 1.6 > rimIn ? rimIn : rB)] });
      if (g.web.holes) {
        const hr = R(g.web.holes.d), pr = R(g.web.holes.pcd);
        holes.push({ rect: [xT0 - 1, Y(pr - hr), xT1 + 1, Y(pr + hr)] });
      }
    } else {
      solids.push({ rect: [xW0, Y(rB), xW1, Y(rF)] });
      if (g.hub) solids.push({ rect: [xH0, Y(rB), xH1, Y(hubR)] });
    }
  }
  if (g.keyway) holes.push({ rect: [xL - hubOff - 1, cy - rB - g.keyway.t2 * k, xL + bw + hubOff + 1, cy - rB] });
  sh.hatch(solids, holes);
  if (g.keyway) {
    const yk = cy - rB - g.keyway.t2 * k;
    const hx0 = g.hub ? xH0 : xW0, hx1 = g.hub ? xH1 : xW1;
    sh.line(hx0, yk, hx1, yk);
  }
  sh.line(xH0 - 6, cy, xH1 + 6, cy, "axis");

  // размеры главного вида
  sh.vdim(cy - rA, cy + rA, xW0, xW0, xH0 - 22, `∅${fmt(geo.da)}h11`);
  sh.vdim(cy - rB, cy + rB, xH1, xH1, xH1 + 8, `∅${fmt(g.bore.d)}${g.bore.tol ?? ""}`);
  if (g.hub) sh.vdim(cy - hubR, cy + hubR, xH1, xH1, xH1 + 18, `∅${fmt(g.hub.d)}`);
  if (g.web) sh.vdim(cy - rimIn, cy + rimIn, xW1, xW1, xH1 + (g.hub ? 28 : 18), `∅${fmt(g.web.d_rim)}`);
  sh.hdim(xW0, xW1, cy + rA, cy + rA, cy + rA + 8, fmt(g.b));
  if (g.hub && g.hub.h !== g.b) sh.hdim(xH0, xH1, cy + hubR, cy + hubR, cy + rA + 16, fmt(g.hub.h));
  if (g.web) sh.hdim(xT0, xT1, cy - rimIn, cy - rimIn, cy - rA - 8, fmt(g.web.t));
  if (g.chamfer > 0) sh.leader(xW0 + c / 2, cy - rA + c / 2, -6, -8, `${fmt(g.chamfer)}×45°`);
  sh.roughness(xW1 - 2, cy - rA, g.ra_teeth);
  sh.roughness((g.hub ? xH0 : xW0) + 3, cy + rB, g.ra_bore);

  // ── вид слева (упрощённо по ГОСТ 2.402) ──
  const vcx = Math.min(Math.max(xH1 + 45 + rA, field.x0 + (field.x1 - field.x0) * 0.42), tableX0 - rA - 10);
  sh.circle(vcx, cy, rA);
  sh.circle(vcx, cy, rP, "axis");
  sh.circle(vcx, cy, rB);
  if (g.hub) sh.circle(vcx, cy, hubR, "hidden");
  if (g.web) sh.circle(vcx, cy, rimIn, "hidden");
  if (g.web?.holes) {
    const pr = R(g.web.holes.pcd), hr = R(g.web.holes.d);
    sh.circle(vcx, cy, pr, "axis");
    for (let i = 0; i < g.web.holes.n; i++) {
      const a = (2 * Math.PI * i) / g.web.holes.n - Math.PI / 2;
      sh.circle(vcx + pr * Math.cos(a), cy + pr * Math.sin(a), hr);
    }
    const a1 = -Math.PI / 2 + (2 * Math.PI) / g.web.holes.n;
    sh.leader(vcx + pr * Math.cos(a1) + hr * 0.7, cy + pr * Math.sin(a1) - hr * 0.7, 10, -10, `${g.web.holes.n} отв. ∅${fmt(g.web.holes.d)}`);
  }
  if (g.keyway) {
    const hw = R(g.keyway.b), t = g.keyway.t2 * k;
    const ye = Math.sqrt(Math.max(rB * rB - hw * hw, 0));
    sh.line(vcx - hw, cy - ye, vcx - hw, cy - rB - t);
    sh.line(vcx + hw, cy - ye, vcx + hw, cy - rB - t);
    sh.line(vcx - hw, cy - rB - t, vcx + hw, cy - rB - t);
    sh.hdim(vcx - hw, vcx + hw, cy - rB - t, cy - rB - t, cy - rB - t - 6, `${fmt(g.keyway.b)}Js9`);
    sh.vdim(cy - rB - t, cy + rB, vcx + hw, vcx, vcx + rB + 8, fmt(g.bore.d + g.keyway.t2));
  }
  sh.line(vcx - rA - 4, cy, vcx + rA + 4, cy, "axis");
  sh.line(vcx, cy - rA - 4, vcx, cy + rA + 4, "axis");

  return { Bt };
}
