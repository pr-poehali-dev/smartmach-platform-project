import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import Oscilloscope from '@/components/hybrid/Oscilloscope';
import StabilityGauge from '@/components/hybrid/StabilityGauge';
import EdgeQualityPanel from '@/components/hybrid/EdgeQualityPanel';
import EconomicsPanel from '@/components/hybrid/EconomicsPanel';
import { downloadProtocol } from '@/lib/pdf/protocolReport';
import {
  CutJobInput,
  compareEconomics,
  predictEdgeQuality,
  proposeEdgeCorrections,
} from '@/lib/steelCutting';
import {
  Conditions,
  Correction,
  MAX_STEP_PCT,
  PARAM_LABELS,
  PROCESSES,
  ProcessId,
  SIGNAL_LABELS,
  SignalKind,
  detect,
  propose,
  selectMode,
  synthSignal,
} from '@/lib/hybridControl';

interface LogEntry {
  time: string;
  text: string;
  tone: 'info' | 'warn' | 'crit' | 'ok';
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function HybridControlPage() {
  const [cond, setCond] = useState<Conditions>(() => ({
    processId: ((): ProcessId => {
      const q = new URLSearchParams(window.location.search).get('process');
      return q && q in PROCESSES ? (q as ProcessId) : 'weld_al_6';
    })(),
    gapMm: 0.8,
    surface: 'oxidized',
    electrodeWearPct: 20,
    qualityTarget: 'standard',
  }));
  // Сценарий можно открыть прямой ссылкой (?signal=double_arcing) —
  // удобно для демонстрации конкретного случая на защите заявки.
  const [signalKind, setSignalKind] = useState<SignalKind>(() => {
    const q = new URLSearchParams(window.location.search).get('signal');
    return q && q in SIGNAL_LABELS ? (q as SignalKind) : 'stable';
  });
  const [params, setParams] = useState<Record<string, number> | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [operator, setOperator] = useState('');
  const [exporting, setExporting] = useState(false);
  const [job, setJob] = useState<CutJobInput>({ cutLengthM: 250, pierceCount: 60 });

  const proc = PROCESSES[cond.processId];
  const mode = useMemo(() => selectMode(cond), [cond]);
  const activeParams = params ?? mode.params;

  const signal = useMemo(() => synthSignal(signalKind), [signalKind]);
  const baselineVoltage = useMemo(() => {
    const s = synthSignal('stable');
    return s.voltage.reduce((a, b) => a + b, 0) / s.voltage.length;
  }, []);

  const result = useMemo(
    () => detect(signal, baselineVoltage),
    [signal, baselineVoltage],
  );

  const corrections = useMemo(
    () => propose(result, activeParams, proc.limits),
    [result, activeParams, proc.limits],
  );

  const autoCorrections = corrections.filter((c) => !c.requiresConfirm);
  const pending = corrections.filter((c) => c.requiresConfirm);

  // Контроль кромки и экономика применимы только к резке
  const isCutting = proc.kind === 'cutting';

  const edgeQuality = useMemo(
    () => predictEdgeQuality(proc, activeParams, result),
    [proc, activeParams, result],
  );

  const edgeCorrections = useMemo(
    () => proposeEdgeCorrections(edgeQuality, activeParams, proc.limits),
    [edgeQuality, activeParams, proc.limits],
  );

  const economics = useMemo(
    () => compareEconomics(proc, activeParams, job, edgeQuality.expectedDefectPct),
    [proc, activeParams, job, edgeQuality.expectedDefectPct],
  );

  const addLog = (text: string, tone: LogEntry['tone']) =>
    setLog((prev) =>
      [
        {
          time: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          text,
          tone,
        },
        ...prev,
      ].slice(0, 40),
    );

  const applyCorrections = (list: Correction[], confirmed = false) => {
    if (!list.length) return;
    const next = { ...activeParams };
    list.forEach((c) => {
      next[c.param] = c.newValue;
      const p = PARAM_LABELS[c.param];
      addLog(
        `${confirmed ? 'Подтверждено оператором' : 'Автокоррекция'}: ${p.label} ${c.oldValue} → ${c.newValue} ${p.unit} (${c.changePct > 0 ? '+' : ''}${c.changePct}%) — ${c.signature}`,
        confirmed ? 'crit' : 'warn',
      );
    });
    setParams(next);
  };

  const resetMode = () => {
    setParams(null);
    addLog('Режим сброшен к расчётному стартовому', 'info');
  };

  const applyEdgeCorrections = () => {
    if (!edgeCorrections.length) return;
    const next = { ...activeParams };
    edgeCorrections.forEach((c) => {
      next[c.param] = c.newValue;
      const p = PARAM_LABELS[c.param];
      addLog(
        `Коррекция по кромке: ${p.label} ${c.oldValue} → ${c.newValue} ${p.unit} `
          + `(${c.changePct > 0 ? '+' : ''}${c.changePct}%) — ${c.signature}`,
        'warn',
      );
    });
    setParams(next);
  };

  const applyStartMode = () => {
    setParams(mode.params);
    addLog(
      `Стартовый режим принят: применено ${mode.applied.length} технологических правил`,
      'ok',
    );
  };

  const exportProtocol = async () => {
    setExporting(true);
    try {
      const name = await downloadProtocol({
        process: proc,
        conditions: {
          gapMm: cond.gapMm,
          surface: cond.surface,
          electrodeWearPct: cond.electrodeWearPct,
          qualityTarget: cond.qualityTarget,
        },
        signalLabel: SIGNAL_LABELS[signalKind],
        signal,
        baseParams: proc.startParams,
        activeParams,
        appliedRules: mode.applied,
        detections: result.detections,
        features: result.features,
        stabilityIndex: result.stabilityIndex,
        status: result.status,
        corrections,
        log: log.map((e) => ({ time: e.time, text: e.text })),
        operator,
        organization: 'СмартМаш',
        ...(isCutting
          ? {
              edgeQuality,
              economics,
              job,
              baselineDefectPct: proc.economics.baselineDefectPct,
            }
          : {}),
      });
      addLog(`Сформирован протокол испытаний: ${name}`, 'ok');
    } catch {
      addLog('Не удалось сформировать протокол', 'crit');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Шапка */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1500px] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Адаптивное управление гибридным процессом
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Лазер + плазма · подбор режима, контроль стабильности, автокоррекция
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="ФИО оператора для протокола"
                className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={exportProtocol}
                disabled={exporting}
                className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                <Icon name={exporting ? 'Loader2' : 'FileDown'} size={16} className={exporting ? 'animate-spin' : ''} />
                {exporting ? 'Формирую…' : 'Протокол испытаний, PDF'}
              </button>
              <a
                href="/architecture"
                className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <Icon name="Network" size={15} />
                Схема архитектуры
              </a>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-foreground">
                  Демонстрационный режим
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr_360px]">
          {/* ─── Колонка 1: условия ─── */}
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon name="Settings2" size={16} />
                Условия на рабочем месте
              </h2>

              <div className="space-y-3.5">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">
                    Процесс
                  </span>
                  <select
                    value={cond.processId}
                    onChange={(e) => {
                      setCond({ ...cond, processId: e.target.value as ProcessId });
                      setParams(null);
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground"
                  >
                    {Object.values(PROCESSES).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Зазор в стыке</span>
                    <span className="font-mono text-foreground">{cond.gapMm} мм</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={cond.gapMm}
                    onChange={(e) => {
                      setCond({ ...cond, gapMm: +e.target.value });
                      setParams(null);
                    }}
                    className="mt-2 w-full accent-primary"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">
                    Состояние поверхности
                  </span>
                  <select
                    value={cond.surface}
                    onChange={(e) => {
                      setCond({
                        ...cond,
                        surface: e.target.value as Conditions['surface'],
                      });
                      setParams(null);
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground"
                  >
                    <option value="clean">Чистая</option>
                    <option value="oxidized">Окисленная</option>
                    <option value="contaminated">Загрязнённая</option>
                  </select>
                </label>

                <label className="block">
                  <span className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Износ электрода</span>
                    <span className="font-mono text-foreground">
                      {cond.electrodeWearPct}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={cond.electrodeWearPct}
                    onChange={(e) => {
                      setCond({ ...cond, electrodeWearPct: +e.target.value });
                      setParams(null);
                    }}
                    className="mt-2 w-full accent-primary"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">
                    Требование к качеству
                  </span>
                  <select
                    value={cond.qualityTarget}
                    onChange={(e) => {
                      setCond({
                        ...cond,
                        qualityTarget: e.target.value as Conditions['qualityTarget'],
                      });
                      setParams(null);
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground"
                  >
                    <option value="standard">Стандартное</option>
                    <option value="high">Повышенное</option>
                  </select>
                </label>
              </div>

              <button
                onClick={applyStartMode}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Icon name="Zap" size={15} />
                Принять стартовый режим
              </button>
            </div>

            {/* Применённые правила */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon name="ListChecks" size={16} />
                Применённые правила
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {mode.applied.length}
                </span>
              </h2>

              {mode.applied.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Условия штатные — коррекция базового режима не требуется.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {mode.applied.map((r) => (
                    <li
                      key={r.ruleId + r.param}
                      className="border-l-2 border-primary/40 pl-2.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {r.ruleId}
                        </span>
                        <span className="font-medium text-foreground">
                          {PARAM_LABELS[r.param].label}
                        </span>
                        <span
                          className={`font-mono ${r.changePct > 0 ? 'text-emerald-600' : 'text-blue-600'}`}
                        >
                          {r.changePct > 0 ? '+' : ''}
                          {r.changePct}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {r.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ─── Колонка 2: мониторинг ─── */}
          <section className="space-y-4">
            <StabilityGauge value={result.stabilityIndex} status={result.status} />

            {/* Выбор сигнала */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon name="Activity" size={16} />
                Сигнал с датчиков
              </h2>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SIGNAL_LABELS) as SignalKind[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setSignalKind(k);
                      addLog(`Загружена осциллограмма: ${SIGNAL_LABELS[k]}`, 'info');
                    }}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                      signalKind === k
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {SIGNAL_LABELS[k]}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Oscilloscope
                  data={signal.voltage}
                  label="Напряжение дуги"
                  unit="В"
                  color="#2563eb"
                />
                <Oscilloscope
                  data={signal.current}
                  label="Ток плазмы"
                  unit="А"
                  color="#dc2626"
                />
                <Oscilloscope
                  data={signal.laserPower}
                  label="Мощность лазера"
                  unit="Вт"
                  color="#7c3aed"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-4">
                {[
                  ['Разброс U', `${result.features.voltageStdPct.toFixed(1)}%`],
                  ['Разброс I', `${result.features.currentStdPct.toFixed(1)}%`],
                  ['Пик-фактор I', result.features.currentCrest.toFixed(1)],
                  ['Дрейф P', `${result.features.powerTrendPct.toFixed(1)}%`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-mono font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Обнаруженные явления */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon name="ScanSearch" size={16} />
                Диагностика процесса
              </h2>

              {result.detections.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <Icon name="CircleCheck" size={18} className="text-emerald-600" />
                  <span className="text-sm text-emerald-700">
                    Отклонений не обнаружено, режим соответствует расчётному
                  </span>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {result.detections.map((d) => (
                    <li
                      key={d.key}
                      className={`rounded-lg border p-3 ${SEVERITY_STYLE[d.severity]}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">{d.title}</span>
                        <span className="shrink-0 rounded bg-white/60 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                          {d.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs opacity-90">{d.evidence}</p>
                      <p className="mt-1.5 text-xs">
                        <span className="font-medium">Причина: </span>
                        {d.cause}
                      </p>
                      <p className="mt-0.5 text-xs">
                        <span className="font-medium">Действие: </span>
                        {d.hint}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isCutting && (
              <>
                <EdgeQualityPanel
                  quality={edgeQuality}
                  onApply={applyEdgeCorrections}
                  canApply={edgeCorrections.length > 0}
                />
                <EconomicsPanel
                  economics={economics}
                  job={job}
                  onJobChange={setJob}
                  baselineDefectPct={proc.economics.baselineDefectPct}
                  expectedDefectPct={edgeQuality.expectedDefectPct}
                />
              </>
            )}
          </section>

          {/* ─── Колонка 3: режим и журнал ─── */}
          <section className="space-y-4">
            {/* Текущие параметры */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon name="SlidersHorizontal" size={16} />
                  Режим обработки
                </h2>
                <button
                  onClick={resetMode}
                  className="rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted"
                >
                  Сбросить
                </button>
              </div>

              <ul className="space-y-2">
                {Object.entries(activeParams).map(([k, v]) => {
                  const p = PARAM_LABELS[k];
                  const [lo, hi] = proc.limits[k];
                  const pct = ((v - lo) / (hi - lo)) * 100;
                  const changed = params && mode.params[k] !== v;
                  return (
                    <li key={k}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted-foreground">{p.label}</span>
                        <span
                          className={`font-mono font-medium ${changed ? 'text-amber-600' : 'text-foreground'}`}
                        >
                          {v} {p.unit}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${changed ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 rounded-md bg-muted/50 p-2 text-[11px] leading-snug text-muted-foreground">
                Материал {proc.material}, толщина {proc.thicknessMm} мм, газ {proc.gas}
              </p>
            </div>

            {/* Коррекции */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon name="Wand2" size={16} />
                Коррекция режима
              </h2>

              {corrections.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Коррекция не требуется — процесс в допуске.
                </p>
              ) : (
                <div className="space-y-3">
                  {autoCorrections.length > 0 && (
                    <div>
                      {autoCorrections.map((c) => (
                        <div
                          key={c.param}
                          className="mb-2 rounded-lg border border-border bg-muted/30 p-2.5"
                        >
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="font-medium text-foreground">
                              {PARAM_LABELS[c.param].label}
                            </span>
                            <span className="font-mono text-amber-600">
                              {c.changePct > 0 ? '+' : ''}
                              {c.changePct}%
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-xs text-muted-foreground">
                            {c.oldValue} → {c.newValue} {PARAM_LABELS[c.param].unit}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => applyCorrections(autoCorrections)}
                        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        Применить автокоррекцию
                      </button>
                    </div>
                  )}

                  {pending.length > 0 && (
                    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3">
                      <div className="flex items-center gap-1.5 text-red-700">
                        <Icon name="ShieldAlert" size={15} />
                        <span className="text-xs font-semibold">
                          Требуется подтверждение оператора
                        </span>
                      </div>
                      {pending.map((c) => (
                        <div key={c.param} className="mt-2">
                          <div className="font-mono text-xs text-red-800">
                            {PARAM_LABELS[c.param].label}: {c.oldValue} → {c.newValue}{' '}
                            {PARAM_LABELS[c.param].unit} ({c.changePct}%)
                          </div>
                          <p className="mt-1 text-[11px] leading-snug text-red-700">
                            {c.reason}
                          </p>
                        </div>
                      ))}
                      <button
                        onClick={() => applyCorrections(pending, true)}
                        className="mt-2.5 w-full rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700"
                      >
                        Подтвердить и применить
                      </button>
                    </div>
                  )}
                </div>
              )}

              <p className="mt-3 flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-[11px] leading-snug text-muted-foreground">
                <Icon name="Shield" size={13} className="mt-0.5 shrink-0" />
                <span>
                  Шаг коррекции ограничен {MAX_STEP_PCT}%. Критические события
                  не применяются автоматически — защита оборудования от прогара.
                </span>
              </p>
            </div>

            {/* Журнал */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon name="ScrollText" size={16} />
                Журнал событий
              </h2>

              {log.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  События появятся после действий оператора.
                </p>
              ) : (
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {log.map((e, i) => (
                    <li key={i} className="flex gap-2 text-[11px] leading-snug">
                      <span className="shrink-0 font-mono text-muted-foreground">
                        {e.time}
                      </span>
                      <span
                        className={
                          e.tone === 'crit'
                            ? 'text-red-600'
                            : e.tone === 'warn'
                              ? 'text-amber-600'
                              : e.tone === 'ok'
                                ? 'text-emerald-600'
                                : 'text-muted-foreground'
                        }
                      >
                        {e.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Чек-лист */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon name="ClipboardCheck" size={16} />
                Чек-лист перед пуском
              </h2>
              <ul className="space-y-1.5">
                {proc.checklist.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-[11px] leading-snug">
                    <Icon
                      name="Square"
                      size={13}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <span className="text-muted-foreground">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}