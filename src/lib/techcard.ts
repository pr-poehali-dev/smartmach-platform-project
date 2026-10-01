import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export interface TechStep {
  id: number; operation_id: number; step_no: number; description: string;
  tool: string | null; measuring_tool: string | null;
  diameter: number | string | null; length: number | string | null; overrun: number | string | null;
  depth: number | string | null; passes: number; feed: number | string | null;
  speed: number | string | null; spindle: number | string | null;
  t_main: number | string; manual_time: boolean;
}

export interface TechOperation {
  id: number; process_id: number; op_no: string; name: string;
  workshop: string | null; area: string | null;
  equipment_id: number | null; equipment_name: string | null; eq_name?: string | null; eq_model?: string | null;
  cam_program_id: number | null; cam_name?: string | null; cam_code?: string | null; cam_est?: string | null;
  fixture: string | null; profession: string | null; worker_rank: number | null; workers: number;
  t_aux: number | string; k_service_pct: number | string; t_pz: number | string;
  t_main: number | string; t_sht: number | string; t_sht_k: number | string;
  notes: string | null; steps: TechStep[];
}

export interface TechProcess {
  id: number; part_id: number | null; code: string; name: string; material: string | null;
  blank_type: string | null; blank_size: string | null;
  blank_mass: number | string | null; part_mass: number | string | null;
  batch_size: number; status: string;
  developer: string | null; checker: string | null; approver: string | null;
  notes: string | null; is_demo?: boolean;
  part_code?: string | null; part_name?: string | null; author_name?: string | null;
  operations: TechOperation[];
  total_t_sht: number; total_t_sht_k: number; total_t_pz: number;
  updated_at?: string;
}

export interface TechProcessListItem {
  id: number; code: string; name: string; material: string | null; status: string;
  batch_size: number; part_id: number | null; part_code: string | null; part_name: string | null;
  ops_count: number; total_t_sht: number | string; total_t_sht_k: number | string;
  is_demo: boolean; updated_at: string;
}

export const TP_STATUS: Record<string, { label: string; cls: string }> = {
  draft:    { label: "Черновик",    cls: "bg-slate-100 text-slate-700" },
  review:   { label: "На проверке", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Утверждён",   cls: "bg-green-100 text-green-800" },
  archive:  { label: "Архив",       cls: "bg-gray-100 text-gray-500" },
};

const q = (resource: string, extra: Record<string, string | number> = {}) => ({ resource, ...extra });

export const tcList = (partId?: number) =>
  apiGet<TechProcessListItem[]>("manufacture", "/", q("techcards", partId ? { part_id: partId } : {}));
export const tcGet = (id: number) => apiGet<TechProcess>("manufacture", "/", q("techcards", { id }));
export const tcCreate = (body: Partial<TechProcess>) =>
  apiPost<{ id: number }>("manufacture", body, q("techcards"));
export const tcUpdate = (id: number, body: Partial<TechProcess>) =>
  apiPut<TechProcess>("manufacture", body, q("techcards", { id }));
export const tcDelete = (id: number) => apiDelete("manufacture", q("techcards", { id }));

export const opCreate = (body: Partial<TechOperation> & { process_id: number }) =>
  apiPost<TechProcess>("manufacture", body, q("tech_ops"));
export const opUpdate = (id: number, body: Partial<TechOperation>) =>
  apiPut<TechProcess>("manufacture", body, q("tech_ops", { id }));
export const opDelete = (id: number) => apiDelete<TechProcess>("manufacture", q("tech_ops", { id }));

export const stepCreate = (body: Partial<TechStep> & { operation_id: number }) =>
  apiPost<TechProcess>("manufacture", body, q("tech_steps"));
export const stepUpdate = (id: number, body: Partial<TechStep>) =>
  apiPut<TechProcess>("manufacture", body, q("tech_steps", { id }));
export const stepDelete = (id: number) => apiDelete<TechProcess>("manufacture", q("tech_steps", { id }));

export const demoStatus = () => apiGet<{ loaded: boolean }>("manufacture", "/", q("demo"));
export const demoLoad = () => apiPost<Record<string, number>>("manufacture", {}, q("demo"));
export const demoClear = () => apiDelete("manufacture", q("demo"));

/* ── Расчёт (зеркало серверного — для мгновенной подсказки в форме) ── */

export const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** n = 1000·V / (π·D), об/мин */
export function spindleFromSpeed(speed: unknown, diameter: unknown): number | null {
  const v = toNum(speed), d = toNum(diameter);
  if (!v || !d) return null;
  return Math.round((1000 * v) / (Math.PI * d) * 10) / 10;
}

/** То = (L + l_вр)·i / (n·S), мин */
export function mainTime(length: unknown, overrun: unknown, passes: unknown, spindle: unknown, feed: unknown): number | null {
  const l = toNum(length), n = toNum(spindle), s = toNum(feed);
  if (!l || !n || !s) return null;
  const i = toNum(passes) || 1;
  return Math.round(((l + (toNum(overrun) || 0)) * i) / (n * s) * 1000) / 1000;
}

/** Тшт = (То + Тв)·(1 + К/100); Тшк = Тшт + Тпз/N */
export function opTimes(tMain: number, tAux: unknown, kPct: unknown, tPz: unknown, batch: number) {
  const tSht = (tMain + (toNum(tAux) || 0)) * (1 + (toNum(kPct) ?? 8) / 100);
  const tShtK = tSht + (toNum(tPz) || 0) / Math.max(batch || 1, 1);
  return { tSht: Math.round(tSht * 1000) / 1000, tShtK: Math.round(tShtK * 1000) / 1000 };
}

/** Минуты → «1 ч 25 мин» */
export function fmtMin(v: unknown): string {
  const m = toNum(v);
  if (m === null) return "—";
  if (m < 60) return `${m.toFixed(m < 10 ? 2 : 1).replace(".", ",")} мин`;
  const h = Math.floor(m / 60);
  return `${h} ч ${Math.round(m - h * 60)} мин`;
}

export const fmtNum = (v: unknown, digits = 2): string => {
  const n = toNum(v);
  return n === null ? "" : String(Number(n.toFixed(digits))).replace(".", ",");
};
