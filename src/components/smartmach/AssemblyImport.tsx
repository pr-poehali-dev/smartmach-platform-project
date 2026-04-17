import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, URLS } from "@/lib/api";
import { Assembly, NODE_TYPE_CFG, NodeType } from "@/lib/assembly";

interface ParsedRow {
  path: string;
  code: string;
  name: string;
  qty: number;
  unit: string;
  material: string | null;
  weight_kg: number | null;
  total_weight_kg: number | null;
  dimensions: string | null;
  node_type: NodeType;
  notes: string | null;
  standard_ref: string | null;
  heat_treatment: string | null;
  supplier: string | null;
  status: string;
}

interface ParseResult {
  rows: ParsedRow[];
  warnings: string[];
  total: number;
}

interface Props {
  assemblyId: number;
  assemblyName: string;
  onImported: () => void;
  onClose: () => void;
}

const ACCEPTED = ".csv,.xlsx,.xls,.ods,.txt";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const NODE_TYPE_RU: Record<string, string> = {
  assembly:  "Сб. ед.",
  part:      "Деталь",
  standard:  "Стандарт",
  fastener:  "Крепёж",
  material:  "Материал",
  purchased: "Покупное",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // убираем data:…;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadTemplate() {
  const url = `${URLS["assembly-import"]}/?resource=template`;
  const a = document.createElement("a");
  a.href = url;
  a.download = "assembly_template.csv";
  a.click();
}

