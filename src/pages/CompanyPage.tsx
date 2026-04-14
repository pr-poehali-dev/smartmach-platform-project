import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import Icon from "@/components/ui/icon";

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  engineer: "Инженер",
  technologist: "Технолог",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  engineer: "bg-blue-100 text-blue-700",
  technologist: "bg-green-100 text-green-700",
};

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

interface Invite {
  id: number;
  email: string | null;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
  created_by_name: string | null;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
}

export default function CompanyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rename
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("engineer");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [info, inv] = await Promise.all([
        apiGet<{ company: Company; members: Member[] }>("company-manage", "", { action: "info" }),
        apiGet<Invite[]>("company-manage", "", { action: "invites" }),
      ]);
      setCompany(info.company);
      setMembers(info.members);
      setNewName(info.company.name);
      setInvites(inv);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRename = async () => {
    if (!newName.trim() || newName === company?.name) { setRenaming(false); return; }
    setRenameBusy(true);
    try {
      await apiPost("company-manage", { name: newName.trim() }, { action: "rename" });
      setCompany(c => c ? { ...c, name: newName.trim() } : c);
      setRenaming(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRenameBusy(false);
    }
  };

  const handleInvite = async () => {
    setInviteBusy(true);
    setInviteUrl(null);
    try {
      const res = await apiPost<{ invite_url: string }>("company-manage",
        { email: inviteEmail || undefined, role: inviteRole },
        { action: "invite" }
      );
      setInviteUrl(res.invite_url);
      setInviteEmail("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await apiPost("company-manage", {}, { action: "revoke", id: String(id) });
      setInvites(inv => inv.filter(i => i.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleKick = async (id: number) => {
    if (!confirm("Удалить участника из предприятия?")) return;
    try {
      await apiPost("company-manage", {}, { action: "kick", id: String(id) });
      setMembers(m => m.filter(u => u.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const copyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <Icon name="ArrowLeft" size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Предприятие</h1>
            <p className="text-xs text-muted-foreground">Управление участниками и настройками</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <Icon name="AlertCircle" size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><Icon name="X" size={14} /></button>
          </div>
        )}

        {/* Карточка предприятия */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name="Building2" size={22} className="text-primary" />
              </div>
              <div>
                {renaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleRename()}
                      autoFocus
                      className="border border-border rounded-lg px-3 py-1.5 text-sm font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
                    />
                    <button onClick={handleRename} disabled={renameBusy}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      {renameBusy ? <Icon name="Loader2" size={14} className="animate-spin" /> : "Сохранить"}
                    </button>
                    <button onClick={() => { setRenaming(false); setNewName(company?.name ?? ""); }}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                      Отмена
                    </button>
                  </div>
                ) : (
                  <h2 className="text-lg font-semibold text-foreground">{company?.name}</h2>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Тариф: <span className="font-medium capitalize">{company?.plan}</span>
                  &nbsp;·&nbsp; Создано: {company?.created_at ? new Date(company.created_at).toLocaleDateString("ru") : "—"}
                </p>
              </div>
            </div>
            {isAdmin && !renaming && (
              <button onClick={() => setRenaming(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors">
                <Icon name="Pencil" size={13} />
                Переименовать
              </button>
            )}
          </div>
        </div>

        {/* Участники */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Участники</h3>
              <p className="text-xs text-muted-foreground">{members.length} чел.</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {members.map(m => (
              <div key={m.id} className="px-6 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.name}
                    {m.id === user?.id && <span className="ml-1.5 text-xs text-muted-foreground">(вы)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
                {isAdmin && m.id !== user?.id && (
                  <button onClick={() => handleKick(m.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Icon name="UserMinus" size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Приглашения */}
        {isAdmin && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Пригласить участника</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Создайте ссылку-приглашение и отправьте сотруднику</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">Email (необязательно)</label>
                  <input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="ivan@company.ru"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Роль</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="engineer">Инженер</option>
                    <option value="technologist">Технолог</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>

              <button onClick={handleInvite} disabled={inviteBusy}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {inviteBusy
                  ? <><Icon name="Loader2" size={15} className="animate-spin" />Создаю ссылку...</>
                  : <><Icon name="Link" size={15} />Создать ссылку-приглашение</>}
              </button>

              {inviteUrl && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1.5">
                    <Icon name="CheckCircle" size={14} />
                    Ссылка создана — действует 7 дней
                  </p>
                  <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-xs text-foreground flex-1 truncate font-mono">{inviteUrl}</span>
                    <button onClick={() => copyInviteUrl(inviteUrl)}
                      className="flex-shrink-0 text-xs text-primary font-medium hover:underline flex items-center gap-1">
                      <Icon name="Copy" size={13} />
                      Копировать
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Список активных инвайтов */}
            {invites.length > 0 && (
              <div className="border-t border-border">
                <div className="px-6 py-3 bg-secondary/30">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Активные приглашения</p>
                </div>
                <div className="divide-y divide-border">
                  {invites.map(inv => (
                    <div key={inv.id} className="px-6 py-3 flex items-center gap-3">
                      <Icon name="Mail" size={15} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{inv.email || "Без email"}</p>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABELS[inv.role] ?? inv.role}
                          &nbsp;·&nbsp; до {new Date(inv.expires_at).toLocaleDateString("ru")}
                        </p>
                      </div>
                      <button
                        onClick={() => copyInviteUrl(`${window.location.origin}/invite/${inv.token}`)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Копировать ссылку">
                        <Icon name="Copy" size={14} />
                      </button>
                      <button onClick={() => handleRevoke(inv.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Отозвать">
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
