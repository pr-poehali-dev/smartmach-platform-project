import { useMemo } from 'react';

interface OscilloscopeProps {
  data: number[];
  label: string;
  unit: string;
  color: string;
  height?: number;
}

/**
 * Осциллограмма сигнала с датчика.
 * Рисуется через SVG-polyline: лёгкая, без зависимостей, масштабируется.
 */
export default function Oscilloscope({
  data,
  label,
  unit,
  color,
  height = 90,
}: OscilloscopeProps) {
  const { path, min, max, avg } = useMemo(() => {
    if (!data.length) return { path: '', min: 0, max: 0, avg: 0 };

    const m = data.reduce((s, x) => s + x, 0) / data.length;

    /**
     * Масштаб фиксирован относительно среднего (±20%), а не по min/max.
     * Иначе автомасштаб растягивает шум стабильного процесса на всю высоту,
     * и оператор видит «скачки» там, где режим в норме.
     */
    const halfSpan = Math.abs(m) * 0.2 || 1;
    const lo = m - halfSpan;
    const span = halfSpan * 2;
    const w = 100;

    const pts = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = height - ((v - lo) / span) * (height - 8) - 4;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

    return {
      path: pts,
      min: Math.min(...data),
      max: Math.max(...data),
      avg: m,
    };
  }, [data, height]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {avg.toFixed(1)} {unit}
        </span>
      </div>

      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            y1={height * f}
            x2="100"
            y2={height * f}
            stroke="currentColor"
            className="text-border"
            strokeWidth="0.3"
            strokeDasharray="1.5 1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polyline
          points={path}
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>min {min.toFixed(1)}</span>
        <span>max {max.toFixed(1)}</span>
      </div>
    </div>
  );
}