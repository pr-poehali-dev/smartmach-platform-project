import { apiGet, apiPost, apiPut } from "@/lib/api";

// ─── Типы ──────────────────────────────────────────────────────

export type ProjectStatus   = "planning" | "active" | "paused" | "completed" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type ProjectStage    = "initiation" | "planning" | "execution" | "monitoring" | "closure";
export type TaskStatus      = "todo" | "in_progress" | "review" | "done" | "cancelled";
export type BudgetCategory  = "materials" | "labor" | "equipment" | "services" | "other";

export interface Project {
  id: number;
  company_id: number;
  name: string;
  code: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  stage: ProjectStage;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  actual_end: string | null;
  budget_plan: number;
  budget_fact: number;
  progress_pct: number;
  manager_id: number | null;
  manager_name: string | null;
  manager_position: string | null;
  customer: string | null;
  notes: string | null;
  task_count?: number;
  task_done?: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: ProjectPriority;
  assignee_id: number | null;
  assignee_name: string | null;
  start_date: string | null;
  due_date: string | null;
  done_date: string | null;
  estimated_h: number;
  spent_h: number;
  progress_pct: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: number;
  project_id: number;
  category: BudgetCategory;
  name: string;
  plan: number;
  fact: number;
  note: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  employee_id: number;
  role: string;
  full_name: string;
  position: string;
  department: string;
}

export interface ProjectFull extends Project {
  tasks: ProjectTask[];
  budgets: BudgetItem[];
  members: ProjectMember[];
}

export interface Dashboard {
  active_count: number;
  planning_count: number;
  completed_count: number;
  paused_count: number;
  cancelled_count: number;
  total_count: number;
  total_budget_plan: number;
  total_budget_fact: number;
  avg_progress: number;
  overdue_count: number;
  tasks_in_progress: number;
  tasks_todo: number;
  tasks_done: number;
  tasks_overdue: number;
  recent_projects: Project[];
}

export interface Employee {
  id: number;
  full_name: string;
  position: string;
  department: string;
}

// ─── Конфиги ───────────────────────────────────────────────────

export const STATUS_CFG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  planning:  { label: "Планирование",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200"   },
  active:    { label: "Активный",       color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200" },
  paused:    { label: "Приостановлен",  color: "text-amber-700",  bg: "bg-amber-50 border-amber-200"  },
  completed: { label: "Завершён",       color: "text-slate-600",  bg: "bg-slate-50 border-slate-200"  },
  cancelled: { label: "Отменён",        color: "text-red-600",    bg: "bg-red-50 border-red-200"      },
};

export const PRIORITY_CFG: Record<ProjectPriority, { label: string; color: string; dot: string }> = {
  low:      { label: "Низкий",      color: "text-slate-500",  dot: "bg-slate-400"   },
  medium:   { label: "Средний",     color: "text-blue-600",   dot: "bg-blue-500"    },
  high:     { label: "Высокий",     color: "text-orange-600", dot: "bg-orange-500"  },
  critical: { label: "Критический", color: "text-red-600",    dot: "bg-red-500"     },
};

export const TASK_STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string; icon: string }> = {
  todo:        { label: "К выполнению", color: "text-slate-600",  bg: "bg-slate-100",   icon: "Circle"        },
  in_progress: { label: "В работе",     color: "text-blue-700",   bg: "bg-blue-50",     icon: "PlayCircle"    },
  review:      { label: "На проверке",  color: "text-amber-700",  bg: "bg-amber-50",    icon: "Eye"           },
  done:        { label: "Готово",       color: "text-emerald-700",bg: "bg-emerald-50",  icon: "CheckCircle2"  },
  cancelled:   { label: "Отменена",     color: "text-red-500",    bg: "bg-red-50",      icon: "XCircle"       },
};

export const STAGE_CFG: Record<ProjectStage, string> = {
  initiation: "Инициирование",
  planning:   "Планирование",
  execution:  "Исполнение",
  monitoring: "Мониторинг",
  closure:    "Закрытие",
};

export const BUDGET_CAT_CFG: Record<BudgetCategory, { label: string; color: string }> = {
  materials:  { label: "Материалы",     color: "text-blue-600"   },
  labor:      { label: "Трудозатраты",  color: "text-violet-600" },
  equipment:  { label: "Оборудование",  color: "text-orange-600" },
  services:   { label: "Услуги",        color: "text-teal-600"   },
  other:      { label: "Прочее",        color: "text-slate-500"  },
};

// ─── API ───────────────────────────────────────────────────────

export const projGet  = <T>(params: Record<string, string | number>) =>
  apiGet<T>("projects", "", params);

export const projPost = <T>(body: object, params: Record<string, string | number>) =>
  apiPost<T>("projects", body, params);

export const projPut  = <T>(body: object, params: Record<string, string | number>) =>
  apiPut<T>("projects", body, params);

// ─── Утилиты ───────────────────────────────────────────────────

export function fmt(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

export function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || ["completed", "cancelled", "done"].includes(status)) return false;
  return new Date(dateStr) < new Date();
}

export function budgetVariance(plan: number, fact: number): number {
  return plan > 0 ? ((fact - plan) / plan) * 100 : 0;
}
