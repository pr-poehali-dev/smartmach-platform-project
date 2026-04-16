import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { mGet, mGetPartsList, type Stats, type Job } from "@/lib/manufacture";
import AiAssistant from "@/components/smartmach/AiAssistant";
import { apiGet } from "@/lib/api";
import { AI_SYSTEM, AI_SUGGESTIONS, EMPTY_JOB } from "@/components/smartmach/analytics.types";
import AnalyticsCycleBar from "@/components/smartmach/AnalyticsCycleBar";
import AnalyticsJobForm   from "@/components/smartmach/AnalyticsJobForm";
import AnalyticsJobList   from "@/components/smartmach/AnalyticsJobList";

interface Props {
  preselectPartId?:    number;
  preselectProgramId?: number;
  onNavigateToPart?:    () => void;
  onNavigateToProgram?: (programId: number) => void;
}

export default function ModuleAnalytics({ preselectPartId, preselectProgramId, onNavigateToPart, onNavigateToProgram }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_JOB);
  const [products, setProducts] = useState<{ id: number; name: string; code: string }[]>([]);
  const [parts, setParts] = useState<{ id: number; name: string; code: string }[]>([]);
  const [machines, setMachines] = useState<{ id: number; name: string }[]>([]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [s, j, pr, pa, m] = await Promise.all([
        mGet<Stats>("stats"), mGet<Job[]>("jobs"),
        apiGet<{ id: number; name: string; code: string }[]>("plm", "", { resource: "products" }),
        mGetPartsList(),
        mGet<{ id: number; name: string }[]>("machines"),
      ]);
      setStats(s); setJobs(j); setProducts(pr); setParts(pa); setMachines(m);
    } catch { setError("Не удалось загрузить данные"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Автооткрытие формы при переходе из CAM
  useEffect(() => {
    if (preselectPartId !== undefined || preselectProgramId !== undefined) {
      setForm((prev) => ({
        ...prev,
        part_id:    preselectPartId    !== undefined ? String(preselectPartId)    : prev.part_id,
        program_id: preselectProgramId !== undefined ? String(preselectProgramId) : prev.program_id,
      }));
      setShowForm(true);
    }
  }, [preselectPartId, preselectProgramId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const { mPost } = await import("@/lib/manufacture");
      await mPost("jobs", {
        product_id: form.product_id ? Number(form.product_id) : null,
        part_id:    form.part_id    ? Number(form.part_id)    : null,
        program_id: form.program_id ? Number(form.program_id) : null,
        machine_id: form.machine_id ? Number(form.machine_id) : null,
        status: form.status, priority: form.priority,
        qty: Number(form.qty),
        due_date: form.due_date || null,
        notes:    form.notes    || null,
      });
      setForm(EMPTY_JOB); setShowForm(false); await load();
    } catch { alert("Ошибка при создании задания"); }
    finally { setSaving(false); }
  }

  async function advanceJob(job: Job) {
    const order = ["new", "cad", "cae", "cam", "cnc", "done"];
    const idx = order.indexOf(job.status);
    if (idx < 0 || idx >= order.length - 1) return;
    try {
      const { mPut } = await import("@/lib/manufacture");
      await mPut("jobs", job.id, { status: order[idx + 1] });
      await load();
    } catch { alert("Ошибка обновления"); }
  }

  const f = (k: keyof typeof EMPTY_JOB, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Производственные задания</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Полный цикл: Проектирование → Расчёт → Программа ЧПУ → Обработка → Готово</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Icon name="Plus" size={16} />Новое задание
        </button>
      </div>

      <AnalyticsCycleBar stats={stats} jobs={jobs} />

      {showForm && (
        <AnalyticsJobForm
          form={form}
          saving={saving}
          products={products}
          parts={parts}
          machines={machines}
          onField={f}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      <AnalyticsJobList
        jobs={jobs}
        loading={loading}
        error={error}
        onRetry={load}
        onAdvance={advanceJob}
        onNavigateToPart={onNavigateToPart}
        onNavigateToProgram={onNavigateToProgram}
      />

      <AiAssistant
        title="Помощник по заданиям"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}