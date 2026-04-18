import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  ProjectTask, TaskStatus, ProjectPriority, Employee,
  TASK_STATUS_CFG, PRIORITY_CFG,
  projPost, projPut, fmtDate, isOverdue,
} from "@/lib/projects";

interface Props {
  projectId: number;
  tasks: ProjectTask[];
  employees: Employee[];
  onRefresh: () => void;
}

const inp = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white";

function TaskRow({
  task, depth, employees, onStatusChange, onEdit,
}: {
  task: ProjectTask;
  depth: number;
  employees: Employee[];
  onStatusChange: (id: number, status: TaskStatus) => void;
  onEdit: (t: ProjectTask) => void;
}) {
  const cfg     = TASK_STATUS_CFG[task.status];
  const priCfg  = PRIORITY_CFG[task.priority];
  const overdue = isOverdue(task.due_date, task.status);

  const NEXT: Record<TaskStatus, TaskStatus> = {
    todo: "in_progress", in_progress: "review",
    review: "done", done: "todo", cancelled: "todo",
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 border-b border-border/40 hover:bg-secondary/20 transition-colors text-sm",
      depth > 0 && "bg-secondary/10"
    )} style={{ paddingLeft: `${12 + depth * 20}px` }}>
      {/* Статус-кнопка */}
      <button
        onClick={() => onStatusChange(task.id, NEXT[task.status])}
        className={cn("flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border transition-colors", cfg.bg)}
        title={`Перевести в: ${TASK_STATUS_CFG[NEXT[task.status]].label}`}
      >
        <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={13} className={cfg.color} />
      </button>

      {/* Имя */}
      <span className={cn("flex-1 min-w-0 truncate", task.status === "done" && "line-through text-muted-foreground")}>
        {task.name}
      </span>

      {/* Приоритет */}
      <span className={cn("text-[10px] font-medium shrink-0", priCfg.color)}>{priCfg.label}</span>

      {/* Исполнитель */}
      <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block w-28 truncate text-right">
        {task.assignee_name ?? "—"}
      </span>

      {/* Дедлайн */}
      <span className={cn("text-[11px] shrink-0 hidden md:block w-24 text-right",
        overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
        {fmtDate(task.due_date)}
      </span>

      {/* Часы */}
      <span className="text-[11px] text-muted-foreground shrink-0 hidden lg:block w-16 text-right">
        {task.spent_h > 0 ? `${task.spent_h}/${task.estimated_h}ч` : task.estimated_h > 0 ? `${task.estimated_h}ч` : "—"}
      </span>

      {/* Редактировать */}
      <button onClick={() => onEdit(task)}
        className="shrink-0 p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground">
        <Icon name="Pencil" size={13} />
      </button>
    </div>
  );
}

interface TaskFormProps {
  task?: ProjectTask | null;
  projectId: number;
  parentId?: number | null;
  employees: Employee[];
  onSaved: () => void;
  onClose: () => void;
}

