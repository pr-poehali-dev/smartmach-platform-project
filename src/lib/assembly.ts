import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

// ─── Типы ──────────────────────────────────────────────────────

export type AsmType   = "assembly" | "unit" | "mechanism" | "aggregate" | "product";
export type AsmStage  = "draft" | "design" | "review" | "approved" | "production" | "archive";
export type NodeType  = "assembly" | "part" | "standard" | "fastener" | "material" | "purchased";
export type NodeStatus = "draft" | "in_design" | "checking" | "approved" | "production" | "issue";

export interface Assembly {
  id: number;
  company_id: number | null;
  code: string;
  name: string;
  description: string | null;
  asm_type: AsmType;
  stage: AsmStage;
  revision: string;
  standard: string | null;
  weight_kg: number | null;
  notes: string | null;
  owner_id: number | null;
  owner_name: string | null;
  product_id: number | null;
  node_count?: number;
  calc_weight_kg?: number | string;
  created_at: string;
  updated_at: string;
}

export interface AssemblyNode {
  id: number;
  assembly_id: number;
  parent_id: number | null;
  path: string;
  position_no: number | null;
  sort_order: number;
  node_type: NodeType;
  code: string;
  name: string;
  revision: string;
  qty: number | string;
  unit: string;
  material: string | null;
  weight_kg: number | null;
  total_weight_kg: number | null;
  dimensions: string | null;
  surface_finish: string | null;
  heat_treatment: string | null;
  tolerance_class: string | null;
  fit_type: string | null;
  status: NodeStatus;
  part_id: number | null;
  part_name: string | null;
  part_code: string | null;
  child_assembly_id: number | null;
  child_asm_name: string | null;
  notes: string | null;
  issue_flag: boolean;
  issue_note: string | null;
  supplier: string | null;
  supplier_code: string | null;
  lead_time_days: number | null;
  standard_ref: string | null;
  created_at: string;
  updated_at: string;
  // фронтенд-поля (не в БД)
  children?: AssemblyNode[];
  expanded?: boolean;
  level?: number;
}

export interface BomSection {
  title: string;
  items: AssemblyNode[];
}

export interface BomResult {
  assembly_id: number;
  total_weight_kg: number;
  total_positions: number;
  sections: BomSection[];
}

export interface AssemblyStats {
  total_nodes: string | number;
  parts_count: string | number;
  subasm_count: string | number;
  standards_count: string | number;
  materials_count: string | number;
  purchased_count: string | number;
  issues_count: string | number;
  draft_count: string | number;
  approved_count: string | number;
  total_weight_kg: string | number;
}

export interface AssemblySnapshot {
  id: number;
  assembly_id: number;
  revision: string;
  comment: string | null;
  author_id: number | null;
  created_at: string;
}

// ─── Визуальные конфиги ────────────────────────────────────────

export const ASM_STAGE_CFG: Record<AsmStage, { label: string; color: string }> = {
  draft:      { label: "Черновик",      color: "bg-gray-100 text-gray-600 border-gray-200" },
  design:     { label: "В разработке",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  review:     { label: "На проверке",   color: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:   { label: "Согласовано",   color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  production: { label: "В производстве",color: "bg-green-100 text-green-700 border-green-200" },
  archive:    { label: "Архив",         color: "bg-gray-100 text-gray-400 border-gray-200" },
};

export const NODE_TYPE_CFG: Record<NodeType, { label: string; color: string; icon: string; sectionOrder: number }> = {
  assembly:  { label: "Сб. единица",   color: "text-blue-600",   icon: "Package",     sectionOrder: 1 },
  part:      { label: "Деталь",        color: "text-slate-700",  icon: "Box",         sectionOrder: 2 },
  standard:  { label: "Стандартное",   color: "text-purple-600", icon: "Hexagon",     sectionOrder: 3 },
  fastener:  { label: "Крепёж",        color: "text-purple-600", icon: "Hexagon",     sectionOrder: 3 },
  purchased: { label: "Покупное",      color: "text-orange-600", icon: "ShoppingCart",sectionOrder: 4 },
  material:  { label: "Материал",      color: "text-teal-600",   icon: "FlaskConical",sectionOrder: 5 },
};

export const NODE_STATUS_CFG: Record<NodeStatus, { label: string; dot: string }> = {
  draft:      { label: "Черновик",     dot: "bg-gray-400" },
  in_design:  { label: "Разработка",   dot: "bg-blue-500" },
  checking:   { label: "Проверка",     dot: "bg-amber-500" },
  approved:   { label: "Утверждено",   dot: "bg-emerald-500" },
  production: { label: "Производство", dot: "bg-green-600" },
  issue:      { label: "Замечание",    dot: "bg-red-500" },
};

export const ASM_TYPE_LABELS: Record<AsmType, string> = {
  assembly:  "Сборочная единица",
  unit:      "Узел",
  mechanism: "Механизм",
  aggregate: "Агрегат",
  product:   "Изделие",
};

// ─── Утилиты ───────────────────────────────────────────────────

/** Строит дерево из плоского списка узлов */
export function buildTree(nodes: AssemblyNode[]): AssemblyNode[] {
  const map = new Map<number, AssemblyNode>();
  nodes.forEach(n => map.set(n.id, { ...n, children: [], expanded: true, level: 0 }));

  const roots: AssemblyNode[] = [];
  map.forEach(node => {
    if (node.parent_id == null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  // проставляем уровень рекурсивно
  function setLevel(nodes: AssemblyNode[], level: number) {
    nodes.forEach(n => {
      n.level = level;
      if (n.children?.length) setLevel(n.children, level + 1);
    });
  }
  setLevel(roots, 0);

  // сортируем
  function sortNodes(nodes: AssemblyNode[]) {
    nodes.sort((a, b) => (a.sort_order - b.sort_order) || ((a.position_no ?? 0) - (b.position_no ?? 0)));
    nodes.forEach(n => { if (n.children?.length) sortNodes(n.children); });
  }
  sortNodes(roots);

  return roots;
}

/** Плоский обход дерева (для рендера) */
export function flattenTree(nodes: AssemblyNode[]): AssemblyNode[] {
  const result: AssemblyNode[] = [];
  function walk(nodes: AssemblyNode[]) {
    nodes.forEach(n => {
      result.push(n);
      if (n.expanded && n.children?.length) walk(n.children);
    });
  }
  walk(nodes);
  return result;
}

/** Суммарная масса узлов верхнего уровня */
export function calcTotalWeight(nodes: AssemblyNode[]): number {
  return nodes
    .filter(n => n.parent_id == null && n.total_weight_kg != null)
    .reduce((s, n) => s + Number(n.total_weight_kg), 0);
}

// ─── API ───────────────────────────────────────────────────────

export async function asmGet<T>(resource: string, extra: Record<string, string | number> = {}): Promise<T> {
  return apiGet<T>("assembly", "/", { resource, ...extra });
}

export async function asmPost<T>(resource: string, body: object): Promise<T> {
  return apiPost<T>("assembly", body, { resource });
}

export async function asmPut(resource: string, id: number, body: object): Promise<AssemblyNode | Assembly> {
  return apiPut<AssemblyNode | Assembly>("assembly", body, { resource, id });
}

export async function asmDelete(resource: string, id: number): Promise<void> {
  return apiDelete<void>("assembly", { resource, id });
}
