import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { asmGet, BomResult, BomSection, AssemblyNode, NODE_STATUS_CFG } from "@/lib/assembly";

interface Props {
  assemblyId: number;
  assemblyName: string;
  assemblyCode: string;
  assemblyRevision: string;
}

const SECTION_COLOR: Record<string, string> = {
  "Сборочные единицы": "bg-blue-50 text-blue-800",
  "Детали":            "bg-slate-50 text-slate-800",
  "Стандартные изделия":"bg-purple-50 text-purple-800",
  "Покупные изделия":  "bg-orange-50 text-orange-800",
  "Материалы":         "bg-teal-50 text-teal-800",
};

export default function AssemblyBOM({ assemblyId, assemblyName, assemblyCode, assemblyRevision }: Props) {
  const [data,    setData]    = useState<BomResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [detail,  setDetail]  = useState(false); // показать доп. колонки

  useEffect(() => {
    setLoading(true); setError(null);
    asmGet<BomResult>("bom", { assembly_id: assemblyId })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [assemblyId]);

  if (loading) return (
    <div className="py-20 text-center text-muted-foreground text-sm">
      <Icon name="Loader" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка спецификации…
    </div>
  );
  if (error || !data) return (
    <div className="py-20 text-center text-red-500 text-sm">
      <Icon name="AlertTriangle" size={28} className="mx-auto mb-2" />{error || "Ошибка загрузки"}
    </div>
  );

  const allItems = data.sections.flatMap(s => s.items);
  const issuesCount = allItems.filter(n => n.issue_flag).length;

  return (
    <div className="space-y-4">
      {/* ── Шапка ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Спецификация ГОСТ 2.106</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{assemblyCode} — {assemblyName} (Rev. {assemblyRevision})</p>
        </div>
        {/* KPI-чипсы */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs bg-secondary px-2.5 py-1 rounded-full border border-border">
            <Icon name="Package" size={11} />
            {data.total_positions} поз.
          </span>
          <span className="flex items-center gap-1 text-xs bg-secondary px-2.5 py-1 rounded-full border border-border">
            <Icon name="Scale" size={11} />
            {Number(data.total_weight_kg).toFixed(2)} кг
          </span>
          {issuesCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
              <Icon name="AlertTriangle" size={11} />
              {issuesCount} замеч.
            </span>
          )}
          <button
            onClick={() => setDetail(v => !v)}
            className="text-xs px-2.5 py-1 border border-border rounded-full hover:bg-secondary/60 transition-colors"
          >
            {detail ? "Кратко" : "Подробно"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs px-3 py-1 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <Icon name="Printer" size={12} />Печать
          </button>
        </div>
      </div>

      {/* ── Таблица ── */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden bom-print">
        {/* Заголовок таблицы */}
        <div className={`grid ${detail ? "grid-cols-[50px_140px_1fr_70px_70px_80px_80px_130px]" : "grid-cols-[50px_140px_1fr_70px_70px_80px_120px]"} gap-0 bg-secondary/60 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}>
          <div className="px-2 py-2 text-center">Поз.</div>
          <div className="px-2 py-2">Обозначение</div>
          <div className="px-2 py-2">Наименование</div>
          <div className="px-2 py-2 text-center">Кол.</div>
          <div className="px-2 py-2 text-center hidden sm:block">Масса ед.</div>
          <div className="px-2 py-2 text-center hidden sm:block">Масса всего</div>
          {detail && <div className="px-2 py-2 hidden lg:block">Материал</div>}
          <div className="px-2 py-2 hidden md:block">Примечание</div>
        </div>

        {data.sections.map((section: BomSection) => (
          <div key={section.title}>
            {/* Заголовок раздела */}
            <div className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-2 ${SECTION_COLOR[section.title] ?? "bg-secondary/40 text-foreground"}`}>
              <span>{section.title}</span>
              <span className="text-[10px] opacity-60">({section.items.length} поз.)</span>
            </div>

            {/* Строки раздела */}
            {section.items.map((item: AssemblyNode, idx: number) => {
              const statusCfg = NODE_STATUS_CFG[item.status] ?? NODE_STATUS_CFG.draft;
              const isIssue   = item.issue_flag;
              return (
                <div
                  key={item.id}
                  className={`grid ${detail ? "grid-cols-[50px_140px_1fr_70px_70px_80px_80px_130px]" : "grid-cols-[50px_140px_1fr_70px_70px_80px_120px]"} border-b border-border/50 last:border-b-0 text-sm transition-colors hover:bg-secondary/20 ${
                    isIssue ? "bg-red-50" : idx % 2 === 1 ? "bg-secondary/10" : ""
                  }`}
                >
                  {/* Поз. */}
                  <div className="px-2 py-2 text-center">
                    <span className="text-xs font-mono text-muted-foreground">{item.path}</span>
                  </div>
                  {/* Обозначение */}
                  <div className="px-2 py-2">
                    <div className="text-xs font-mono text-foreground truncate">{item.code}</div>
                    {item.standard_ref && (
                      <div className="text-[10px] text-muted-foreground truncate">{item.standard_ref}</div>
                    )}
                  </div>
                  {/* Наименование */}
                  <div className="px-2 py-2 min-w-0">
                    <div className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                      {item.name}
                      {isIssue && <Icon name="AlertTriangle" size={12} className="text-red-500 flex-shrink-0" />}
                    </div>
                    {item.dimensions && (
                      <div className="text-[10px] text-muted-foreground">{item.dimensions}</div>
                    )}
                    {detail && item.heat_treatment && (
                      <div className="text-[10px] text-amber-700">{item.heat_treatment}</div>
                    )}
                    {detail && item.surface_finish && (
                      <div className="text-[10px] text-muted-foreground">{item.surface_finish}</div>
                    )}
                    {isIssue && item.issue_note && (
                      <div className="text-[10px] text-red-600 mt-0.5">{item.issue_note}</div>
                    )}
                  </div>
                  {/* Кол-во */}
                  <div className="px-2 py-2 text-center">
                    <span className="text-xs font-semibold">{Number(item.qty) % 1 === 0 ? Number(item.qty) : item.qty}</span>
                    <div className="text-[10px] text-muted-foreground">{item.unit}</div>
                  </div>
                  {/* Масса ед. */}
                  <div className="px-2 py-2 text-center hidden sm:flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {item.weight_kg != null ? Number(item.weight_kg).toFixed(3) : "—"}
                    </span>
                  </div>
                  {/* Масса всего */}
                  <div className="px-2 py-2 text-center hidden sm:flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {item.total_weight_kg != null ? Number(item.total_weight_kg).toFixed(3) : "—"}
                    </span>
                  </div>
                  {/* Материал (detail) */}
                  {detail && (
                    <div className="px-2 py-2 hidden lg:flex items-center">
                      <span className="text-xs text-muted-foreground truncate">{item.material || "—"}</span>
                    </div>
                  )}
                  {/* Примечание */}
                  <div className="px-2 py-2 hidden md:flex items-start gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                        item.status === "approved" || item.status === "production"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.status === "issue"
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>{statusCfg.label}</span>
                      {item.notes && (
                        <span className="text-[10px] text-muted-foreground truncate">{item.notes}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Итог */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/40 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Итого позиций: <strong className="text-foreground">{data.total_positions}</strong>
          </span>
          <span className="text-xs font-semibold text-foreground">
            Масса изделия: {Number(data.total_weight_kg).toFixed(2)} кг
          </span>
        </div>
      </div>
    </div>
  );
}
