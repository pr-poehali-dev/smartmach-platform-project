const BASE = "https://functions.poehali.dev/57502842-91ce-445e-baba-dbedb1afa234";

export async function mGet<T>(resource: string): Promise<T> {
  const res = await fetch(`${BASE}/?resource=${resource}`);
  if (!res.ok) throw new Error(`Ошибка загрузки ${resource}`);
  return res.json();
}

export async function mPost<T>(resource: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/?resource=${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ошибка создания ${resource}`);
  return res.json();
}

export async function mPut(resource: string, id: number, body: object): Promise<void> {
  const res = await fetch(`${BASE}/?resource=${resource}&id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ошибка обновления ${resource}`);
}

export interface User { id: number; name: string; email: string; role: string }
export interface Part {
  id: number; code: string; name: string; material: string | null;
  version: string; status: string; collisions: number; notes: string | null;
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