function TaskForm({ task, projectId, parentId, employees, onSaved, onClose }: TaskFormProps) {
  const [name,       setName]       = useState(task?.name ?? "");
  const [description,setDescription]= useState(task?.description ?? "");
  const [status,     setStatus]     = useState<TaskStatus>(task?.status ?? "todo");
  const [priority,   setPriority]   = useState<ProjectPriority>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState(String(task?.assignee_id ?? ""));
  const [startDate,  setStartDate]  = useState(task?.start_date?.slice(0,10) ?? "");
  const [dueDate,    setDueDate]    = useState(task?.due_date?.slice(0,10) ?? "");
  const [estimatedH, setEstimatedH] = useState(String(task?.estimated_h ?? ""));
  const [spentH,     setSpentH]     = useState(String(task?.spent_h ?? ""));
  const [saving,     setSaving]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const body = {
      name: name.trim(), description: description || null,
      status, priority,
      assignee_id: assigneeId ? parseInt(assigneeId) : null,
      start_date: startDate || null, due_date: dueDate || null,
      estimated_h: parseFloat(estimatedH) || 0,
      spent_h: parseFloat(spentH) || 0,
      project_id: projectId,
      parent_id: parentId ?? null,
    };
    try {
      if (task) {
        await projPut(body, { resource: "task", id: task.id });
      } else {
        await projPost(body, { resource: "task" });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold">{task ? "Редактировать задачу" : "Новая задача"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60">
            <Icon name="X" size={16} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Название *</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Разработка чертежей корпуса" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} className={`${inp} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={inp}>
                {Object.entries(TASK_STATUS_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Приоритет</label>
              <select value={priority} onChange={e => setPriority(e.target.value as ProjectPriority)} className={inp}>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="critical">Критический</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Исполнитель</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={inp}>
              <option value="">—</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Дата начала</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Срок сдачи</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Оценка, ч</label>
              <input type="number" value={estimatedH} onChange={e => setEstimatedH(e.target.value)} className={inp} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Затрачено, ч</label>
              <input type="number" value={spentH} onChange={e => setSpentH(e.target.value)} className={inp} placeholder="0" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
            <button type="submit" disabled={saving || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Save" size={14} />}
              {task ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectTasks({ projectId, tasks, employees, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [filter,   setFilter]  = useState<TaskStatus | "all">("all");

  const topLevel   = tasks.filter(t => !t.parent_id);
  const getChildren = (pid: number) => tasks.filter(t => t.parent_id === pid);

  const filtered = filter === "all"
    ? topLevel
    : topLevel.filter(t => t.status === filter || getChildren(t.id).some(c => c.status === filter));

  async function handleStatusChange(id: number, status: TaskStatus) {
    await projPut({ status }, { resource: "task", id });
    onRefresh();
  }

  const totalH    = tasks.reduce((s, t) => s + (t.estimated_h ?? 0), 0);
  const spentH    = tasks.reduce((s, t) => s + (t.spent_h ?? 0), 0);
  const doneCount = tasks.filter(t => t.status === "done").length;

  return (
    <div className="space-y-3">
      {/* Шапка */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{tasks.length}</strong> задач</span>
          <span>·</span>
          <span><strong className="text-emerald-600">{doneCount}</strong> выполнено</span>
          {totalH > 0 && <>
            <span>·</span>
            <span>{spentH}/{totalH} ч</span>
          </>}
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value as TaskStatus | "all")}
            className="border border-border rounded-lg px-2 py-1.5 text-xs">
            <option value="all">Все статусы</option>
            {Object.entries(TASK_STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={() => { setEditTask(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:opacity-90 font-medium">
            <Icon name="Plus" size={13} />Задача
          </button>
        </div>
      </div>

      {/* Шапка таблицы */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/60 border-b border-border text-[10px] font-semibold uppercase text-muted-foreground">
          <div className="w-6 shrink-0" />
          <div className="flex-1">Задача</div>
          <div className="shrink-0 hidden sm:block w-20 text-center">Приоритет</div>
          <div className="shrink-0 hidden sm:block w-28 text-right">Исполнитель</div>
          <div className="shrink-0 hidden md:block w-24 text-right">Срок</div>
          <div className="shrink-0 hidden lg:block w-16 text-right">Часы</div>
          <div className="w-7 shrink-0" />
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Icon name="CheckSquare" size={28} className="mx-auto mb-2 opacity-30" />
            Задач нет. Добавьте первую.
          </div>
        ) : (
          <div>
            {filtered.map(task => (
              <div key={task.id}>
                <TaskRow task={task} depth={0} employees={employees}
                  onStatusChange={handleStatusChange}
                  onEdit={t => { setEditTask(t); setShowForm(true); }} />
                {getChildren(task.id).map(child => (
                  <TaskRow key={child.id} task={child} depth={1} employees={employees}
                    onStatusChange={handleStatusChange}
                    onEdit={t => { setEditTask(t); setShowForm(true); }} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TaskForm
          task={editTask}
          projectId={projectId}
          employees={employees}
          onSaved={() => { setShowForm(false); onRefresh(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
