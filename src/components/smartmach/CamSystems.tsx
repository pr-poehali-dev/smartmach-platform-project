import { useState } from "react";
import Icon from "@/components/ui/icon";
import { CamSystem, CAM_SYSTEMS, CAT_CONFIG } from "@/components/smartmach/cam.data";

export default function CamSystems() {
  const [camFilter, setCamFilter] = useState<"all" | "professional" | "universal" | "free">("all");
  const [selectedCam, setSelectedCam] = useState<CamSystem | null>(null);

  const filteredCam = camFilter === "all" ? CAM_SYSTEMS : CAM_SYSTEMS.filter((s) => s.category === camFilter);

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {([["all", "Все системы"], ["professional", "Профессиональные"], ["universal", "Универсальные"], ["free", "Бесплатные"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setCamFilter(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              camFilter === id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCam.map((s) => (
          <div key={s.name} onClick={() => setSelectedCam(s)}
            className="bg-white border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.vendor} · {s.origin}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${CAT_CONFIG[s.category].color}`}>
                {CAT_CONFIG[s.category].label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Icon name="Settings2" size={12} />{s.axes}</span>
              <span className="flex items-center gap-1"><Icon name="Tag" size={12} />{s.price}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{s.bestFor}</p>
            <div className="flex flex-wrap gap-1">
              {s.features.slice(0, 3).map((f) => (
                <span key={f} className="text-[11px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">{f}</span>
              ))}
              {s.features.length > 3 && (
                <span className="text-[11px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">+{s.features.length - 3}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail dialog */}
      {selectedCam && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCam(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedCam.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedCam.vendor} · {selectedCam.origin}</p>
              </div>
              <button onClick={() => setSelectedCam(null)}>
                <Icon name="X" size={18} className="text-muted-foreground" />
              </button>
            </div>

            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${CAT_CONFIG[selectedCam.category].color}`}>
              {CAT_CONFIG[selectedCam.category].label}
            </span>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Обработка</p>
                <p>{selectedCam.axes}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Стоимость</p>
                <p>{selectedCam.price}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Интеграции</p>
                <p>{selectedCam.integrations.join(", ")}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Лучше всего подходит</p>
                <p>{selectedCam.bestFor}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Возможности</p>
              <ul className="space-y-1">
                {selectedCam.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Icon name="Check" size={14} className="text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <a href={selectedCam.link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Icon name="ExternalLink" size={14} />
              Официальный сайт
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
