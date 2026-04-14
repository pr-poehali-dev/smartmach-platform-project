/* eslint-disable @typescript-eslint/no-explicit-any */
import func2url from "../../backend/func2url.json";
import { getAuthHeaders } from "@/context/AuthContext";

export const URLS = func2url as Record<string, string>;

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "Content-Type": "application/json", ...getAuthHeaders(), ...extra };
}

export async function apiGet<T>(fn: keyof typeof func2url, path = "", params?: Record<string, string | number>): Promise<T> {
  const url = new URL(URLS[fn]);
  if (path) url.pathname += path;
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { headers: buildHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Ошибка ${fn}: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(fn: keyof typeof func2url, body: object, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(URLS[fn]);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Ошибка ${fn}: ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T = void>(fn: keyof typeof func2url, body: object, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(URLS[fn]);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Ошибка ${fn}: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiDelete<T = void>(fn: keyof typeof func2url, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(URLS[fn]);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Ошибка ${fn}: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiRaw(fn: keyof typeof func2url, path = "", opts: RequestInit = {}, params?: Record<string, string | number>): Promise<Response> {
  const url = new URL(URLS[fn]);
  if (path) url.pathname += path;
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  return fetch(url.toString(), {
    ...opts,
    headers: { ...buildHeaders(), ...(opts.headers as Record<string, string> ?? {}) },
  });
}
