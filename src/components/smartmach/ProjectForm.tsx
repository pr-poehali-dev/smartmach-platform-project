import { useState } from "react";
import Icon from "@/components/ui/icon";
import { projPost, projPut, Employee, Project, ProjectStatus, ProjectPriority, ProjectStage, STAGE_CFG } from "@/lib/projects";

interface Props {
  project?: Project | null;
  employees: Employee[];
  onSaved: (p: Project) => void;
  onClose: () => void;
}

const inp = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white";
const lbl = "block text-xs text-muted-foreground mb-1 font-medium";

export default function ProjectForm({ project, employees, onSaved, onClose }: Props) {
  const isEdit = !!project;

  const [name,       setName]       = useState(project?.name ?? "");
  const [code,       setCode]       = useState(project?.code ?? "");
  const [description,setDescription]= useState(project?.description ?? "");
  const [status,     setStatus]     = useState<ProjectStatus>(project?.status ?? "planning");
  const [priority,   setPriority]   = useState<ProjectPriority>(project?.priority ?? "medium");
  const [stage,      setStage]      = useState<ProjectStage>(project?.stage ?? "initiation");
  const [category,   setCategory]   = useState(project?.category ?? "");
  const [startDate,  setStartDate]  = useState(project?.start_date?.slice(0,10) ?? "");
  const [endDate,    setEndDate]    = useState(project?.end_date?.slice(0,10) ?? "");
  const [budgetPlan, setBudgetPlan] = useState(String(project?.budget_plan ?? ""));
  const [managerId,  setManagerId]  = useState(String(project?.manager_id ?? ""));
  const [customer,   setCustomer]   = useState(project?.customer ?? "");
  const [notes,      setNotes]      = useState(project?.notes ?? "");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Название обязательно"); return; }
    setSaving(true); setError(null);
    const body = {
      name: name.trim(), code, description: description || null,
      status, priority, stage, category: category || null,
      start_date: startDate || null, end_date: endDate || null,
      budget_plan: parseFloat(budgetPlan) || 0,
      manager_id: managerId ? parseInt(managerId) : null,
      customer: customer || null, notes: notes || null,
    };
    try {
      let saved: Project;
      if (isEdit && project) {
        saved = await projPut<Project>(body, { resource: "project", id: project.id });
      } else {
        saved = await projPost<Project>(body, { resource: "project" });
      }
      onSaved(saved);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-foreground">
            {isEdit ? "Редактировать проект" : "Новый проект"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={lbl}>Название проекта *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Разработка редуктора РЦ-250" className={inp} />
            </div>
            <div>
              <label className={lbl}>Код / Номер</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="ПР-2024-001" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} className={`${inp} resize-none`} placeholder="Краткое описание цели проекта" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={lbl}>Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className={inp}>
                <option value="planning">Планирование</option>
                <option value="active">Активный</option>
                <option value="paused">Приостановлен</option>
                <option value="completed">Завершён</option>
                <option value="cancelled">Отменён</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Приоритет</label>
              <select value={priority} onChange={e => setPriority(e.target.value as ProjectPriority)} className={inp}>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="critical">Критический</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Стадия</label>
              <select value={stage} onChange={e => setStage(e.target.value as ProjectStage)} className={inp}>
                {(Object.entries(STAGE_CFG) as [ProjectStage, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Категория</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={inp}>
                <option value="">—</option>
                <option value="production">Производство</option>
                <option value="rd">НИОКР</option>
                <option value="infrastructure">Инфраструктура</option>
                <option value="commercial">Коммерческий</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={lbl}>Начало</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Дедлайн</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Бюджет план, ₽</label>
              <input type="number" value={budgetPlan} onChange={e => setBudgetPlan(e.target.value)}
                placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>Руководитель</label>
              <select value={managerId} onChange={e => setManagerId(e.target.value)} className={inp}>
                <option value="">—</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Заказчик / Клиент</label>
            <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="ООО «Завод»" className={inp} />
          </div>

          <div>
            <label className={lbl}>Примечание</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className={`${inp} resize-none`} />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <Icon name="AlertTriangle" size={15} />{error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">
              Отмена
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50 font-medium">
              {saving
                ? <><Icon name="Loader" size={14} className="animate-spin" />Сохранение…</>
                : <><Icon name="Save" size={14} />{isEdit ? "Сохранить" : "Создать проект"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
