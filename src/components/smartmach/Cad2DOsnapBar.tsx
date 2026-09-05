/**
 * Строка режимов черчения: объектные привязки, орто и полярное отслеживание.
 *
 * Расположена под холстом по образцу промышленных САПР — оператор
 * переключает режимы, не отрывая взгляда от чертежа. Каждый режим имеет
 * горячую клавишу, как в AutoCAD (F3 — привязки, F8 — орто, F10 — полярный).
 */
import Icon from '@/components/ui/icon';
import type { SnapKind, SnapResult } from '@/lib/cad/osnap';
import type { OsnapState } from '@/components/smartmach/useCad2DOsnap';

interface Props {
  osnap: OsnapState;
  setOsnap: (patch: Partial<OsnapState>) => void;
  toggleSnapMode: (kind: SnapKind) => void;
  activeSnap: SnapResult | null;
  coords: { x: number; y: number };
}

/** Порядок соответствует частоте использования при черчении. */
const SNAP_ITEMS: { kind: SnapKind; label: string; hint: string }[] = [
  { kind: 'endpoint', label: 'Кон', hint: 'Конечная точка' },
  { kind: 'midpoint', label: 'Сер', hint: 'Середина' },
  { kind: 'center', label: 'Цен', hint: 'Центр окружности' },
  { kind: 'intersection', label: 'Пер', hint: 'Пересечение' },
  { kind: 'quadrant', label: 'Ква', hint: 'Квадрант' },
  { kind: 'perpendicular', label: 'Нор', hint: 'Перпендикуляр' },
  { kind: 'tangent', label: 'Кас', hint: 'Касательная' },
  { kind: 'nearest', label: 'Бли', hint: 'Ближайшая точка' },
];

export default function Cad2DOsnapBar({
  osnap, setOsnap, toggleSnapMode, activeSnap, coords,
}: Props) {
  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-[11px] font-medium transition ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-muted text-muted-foreground hover:bg-muted/70'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border bg-card px-3 py-1.5">
      {/* Координаты и активная привязка */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          X {String(Math.round(coords.x)).padStart(4)} Y {String(Math.round(coords.y)).padStart(4)}
        </span>
        {activeSnap && activeSnap.kind !== 'grid' && (
          <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">
            <Icon name="Crosshair" size={11} />
            {activeSnap.label}
          </span>
        )}
      </div>

      <span className="h-4 w-px bg-border" />

      {/* Главный выключатель привязок */}
      <button
        onClick={() => setOsnap({ enabled: !osnap.enabled })}
        className={btn(osnap.enabled)}
        title="Объектные привязки (F3)"
      >
        ПРИВЯЗКА
      </button>

      {/* Отдельные типы привязок */}
      <div className={`flex flex-wrap items-center gap-1 ${osnap.enabled ? '' : 'opacity-40'}`}>
        {SNAP_ITEMS.map((s) => (
          <button
            key={s.kind}
            onClick={() => toggleSnapMode(s.kind)}
            disabled={!osnap.enabled}
            className={btn(osnap.modes[s.kind])}
            title={s.hint}
          >
            {s.label}
          </button>
        ))}
      </div>

      <span className="h-4 w-px bg-border" />

      {/* Орто и полярное отслеживание взаимно исключают друг друга:
          оба ограничивают направление, и одновременное включение
          приводило бы к непредсказуемому результату. */}
      <button
        onClick={() => setOsnap({ ortho: !osnap.ortho, polar: false })}
        className={btn(osnap.ortho)}
        title="Ортогональный режим (F8)"
      >
        ОРТО
      </button>
      <button
        onClick={() => setOsnap({ polar: !osnap.polar, ortho: false })}
        className={btn(osnap.polar)}
        title="Полярное отслеживание (F10)"
      >
        ПОЛЯР
      </button>

      {osnap.polar && (
        <select
          value={osnap.polarStepDeg}
          onChange={(e) => setOsnap({ polarStepDeg: +e.target.value })}
          className="rounded border border-input bg-background px-1 py-0.5 text-[11px]"
          title="Шаг полярного угла"
        >
          {[5, 10, 15, 22.5, 30, 45, 90].map((d) => (
            <option key={d} value={d}>{d}°</option>
          ))}
        </select>
      )}
    </div>
  );
}
