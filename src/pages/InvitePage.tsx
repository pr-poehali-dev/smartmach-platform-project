import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import func2url from "../../backend/func2url.json";
import Icon from "@/components/ui/icon";

const COMPANY_URL = func2url["company-manage"];

interface InviteInfo {
  company_name: string;
  email: string | null;
  role: string;
  expires_at: string;
  plan: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  engineer: "Инженер",
  technologist: "Технолог",
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${COMPANY_URL}?action=join&token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setLoadError(d.error);
        else { setInfo(d); if (d.email) setEmail(d.email); }
      })
      .catch(() => setLoadError("Ошибка соединения"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch(`${COMPANY_URL}?action=join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, email, password }),
      });
      const d = await res.json();
      if (!res.ok) { setFormError(d.error ?? "Ошибка регистрации"); return; }
      localStorage.setItem("sm_session_id", d.session_id);
      window.location.href = "/platform";
    } catch {
      setFormError("Ошибка соединения с сервером.");
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full text-center">
          <Icon name="AlertCircle" size={40} className="text-yellow-400 mx-auto mb-4" />
          <h2 className="text-white font-semibold text-lg mb-2">Вы уже авторизованы</h2>
          <p className="text-gray-400 text-sm mb-6">Чтобы принять приглашение, сначала выйдите из текущего аккаунта.</p>
          <button onClick={() => navigate("/platform")}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            Перейти на платформу
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <Icon name="Loader2" size={32} className="animate-spin text-gray-400" />
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-700 rounded-2xl p-8 max-w-sm w-full text-center">
        <Icon name="XCircle" size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-white font-semibold text-lg mb-2">Приглашение недействительно</h2>
        <p className="text-gray-400 text-sm">{loadError}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Icon name="Cog" size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">SmartMach</span>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-700">
            <div className="w-10 h-10 rounded-xl bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Icon name="Building2" size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Вас приглашают в предприятие</p>
              <p className="text-white font-semibold">{info?.company_name}</p>
              <p className="text-xs text-blue-400">{ROLE_LABELS[info?.role ?? ""] ?? info?.role}</p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ваше имя</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Иван Петров" required
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ivan@company.ru" required readOnly={!!info?.email}
                className={`w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 ${info?.email ? "opacity-60 cursor-not-allowed" : ""}`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Придумайте пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 6 символов" required minLength={6}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
            </div>

            {formError && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
                <Icon name="AlertCircle" size={14} />
                {formError}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              {busy
                ? <><Icon name="Loader2" size={16} className="animate-spin" />Подождите...</>
                : "Принять приглашение и войти"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Приглашение действует до {info?.expires_at ? new Date(info.expires_at).toLocaleDateString("ru") : "—"}
        </p>
      </div>
    </div>
  );
}
