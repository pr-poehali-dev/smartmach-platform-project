import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import func2url from "../../backend/func2url.json";

const AUTH_URL    = func2url["auth"];
const SESSION_KEY = "sm_session_id";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "engineer" | "technologist";
  avatar_url: string | null;
  created_at: string;
  company_id: number | null;
  company_name: string | null;
  company_plan: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: string, companyName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  sessionId: () => string;
  createCompany: (name: string) => Promise<boolean>;
}

const Ctx = createContext<AuthCtx | null>(null);

function getSid() { return localStorage.getItem(SESSION_KEY) ?? ""; }
function setSid(s: string) { localStorage.setItem(SESSION_KEY, s); }
function clearSid() { localStorage.removeItem(SESSION_KEY); }

function authFetch(path: string, opts: RequestInit = {}) {
  const sid = getSid();
  return fetch(`${AUTH_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(sid ? { "X-Session-Id": sid } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const sid = getSid();
    if (!sid) { setLoading(false); return; }
    authFetch("/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setUser(d.user); else clearSid(); })
      .catch(() => clearSid())
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: string, companyName?: string) => {
    setError(null);
    try {
      const res = await authFetch("/register", { method: "POST", body: JSON.stringify({ name, email, password, role, company_name: companyName }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Ошибка регистрации"); return false; }
      setSid(d.session_id); setUser(d.user); return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("Ошибка: " + msg); return false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await authFetch("/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Ошибка входа"); return false; }
      setSid(d.session_id); setUser(d.user); return true;
    } catch {
      setError("Нет соединения с сервером. Проверьте интернет и попробуйте снова."); return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await authFetch("/logout", { method: "POST" }).catch(() => {});
    clearSid(); setUser(null);
  }, []);

  const createCompany = useCallback(async (name: string) => {
    setError(null);
    const res = await authFetch("/company", { method: "POST", body: JSON.stringify({ name }) });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "Ошибка создания предприятия"); return false; }
    if (d.user) setUser(d.user);
    return true;
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, error, setError, login, register, logout, sessionId: getSid, createCompany }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getAuthHeaders(): Record<string, string> {
  const sid = getSid();
  return sid ? { "X-Session-Id": sid } : {};
}