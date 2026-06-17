import { useEffect, useState } from "react";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { apiGet, apiDelete } from "@/lib/api";
import { MACHINE_TEMPLATES } from "@/components/smartmach/machineDrawingTemplates";
import { exportDrawingsPackage, type PackageSignatures } from "@/components/smartmach/machinePdfExport";
import MachinePdfDialog from "@/components/smartmach/MachinePdfDialog";

export interface MachineDrawing {
  id: number;
  name: string;
  description?: string;
  paper_size: string;
  theme: string;
  file_url: string;
  file_size?: number;
  module: string;
  canvas_json?: string;
  layers_json?: string;
  gost_meta?: Record<string, string>;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

interface Props {
  onOpen: (drawing: MachineDrawing) => void;
  onNew: (templateId?: string) => void;
  refreshTick: number;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtSize(b?: number) {
  if (!b) return "";
  if (b < 1024) return `${b} Б`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} КБ`;
  return `${(b / 1024 / 1024).toFixed(1)} МБ`;
}

export default function MachineDrawingsList({ onOpen, onNew, refreshTick }: Props) {
  const [drawings, setDrawings] = useState<MachineDrawing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch]     = useState("");
  const [exporting, setExporting] = useState(false);
  const [showPdfDialog, setShowPdfDialog] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await apiGet<MachineDrawing[]>("drawings", "", { module: "machine" });
      setDrawings(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [refreshTick]);

  async function handleDelete(id: number) {
    if (!confirm("Удалить чертёж? Это действие нельзя отменить.")) return;
    setDeleting(id);
    try {
      await apiDelete("drawings", { id });
      setDrawings((prev) => prev.filter((d) => d.id !== id));
    } catch { toast.error("Не удалось удалить чертёж"); }
    finally { setDeleting(null); }
  }

  async function handleExportPdf(sign: PackageSignatures) {
    if (drawings.length === 0) { toast.error("Нет чертежей для экспорта"); return; }
    setExporting(true);
    const tid = toast.loading("Формирую пакет PDF…");
    try {
      await exportDrawingsPackage(drawings, sign);
      toast.success("Пакет чертежей сохранён в PDF", { id: tid });
      setShowPdfDialog(false);
    } catch {
      toast.error("Не удалось сформировать PDF", { id: tid });
    } finally {
      setExporting(false);
    }
  }

  const filtered = drawings.filter((d) =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Диалог экспорта PDF */}
      {showPdfDialog && (
        <MachinePdfDialog
          drawingsCount={drawings.length}
          exporting={exporting}
          onExport={handleExportPdf}
          onClose={() => setShowPdfDialog(false)}
        />
      )}

      {/* Шапка */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => setShowPdfDialog(true)}
          disabled={drawings.length === 0}
          className="flex items-center gap-2 bg-white border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/50 disabled:opacity-50 shrink-0"
        >
          <Icon name="FileDown" size={15} />
          <span className="hidden sm:inline">Пакет PDF</span>
        </button>
        <button
          onClick={() => onNew()}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shrink-0"
        >
          <Icon name="Plus" size={15} />
          Пустой чертёж
        </button>
      </div>

      {/* Шаблоны чертежей */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="LayoutTemplate" size={15} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Шаблоны чертежей</span>
          <span className="text-xs text-muted-foreground">— узлы станка и пустые листы с рамкой ГОСТ</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MACHINE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onNew(t.id)}
              className="flex items-start gap-3 p-3 rounded-xl border border-border text-left hover:border-primary/40 hover:bg-primary/3 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <Icon name={t.icon as Parameters<typeof Icon>[0]["name"]} size={16} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{t.title}</div>
                <div className="text-xs text-muted-foreground leading-snug mt-0.5">{t.subtitle}</div>
                <div className="text-[10px] text-primary font-medium mt-1 flex items-center gap-1">
                  <Icon name="FileType" size={10} />
                  {t.paperSize}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Список */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border p-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="Loader" size={28} className="animate-spin opacity-40" />
          <span className="text-sm">Загрузка чертежей…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
            <Icon name="PenLine" size={28} className="text-muted-foreground opacity-30" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {search ? "Чертежи не найдены" : "Чертежей пока нет"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {search ? "Попробуйте другой запрос" : "Нажмите «Новый чертёж» чтобы начать проектирование"}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => onNew()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90"
            >
              <Icon name="Plus" size={15} />
              Создать первый чертёж
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Превью */}
              <div
                className="relative h-40 bg-slate-50 cursor-pointer overflow-hidden"
                onClick={() => onOpen(d)}
              >
                {d.file_url ? (
                  <img
                    src={d.file_url}
                    alt={d.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Icon name="FileImage" size={36} className="text-muted-foreground opacity-20" />
                  </div>
                )}
                {/* Оверлей при ховере */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white rounded-full px-4 py-2 text-sm font-semibold text-primary shadow-md flex items-center gap-2">
                    <Icon name="PenLine" size={14} />
                    Открыть в редакторе
                  </div>
                </div>
              </div>

              {/* Мета */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3
                    className="font-semibold text-foreground text-sm cursor-pointer hover:text-primary transition-colors leading-tight"
                    onClick={() => onOpen(d)}
                  >
                    {d.name}
                  </h3>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deleting === d.id}
                    className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    {deleting === d.id
                      ? <Icon name="Loader" size={13} className="animate-spin" />
                      : <Icon name="Trash2" size={13} />}
                  </button>
                </div>

                {d.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{d.description}</p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Icon name="FileType" size={11} />
                    {d.paper_size}
                  </span>
                  {d.file_size && (
                    <span className="flex items-center gap-1">
                      <Icon name="HardDrive" size={11} />
                      {fmtSize(d.file_size)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <Icon name="Clock" size={11} />
                    {fmtDate(d.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}