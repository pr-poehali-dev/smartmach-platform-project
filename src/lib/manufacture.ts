import { apiGet, apiPost, apiPut } from "@/lib/api";

export async function mGet<T>(resource: string, extra?: string): Promise<T> {
  const params: Record<string, string> = { resource };
  if (extra) extra.split("&").forEach((pair) => { const [k, v] = pair.split("="); if (k) params[k] = v ?? ""; });
  return apiGet<T>("manufacture", "/", params);
}

export interface PartsPage { items: Part[]; total: number; limit: number; offset: number; }

export async function mGetParts(opts: {
  templates?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PartsPage> {
  const params: Record<string, string | number> = { resource: "parts" };
  if (opts.templates !== undefined) params.templates = opts.templates ? "1" : "0";
  if (opts.search?.trim()) params.search = opts.search.trim();
  if (opts.limit !== undefined) params.limit = opts.limit;
  if (opts.offset !== undefined) params.offset = opts.offset;
  return apiGet<PartsPage>("manufacture", "/", params);
}

export async function mPost<T>(resource: string, body: object): Promise<T> {
  return apiPost<T>("manufacture", body, { resource });
}

export async function mPut(resource: string, id: number, body: object): Promise<void> {
  return apiPut<void>("manufacture", body, { resource, id });
}

export interface User { id: number; name: string; email: string; role: string }
export interface Part {
  id: number; code: string; name: string; material: string | null;
  version: string; status: string; collisions: number; notes: string | null;
  category: string; is_template: boolean;
  dimensions: string | null; weight_kg: number | null; standard: string | null;
  author_name: string | null; product_name: string | null; product_code: string | null;
  created_at: string; updated_at: string;
}
export interface Machine {
  id: number; name: string; type: string; status: string; load_pct: number;
  program: string | null; notes: string | null; operator_name: string | null; updated_at: string;
}
export interface Program {
  id: number; name: string; code: string | null; status: string; est_time: string | null;
  started_at: string | null; finished_at: string | null; created_at: string;
  part_name: string | null; part_code: string | null;
  machine_name: string | null; author_name: string | null;
}
export interface Simulation {
  id: number; name: string; sim_type: string; status: string;
  result: string | null; stress_pct: number | null; created_at: string; updated_at: string;
  part_name: string | null; part_code: string | null; author_name: string | null;
}
export interface Job {
  id: number; status: string; priority: string; qty: number;
  due_date: string | null; notes: string | null; created_at: string; updated_at: string;
  product_name: string | null; product_code: string | null;
  part_name: string | null; part_code: string | null;
  machine_name: string | null; assignee_name: string | null;
}
export interface Stats {
  parts_total: number; machines_total: number; machines_running: number;
  programs_running: number; jobs_active: number; jobs_done: number;
  sims_error: number; products_total: number;
}