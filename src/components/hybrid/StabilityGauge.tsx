import Icon from '@/components/ui/icon';

interface StabilityGaugeProps {
  value: number;
  status: 'stable' | 'warning' | 'unstable';
}

const CONFIG = {
  stable: {
    label: 'Процесс стабилен',
    tone: 'text-emerald-600',
    ring: 'stroke-emerald-500',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: 'CircleCheck',
  },
  warning: {
    label: 'Требует внимания',
    tone: 'text-amber-600',
    ring: 'stroke-amber-500',
    bg: 'bg-amber-50 border-amber-200',
    icon: 'TriangleAlert',
  },
  unstable: {
    label: 'Процесс нестабилен',
    tone: 'text-red-600',
    ring: 'stroke-red-500',
    bg: 'bg-red-50 border-red-200',
    icon: 'CircleAlert',
  },
} as const;

/** Светофор стабильности — главный индикатор для оператора у станка. */
export default function StabilityGauge({ value, status }: StabilityGaugeProps) {
  const cfg = CONFIG[status];
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / 100);

  return (
    <div className={`rounded-xl border p-5 ${cfg.bg}`}>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              className="stroke-black/10"
              strokeWidth="10"
            />
            <circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              className={cfg.ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dashoffset 500ms ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold tabular-nums ${cfg.tone}`}>
              {value}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              индекс
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className={`flex items-center gap-2 ${cfg.tone}`}>
            <Icon name={cfg.icon} size={20} />
            <span className="text-lg font-semibold">{cfg.label}</span>
          </div>
          <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
            Интегральная оценка стабильности по осциллограммам тока, напряжения
            и мощности. Значение ниже 60 означает риск брака.
          </p>
        </div>
      </div>
    </div>
  );
}
