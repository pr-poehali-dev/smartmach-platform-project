import Icon from '@/components/ui/icon';
import {
  DEFECT_KIND_LABELS,
  EDGE_GRADE_LABELS,
  EdgeQualityResult,
} from '@/lib/steelCutting';

interface EdgeQualityPanelProps {
  quality: EdgeQualityResult;
  onApply?: () => void;
  canApply: boolean;
}

const GRADE_STYLE = {
  good: { tone: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: 'CircleCheck' },
  acceptable: { tone: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: 'TriangleAlert' },
  poor: { tone: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: 'CircleAlert' },
} as const;

/** Риск дефекта наглядной полосой — оператор оценивает ситуацию за секунду. */
function RiskBar({ risk }: { risk: number }) {
  const color = risk >= 70 ? 'bg-red-500' : risk >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${risk}%` }} />
    </div>
  );
}

export default function EdgeQualityPanel({
  quality,
  onApply,
  canApply,
}: EdgeQualityPanelProps) {
  const g = GRADE_STYLE[quality.grade];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name="Layers" size={16} />
        Прогноз качества кромки
      </h2>

      <div className={`rounded-lg border p-3 ${g.bg}`}>
        <div className="flex items-center justify-between gap-3">
          <div className={`flex items-center gap-2 ${g.tone}`}>
            <Icon name={g.icon} size={18} />
            <span className="font-semibold">{EDGE_GRADE_LABELS[quality.grade]}</span>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold tabular-nums ${g.tone}`}>
              {quality.edgeQualityIndex}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              индекс кромки
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-black/5 pt-2.5 text-xs">
          <div>
            <div className="text-muted-foreground">Ожидаемый брак</div>
            <div className="font-mono font-semibold text-foreground">
              {quality.expectedDefectPct}%
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Скорость / оптимум</div>
            <div
              className={`font-mono font-semibold ${
                quality.speedRatio > 1.08 || quality.speedRatio < 0.85
                  ? 'text-amber-600'
                  : 'text-foreground'
              }`}
            >
              {quality.speedRatio}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Газ / норматив</div>
            <div
              className={`font-mono font-semibold ${
                quality.gasRatio < 0.9 ? 'text-amber-600' : 'text-foreground'
              }`}
            >
              {quality.gasRatio}
            </div>
          </div>
        </div>
      </div>

      {quality.defects.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Сочетание параметров не создаёт предпосылок для дефектов кромки.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {quality.defects.map((d, i) => (
            <li key={`${d.kind}-${i}`} className="rounded-lg border border-border p-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">{d.title}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  риск {d.risk}%
                </span>
              </div>
              <div className="mt-1.5">
                <RiskBar risk={d.risk} />
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                {d.cause}
              </p>
              <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-primary">
                <Icon name="ArrowRight" size={11} className="mt-0.5 shrink-0" />
                <span>{d.action}</span>
              </p>
              <span className="mt-1.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {DEFECT_KIND_LABELS[d.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canApply && onApply && (
        <button
          onClick={onApply}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Icon name="Wand2" size={14} />
          Применить рекомендации по кромке
        </button>
      )}
    </div>
  );
}
