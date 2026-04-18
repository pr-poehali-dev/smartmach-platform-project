import { useState, useCallback } from "react";
import { apiPost, URLS } from "@/lib/api";
import AssemblyImportHeader from "@/components/smartmach/AssemblyImportHeader";
import AssemblyImportUpload from "@/components/smartmach/AssemblyImportUpload";
import AssemblyImportPreview, { ParsedRow, ParseResult } from "@/components/smartmach/AssemblyImportPreview";
import AssemblyImportDone from "@/components/smartmach/AssemblyImportDone";

interface Props {
  assemblyId: number;
  assemblyName: string;
  onImported: () => void;
  onClose: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
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
  const [step,      setStep]      = useState<"upload" | "preview" | "done">("upload");
  const [dragging,  setDragging]  = useState(false);
  const [file,      setFile]      = useState<File | null>(null);
  const [parsing,   setParsing]   = useState(false);
  const [parsed,    setParsed]    = useState<ParseResult | null>(null);
  const [replace,   setReplace]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);

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

  function resetToUpload() {
    setStep("upload");
    setParsed(null);
    setFile(null);
  }

  const onDragChange = useCallback((val: boolean) => setDragging(val), []);

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        <AssemblyImportHeader
          step={step}
          assemblyName={assemblyName}
          onBack={resetToUpload}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto flex flex-col">
          {step === "upload" && (
            <AssemblyImportUpload
              parsing={parsing}
              dragging={dragging}
              error={error}
              onFile={processFile}
              onDragChange={onDragChange}
              onDownloadTemplate={downloadTemplate}
            />
          )}

          {step === "preview" && parsed && (
            <AssemblyImportPreview
              parsed={parsed}
              file={file}
              replace={replace}
              importing={importing}
              error={error}
              onReplace={setReplace}
              onUpdateRow={updateRow}
              onRemoveRow={removeRow}
              onImport={doImport}
              onCancel={resetToUpload}
            />
          )}

          {step === "done" && (
            <AssemblyImportDone
              doneCount={doneCount}
              replace={replace}
              onClose={onClose}
              onOpenTree={() => { onImported(); onClose(); }}
            />
          )}
        </div>

      </div>
    </div>
  );
}
