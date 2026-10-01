import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import TechCardEditor from "@/components/smartmach/TechCardEditor";
import DemoDataButton from "@/components/smartmach/DemoDataButton";
import { mGetPartsList, type Part } from "@/lib/manufacture";
import { type TechProcessListItem, TP_STATUS, tcList, tcCreate, tcDelete, fmtMin } from "@/lib/techcard";

export default function ModuleTechCards() {
  const [items, setItems] = useState<TechProcessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await tcList()); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить техкарты"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (openId) return <TechCardEditor id={openId} onBack={() => { setOpenId(null); load(); }} />;

  const q = search.trim().toLowerCase();
  const filtered = items.filter((t) => !q || [t.code, t.name, t.part_code, t.part_name, t.material]
    .some((v) => v?.toLowerCase().includes(q)));

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Техкарты</h1>
          <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
            Маршрут операций, режимы резания и нормы времени · ГОСТ 3.1118
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoDataButton onChanged={load} />
          <Button size="sm" onClick={() => setCreating(true)}>
            <Icon name="Plus" size={15} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Новая техкарта</span><span className="sm:hidden">Техкарта</span>
          </Button>
        </div>
      </div>

      <Input placeholder="Поиск по обозначению, детали, материалу…" value={search}
        onChange={(e) => setSearch(e.target.value)} className="max-w-md" />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
          <Icon name="Loader2" size={18} className="animate-spin" />Загрузка…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
          <Icon name="ClipboardList" size={36} className="mx-auto text-muted-foreground" />
          <p className="font-medium">Техкарт пока нет</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Создайте первую техкарту или загрузите пример — редуктор с полной техкартой вала, станками и программами ЧПУ.
          </p>
          <div className="flex justify-center gap-2">
            <DemoDataButton onChanged={load} variant="default" />
            <Button variant="outline" onClick={() => setCreating(true)}>Создать с нуля</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2.5">Обозначение / наименование</th>
                <th className="px-4 py-2.5">Деталь</th>
                <th className="px-4 py-2.5 text-right">Операций</th>
                <th className="px-4 py-2.5 text-right">Тшк на деталь</th>
                <th className="px-4 py-2.5 text-right">Партия</th>
                <th className="px-4 py-2.5">Статус</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const st = TP_STATUS[t.status] ?? TP_STATUS.draft;
                return (
                  <tr key={t.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(t.id)} data-testid="techcard-row">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {t.code}{t.is_demo && <span className="ml-2 font-sans rounded bg-sky-100 text-sky-800 px-1.5">пример</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.part_code ? `${t.part_code} ${t.part_name}` : "—"}</td>
                    <td className="px-4 py-3 text-right">{t.ops_count}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtMin(t.total_t_sht_k)}</td>
                    <td className="px-4 py-3 text-right">{t.batch_size}</td>
                    <td className="px-4 py-3"><span className={`text-xs rounded px-2 py-0.5 ${st.cls}`}>{st.label}</span></td>
                    <td className="px-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" title="Удалить" onClick={async () => {
                        if (!confirm(`Удалить техкарту «${t.name}»?`)) return;
                        try { await tcDelete(t.id); toast.success("Техкарта удалена"); load(); }
                        catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); }
                      }}><Icon name="Trash2" size={14} /></Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Ничего не найдено</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />}
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [partId, setPartId] = useState("");
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { mGetPartsList().then(setParts).catch(() => {}); }, []);

  const part = parts.find((p) => String(p.id) === partId);

  const submit = async () => {
    const n = name.trim() || (part ? `Техпроцесс механической обработки: ${part.name}` : "");
    if (!n) { setError("Укажите наименование или выберите деталь"); return; }
    setSaving(true); setError(null);
    try {
      const res = await tcCreate({
        name: n, part_id: part?.id ?? null, code: part ? `ТП-${part.code}` : "",
        material: part?.material ?? null, batch_size: Math.max(1, parseInt(batch) || 1), status: "draft",
      });
      toast.success("Техкарта создана");
      onCreated(res.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка создания"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новая техкарта</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Деталь</Label>
            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={partId}
              onChange={(e) => setPartId(e.target.value)}>
              <option value="">— без привязки —</option>
              {parts.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Материал и обозначение подставятся из карточки детали.</p>
          </div>
          <div>
            <Label>Наименование техпроцесса</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder={part ? `Техпроцесс механической обработки: ${part.name}` : "Техпроцесс механической обработки вала"} />
          </div>
          <div className="w-32">
            <Label>Партия, шт</Label>
            <Input inputMode="numeric" value={batch} onChange={(e) => setBatch(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Создаю…" : "Создать"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
