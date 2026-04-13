import { useState } from "react";
import Icon from "@/components/ui/icon";
import { CamSystem, CAM_SYSTEMS, CAT_CONFIG } from "@/components/smartmach/cam.data";

const ROWS: { key: keyof CamSystem | "category_label"; label: string }[] = [
  { key: "category_label", label: "Категория" },
  { key: "vendor",         label: "Производитель" },
  { key: "origin",         label: "Происхождение" },
  { key: "axes",           label: "Осевая обработка" },
  { key: "price",          label: "Стоимость" },
  { key: "bestFor",        label: "Лучше всего для" },
];

function cellVal(s: CamSystem, key: typeof ROWS[number]["key"]) {
  if (key === "category_label") return CAT_CONFIG[s.category].label;
  const v = s[key as keyof CamSystem];
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export default function CamCompare() {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (name: string) => {
    setCompareIds((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 4 ? [...prev, name] : prev
    );
  };

  const compared = CAM_SYSTEMS.filter((s) => compareIds.includes(s.name));

  return (
    <div className="space-y-5">
      {/* Selection */}
      <div>
        <p className="text-sm font-medium mb-3">Выберите системы для сравнения (до 4)</p>
        <div className="flex flex-wrap gap-2">
          {CAM_SYSTEMS.map((s) => {
            const checked = compareIds.includes(s.name);
            return (
              <button key={s.name} onClick={() => toggleCompare(s.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  checked
                    ? "bg-primary text-white border-primary"
                    : compareIds.length >= 4
                      ? "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
                disabled={!checked && compareIds.length >= 4}>
                {checked && <Icon name="Check" size={12} />}
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {compareIds.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <Icon name="GitCompareArrows" size={36} className="mx-auto mb-2 opacity-20" />
          Выберите минимум 2 системы для сравнения
        </div>
      )}

      {compared.length >= 2 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/40 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-40">Параметр</th>
                {compared.map((s) => (
                  <th key={s.name} className="px-4 py-3 text-left font-semibold">
                    <div className="flex items-center justify-between gap-2">
                      <span>{s.name}</span>
                      <button onClick={() => toggleCompare(s.name)} className="text-muted-foreground hover:text-red-500">
                        <Icon name="X" size={13} />
                      </button>
                    </div>
                    <span className={`mt-1 inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${CAT_CONFIG[s.category].color}`}>
                      {CAT_CONFIG[s.category].label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROWS.map(({ key, label }) => (
                <tr key={key} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 text-muted-foreground font-medium">{label}</td>
                  {compared.map((s) => (
                    <td key={s.name} className="px-4 py-3">{cellVal(s, key)}</td>
                  ))}
                </tr>
              ))}
              {/* Features row */}
              <tr className="align-top hover:bg-secondary/20">
                <td className="px-4 py-3 text-muted-foreground font-medium">Возможности</td>
                {compared.map((s) => (
                  <td key={s.name} className="px-4 py-3">
                    <ul className="space-y-1">
                      {s.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Icon name="Check" size={12} className="text-green-500 mt-0.5 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              {/* Integrations row */}
              <tr className="align-top hover:bg-secondary/20">
                <td className="px-4 py-3 text-muted-foreground font-medium">Интеграции</td>
                {compared.map((s) => (
                  <td key={s.name} className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.integrations.map((i) => (
                        <span key={i} className="text-[11px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              {/* Site links */}
              <tr className="hover:bg-secondary/20">
                <td className="px-4 py-3 text-muted-foreground font-medium">Сайт</td>
                {compared.map((s) => (
                  <td key={s.name} className="px-4 py-3">
                    <a href={s.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary text-xs hover:underline">
                      <Icon name="ExternalLink" size={12} />Открыть
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
