import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Icon from "@/components/ui/icon";
import SeoHead from "@/components/ui/seo-head";
import { PAGE_SEO } from "@/lib/seo.data";

type Mode = "login" | "register";

const ROLES = [
  { value: "engineer",     label: "Инженер" },
  { value: "technologist", label: "Технолог" },
  { value: "admin",        label: "Администратор" },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, error, setError } = useAuth();

  const [mode,        setMode]        = useState<Mode>("login");
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [role,        setRole]        = useState("engineer");
  const [companyName, setCompanyName] = useState("");
  const [busy,        setBusy]        = useState(false);

  const switchMode = (m: Mode) => { setMode(m); setError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let ok = false;
    if (mode === "login") {
      ok = await login(email, password);
    } else {
      ok = await register(name, email, password, role, companyName || undefined);
    }
    setBusy(false);
    if (ok) navigate("/platform");
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <SeoHead {...PAGE_SEO.auth} />
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Icon name="Cog" size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">SmartMach</span>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">

          <div className="flex rounded-xl bg-gray-800 p-1 mb-6">
            {(["login", "register"] as Mode[]).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Имя</label>
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Петров"
                  required
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@company.ru"
                required
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Пароль</label>
              <input
                type="password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "Минимум 6 символов" : "••••••••"}
                required
                minLength={mode === "register" ? 6 : 1}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Роль</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Название предприятия
                    <span className="text-gray-600 ml-1">(необязательно)</span>
                  </label>
                  <input
                    value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="ООО «Станкозавод»"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Создаст отдельное пространство данных для вашего предприятия
                  </p>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
                <Icon name="AlertCircle" size={14} />
                {error}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors mt-2">
              {busy
                ? <><Icon name="Loader2" size={16} className="animate-spin" />Подождите...</>
                : mode === "login" ? "Войти в систему" : "Создать аккаунт"
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          SmartMach Platform · Производственная система
        </p>
      </div>
    </div>
  );
}