export default function AssemblyImport({ assemblyId, assemblyName, onImported, onClose }: Props) {
  const [step,     setStep]     = useState<"upload" | "preview" | "done">("upload");
  const [dragging, setDragging] = useState(false);
  const [file,     setFile]     = useState<File | null>(null);
  const [parsing,  setParsing]  = useState(false);
  const [parsed,   setParsed]   = useState<ParseResult | null>(null);
  const [replace,  setReplace]  = useState(false);
  const [importing,setImporting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [doneCount,setDoneCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Обработка файла ───────────────────────────────────────────

  async function processFile(f: File) {
    if (f.size > MAX_SIZE) { setError("Файл слишком большой (макс. 10 МБ)"); return; }
    setFile(f);
    setError(null);
    setParsing(true);
    try {
      const b64 = await fileToBase64(f);
      const result = await apiPost<ParseResult>("assembly-import", {
        file_b64:  b64,
        file_name: f.name,
      }, { resource: "parse" });
      setParsed(result);
      setStep("preview");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────────

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = () => setDragging(false);

  // ── Импорт ────────────────────────────────────────────────────

  async function doImport() {
    if (!parsed) return;
    setImporting(true);
    setError(null);
    try {
      const res = await apiPost<{ created: number }>("assembly-import", {
        assembly_id: assemblyId,
        rows: parsed.rows,
        replace,
      }, { resource: "import" });
      setDoneCount(res.created);
      setStep("done");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  // ── Редактирование строки превью ──────────────────────────────

  function updateRow(idx: number, field: keyof ParsedRow, value: string) {
    if (!parsed) return;
    const newRows = [...parsed.rows];
    const row = { ...newRows[idx] };
    if (field === "qty" || field === "weight_kg" || field === "total_weight_kg") {
      (row as Record<string, unknown>)[field] = parseFloat(value) || null;
    } else {
      (row as Record<string, unknown>)[field] = value || null;
    }
    newRows[idx] = row;
    setParsed({ ...parsed, rows: newRows });
  }

  function removeRow(idx: number) {
    if (!parsed) return;
    const newRows = parsed.rows.filter((_, i) => i !== idx);
    setParsed({ ...parsed, rows: newRows, total: newRows.length });
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Шапка */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-foreground text-base">
              Импорт спецификации из Excel / CSV
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Сборка: <span className="font-medium text-foreground">{assemblyName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {step === "preview" && (
              <button onClick={() => { setStep("upload"); setParsed(null); setFile(null); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-secondary/60 transition-colors">
                <Icon name="ArrowLeft" size={13} />Другой файл
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
              <Icon name="X" size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Прогресс-шаги */}
        <div className="flex items-center gap-0 px-5 py-3 border-b border-border flex-shrink-0 bg-secondary/20">
          {[
            { id: "upload",  label: "Загрузка файла",  icon: "Upload"     },
            { id: "preview", label: "Проверка данных", icon: "Eye"        },
            { id: "done",    label: "Готово",           icon: "CheckCircle"},
          ].map((s, i) => {
            const states = ["upload", "preview", "done"];
            const current = states.indexOf(step);
            const mine    = states.indexOf(s.id);
            const active  = mine === current;
            const done    = mine < current;
            return (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors",
                  active && "text-primary",
                  done   && "text-emerald-600",
                  !active && !done && "text-muted-foreground"
                )}>
                  <Icon name={done ? "Check" : s.icon as Parameters<typeof Icon>[0]["name"]}
                    size={13}
                    className={done ? "text-emerald-500" : active ? "text-primary" : "text-muted-foreground"}
                  />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 2 && <Icon name="ChevronRight" size={12} className="text-muted-foreground mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto">

          {/* ── ШАГ 1: Загрузка ── */}
          {step === "upload" && (
            <div className="p-6 space-y-5">
              {/* Зона drag & drop */}
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
                  dragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-secondary/30"
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
                />
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Icon name="Loader" size={36} className="text-primary animate-spin opacity-60" />
                    <p className="text-sm font-medium text-muted-foreground">Разбираем файл…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon name="FileSpreadsheet" size={28} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {dragging ? "Отпустите файл" : "Перетащите файл или нажмите для выбора"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Excel (.xlsx, .xls), CSV, ODS — до 10 МБ
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <Icon name="AlertTriangle" size={15} />
                  {error}
                </div>
              )}

              {/* Формат и шаблон */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Скачать шаблон */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="Download" size={15} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">Шаблон CSV</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Скачайте готовый шаблон с правильной структурой колонок — 
                    просто заполните и загрузите обратно.
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Icon name="Download" size={12} />
                    Скачать шаблон assembly_template.csv
                  </button>
                </div>

                {/* Поддерживаемые колонки */}
                <div className="bg-secondary/40 border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name="Info" size={15} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Умный маппинг</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Система автоматически распознаёт колонки по названию — 
                    на русском и английском. Можно загрузить экспорт из любой системы.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["Позиция","Обозначение","Наименование","Кол-во","Материал","Масса","Тип","ГОСТ"].map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 bg-white border border-border rounded text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Пример структуры */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 bg-secondary/60 text-xs font-semibold text-muted-foreground border-b border-border">
                  Пример структуры файла
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/30">
                        {["Позиция","Обозначение","Наименование","Кол-во","Ед.изм","Материал","Масса ед","Тип"].map(h => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold text-muted-foreground border-r border-border/50 last:border-0">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["1","РЦ-250-100","Корпус редуктора","1","сб.ед.","","28.5","сб."],
                        ["1.1","РЦ-250-101","Корпус нижний","1","шт","СЧ25","18.2","дет."],
                        ["1.2","","Болт М10×40 ГОСТ 7798","8","шт","Ст5","0.026","крепёж"],
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-secondary/10" : ""}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-2 py-1.5 text-muted-foreground border-r border-border/30 last:border-0 font-mono">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ШАГ 2: Превью ── */}
          {step === "preview" && parsed && (
            <div className="p-4 space-y-4">
              {/* Итоги парсинга */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Icon name="CheckCircle" size={16} className="text-emerald-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{parsed.rows.length}</div>
                      <div className="text-[10px] text-muted-foreground">строк распознано</div>
                    </div>
                  </div>
                  {parsed.warnings.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Icon name="AlertTriangle" size={16} className="text-amber-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{parsed.warnings.length}</div>
                        <div className="text-[10px] text-muted-foreground">предупреждений</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name="FileText" size={13} />
                    {file?.name}
                  </div>
                </div>

                {/* Опция замены */}
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)}
                    className="w-4 h-4 rounded" />
                  <span className="text-foreground font-medium">Очистить дерево перед импортом</span>
                </label>
              </div>

              {/* Предупреждения */}
              {parsed.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 mb-1">
                    <Icon name="AlertTriangle" size={13} />Предупреждения парсера
                  </div>
                  {parsed.warnings.slice(0, 5).map((w, i) => (
                    <div key={i} className="text-xs text-amber-700">· {w}</div>
                  ))}
                  {parsed.warnings.length > 5 && (
                    <div className="text-xs text-amber-600">…ещё {parsed.warnings.length - 5}</div>
                  )}
                </div>
              )}

              {/* Таблица строк */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[70px_110px_1fr_60px_60px_90px_70px_80px_32px] gap-0 bg-secondary/60 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {["Поз.","Код","Наименование","Кол","Ед","Материал","Масса","Тип",""].map((h, i) => (
                    <div key={i} className="px-2 py-2">{h}</div>
                  ))}
                </div>
                <div className="divide-y divide-border/50 max-h-[45vh] overflow-y-auto">
                  {parsed.rows.map((row, idx) => {
                    const typeCfg = NODE_TYPE_CFG[row.node_type] ?? NODE_TYPE_CFG.part;
                    return (
                      <div key={idx}
                        className={cn(
                          "grid grid-cols-[70px_110px_1fr_60px_60px_90px_70px_80px_32px] gap-0 text-xs hover:bg-secondary/20 transition-colors",
                          idx % 2 === 1 && "bg-secondary/10"
                        )}
                      >
                        {/* Поз. */}
                        <div className="px-2 py-1.5">
                          <input value={row.path || ""} onChange={e => updateRow(idx, "path", e.target.value)}
                            className="w-full text-xs font-mono bg-transparent border-b border-transparent focus:border-primary/50 outline-none" />
                        </div>
                        {/* Код */}
                        <div className="px-2 py-1.5">
                          <input value={row.code || ""} onChange={e => updateRow(idx, "code", e.target.value)}
                            className="w-full text-[10px] font-mono bg-transparent border-b border-transparent focus:border-primary/50 outline-none truncate" />
                        </div>
                        {/* Наименование */}
                        <div className="px-2 py-1.5">
                          <input value={row.name || ""} onChange={e => updateRow(idx, "name", e.target.value)}
                            className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary/50 outline-none font-medium" />
                        </div>
                        {/* Кол */}
                        <div className="px-2 py-1.5">
                          <input type="number" value={row.qty ?? ""} onChange={e => updateRow(idx, "qty", e.target.value)}
                            className="w-full text-xs bg-transparent border-b border-transparent focus:border-primary/50 outline-none text-center" />
                        </div>
                        {/* Ед */}
                        <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center">{row.unit}</div>
                        {/* Материал */}
                        <div className="px-2 py-1.5">
                          <input value={row.material || ""} onChange={e => updateRow(idx, "material", e.target.value)}
                            className="w-full text-[10px] bg-transparent border-b border-transparent focus:border-primary/50 outline-none text-muted-foreground" />
                        </div>
                        {/* Масса */}
                        <div className="px-2 py-1.5 text-[10px] text-muted-foreground flex items-center">
                          {row.weight_kg != null ? Number(row.weight_kg).toFixed(3) : "—"}
                        </div>
                        {/* Тип */}
                        <div className="px-2 py-1.5 flex items-center">
                          <span className={`text-[10px] font-medium ${typeCfg.color}`}>
                            {NODE_TYPE_RU[row.node_type] ?? row.node_type}
                          </span>
                        </div>
                        {/* Удалить */}
                        <div className="px-1 py-1.5 flex items-center justify-center">
                          <button onClick={() => removeRow(idx)}
                            className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                            <Icon name="X" size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <Icon name="AlertTriangle" size={15} />{error}
                </div>
              )}
            </div>
          )}

          {/* ── ШАГ 3: Готово ── */}
          {step === "done" && (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                <Icon name="CheckCircle" size={40} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Импорт завершён!</h3>
                <p className="text-muted-foreground mt-1">
                  Создано <strong className="text-foreground">{doneCount}</strong> узлов
                  {replace ? " (дерево было очищено перед импортом)" : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="px-5 py-2.5 border border-border rounded-xl text-sm hover:bg-secondary/60 transition-colors font-medium">
                  Закрыть
                </button>
                <button onClick={() => { onImported(); onClose(); }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm hover:opacity-90 transition-opacity font-medium flex items-center gap-2">
                  <Icon name="GitBranch" size={15} />
                  Открыть дерево
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Нижняя панель действий */}
        {step === "preview" && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0 bg-secondary/20">
            <p className="text-xs text-muted-foreground">
              Данные можно редактировать прямо в таблице перед импортом
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setStep("upload"); setParsed(null); setFile(null); }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60 transition-colors">
                Отмена
              </button>
              <button
                onClick={doImport}
                disabled={importing || parsed.rows.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50 font-medium transition-opacity"
              >
                {importing ? (
                  <><Icon name="Loader" size={14} className="animate-spin" />Импортируем…</>
                ) : (
                  <><Icon name="Upload" size={14} />Импортировать {parsed.rows.length} строк</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
