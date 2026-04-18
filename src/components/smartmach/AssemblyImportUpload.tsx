import { useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface Props {
  parsing: boolean;
  dragging: boolean;
  error: string | null;
  onFile: (f: File) => void;
  onDragChange: (val: boolean) => void;
  onDownloadTemplate: () => void;
}

const ACCEPTED = ".csv,.xlsx,.xls,.ods,.txt";

export default function AssemblyImportUpload({
  parsing, dragging, error, onFile, onDragChange, onDownloadTemplate,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragChange(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile, onDragChange]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragChange(true);
  }, [onDragChange]);

  return (
    <div className="p-6 space-y-5">
      {/* Зона drag & drop */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => onDragChange(false)}
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
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
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
            onClick={onDownloadTemplate}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Icon name="Download" size={12} />
            Скачать шаблон assembly_template.csv
          </button>
        </div>

        {/* Умный маппинг */}
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
  );
}
