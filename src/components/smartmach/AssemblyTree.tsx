import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  AssemblyNode, NodeType,
  NODE_TYPE_CFG, NODE_STATUS_CFG,
  buildTree, flattenTree,
  asmDelete,
} from "@/lib/assembly";
import AssemblyNodeForm from "@/components/smartmach/AssemblyNodeForm";
import AssemblyNodeDetail from "@/components/smartmach/AssemblyNodeDetail";

interface PartOption { id: number; code: string; name: string; material: string | null }

interface Props {
  assemblyId: number;
  nodes: AssemblyNode[];
  onRefresh: () => void;
  onNavigateToPart?: (partId: number) => void;
  partsList: PartOption[];
}

type FilterType = "all" | NodeType | "issues";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all",      label: "Все"         },
  { id: "assembly", label: "Сборки"      },
  { id: "part",     label: "Детали"      },
  { id: "standard", label: "Стандартные" },
  { id: "fastener", label: "Крепёж"      },
  { id: "material", label: "Материалы"   },
  { id: "issues",   label: "Замечания"   },
];

export default function AssemblyTree({ assemblyId, nodes, onRefresh, onNavigateToPart, partsList }: Props) {
  const [expanded,    setExpanded]    = useState<Map<number, boolean>>(() => {
    const m = new Map<number, boolean>();
    nodes.forEach(n => m.set(n.id, true));
    return m;
  });
  const [filter,      setFilter]      = useState<FilterType>("all");
  const [search,      setSearch]      = useState("");
  const [selected,    setSelected]    = useState<AssemblyNode | null>(null);
  const [formParent,  setFormParent]  = useState<number | null | undefined>(undefined);
  const [editNode,    setEditNode]    = useState<AssemblyNode | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [hovered,     setHovered]     = useState<number | null>(null);

  // Строим дерево с expanded из локального стейта
  const treeData = useMemo(() => {
    const tree = buildTree(nodes);
    function applyExpanded(ns: AssemblyNode[]) {
      ns.forEach(n => {
        n.expanded = expanded.get(n.id) !== false;
        if (n.children) applyExpanded(n.children);
      });
    }
    applyExpanded(tree);
    return tree;
  }, [nodes, expanded]);

  const flatRows = useMemo(() => {
    let rows = flattenTree(treeData);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(n =>
        n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q)
      );
    }
    if (filter === "issues") {
      rows = rows.filter(n => n.issue_flag);
    } else if (filter !== "all") {
      rows = rows.filter(n => n.node_type === filter || (filter === "standard" && n.node_type === "fastener"));
    }
    return rows;
  }, [treeData, filter, search]);

  function toggle(id: number) {
    setExpanded(m => {
      const nm = new Map(m);
      nm.set(id, !(nm.get(id) !== false));
      return nm;
    });
  }
  function expandAll()   { setExpanded(m => { const nm = new Map(m); nodes.forEach(n => nm.set(n.id, true));  return nm; }); }
  function collapseAll() { setExpanded(m => { const nm = new Map(m); nodes.forEach(n => nm.set(n.id, false)); return nm; }); }

  function openAddRoot()    { setEditNode(null); setFormParent(null);      setShowForm(true); }
  function openAddChild(n: AssemblyNode) { setEditNode(null); setFormParent(n.id); setShowForm(true); }
  function openEdit(n: AssemblyNode)     { setEditNode(n);   setFormParent(n.parent_id); setShowForm(true); }

  async function deleteNode(n: AssemblyNode) {
    const hasChildren = nodes.some(x => x.parent_id === n.id);
    const msg = hasChildren
      ? `Удалить «${n.name}» и все его дочерние узлы?`
      : `Удалить «${n.name}»?`;
    if (!confirm(msg)) return;
    await asmDelete("nodes", n.id);
    if (selected?.id === n.id) setSelected(null);
    onRefresh();
  }

  function onFormSave() {
    setShowForm(false);
    if (selected) setSelected(null);
    onRefresh();
  }

  const hasChildren = (nodeId: number) => nodes.some(n => n.parent_id === nodeId);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Поиск */}
        <div className="relative flex-1 min-w-0">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или коду…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
        {/* Действия */}
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={expandAll}   className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-secondary/60 transition-colors" title="Развернуть всё">
            <Icon name="ChevronsDown" size={14} />
          </button>
          <button onClick={collapseAll} className="px-3 py-2 text-xs border border-border rounded-lg hover:bg-secondary/60 transition-colors" title="Свернуть всё">
            <Icon name="ChevronsUp" size={14} />
          </button>
          <button onClick={openAddRoot}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
            <Icon name="Plus" size={14} />
            <span className="hidden sm:inline">Добавить узел</span><span className="sm:hidden">Узел</span>
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              filter === f.id
                ? f.id === "issues"
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Основной layout: дерево + деталь ────── */}
      <div className="flex gap-4 items-start">
        {/* Дерево */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Шапка таблицы */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_80px_80px_auto] items-center px-3 py-2 bg-secondary/40 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground gap-2">
            <span className="w-4" />
            <span>Наименование / Обозначение</span>
            <span className="text-center hidden sm:block">Кол-во</span>
            <span className="text-center hidden sm:block">Масса, кг</span>
            <span />
          </div>

          {flatRows.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Icon name="GitBranch" size={36} className="mx-auto mb-2 opacity-20" />
              {search || filter !== "all" ? "Ничего не найдено" : "Узлов пока нет. Добавьте первый."}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {flatRows.map((node, idx) => {
                const typeCfg   = NODE_TYPE_CFG[node.node_type]  ?? NODE_TYPE_CFG.part;
                const statusCfg = NODE_STATUS_CFG[node.status]   ?? NODE_STATUS_CFG.draft;
                const isSelected = selected?.id === node.id;
                const isHovered  = hovered === node.id;
                const hasCh      = hasChildren(node.id);
                const level      = node.level ?? 0;

                return (
                  <div
                    key={node.id}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(isSelected ? null : node)}
                    className={cn(
                      "grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_80px_80px_auto] items-center px-3 py-2 gap-2 cursor-pointer transition-colors text-sm",
                      isSelected  && "bg-primary/8 border-l-2 border-l-primary",
                      !isSelected && idx % 2 === 1 && "bg-secondary/20",
                      !isSelected && isHovered && "bg-secondary/50",
                      node.issue_flag && !isSelected && "bg-red-50/60"
                    )}
                    style={{ paddingLeft: `${12 + level * 20}px` }}
                  >
                    {/* Expand / dot */}
                    <div className="w-5 flex-shrink-0 flex items-center justify-center">
                      {hasCh ? (
                        <button
                          onClick={e => { e.stopPropagation(); toggle(node.id); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Icon name={node.expanded ? "ChevronDown" : "ChevronRight"} size={14} />
                        </button>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} opacity-60`} />
                      )}
                    </div>

                    {/* Иконка + имя + код */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-shrink-0">
                        <Icon
                          name={typeCfg.icon as Parameters<typeof Icon>[0]["name"]}
                          size={14}
                          className={typeCfg.color}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {node.path && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{node.path}</span>
                          )}
                          {node.issue_flag && (
                            <Icon name="AlertTriangle" size={11} className="text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="font-medium text-foreground truncate leading-tight">{node.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{node.code}</div>
                      </div>
                    </div>

                    {/* Количество */}
                    <div className="hidden sm:flex items-center justify-center">
                      <span className="text-xs text-center font-medium">
                        {Number(node.qty) % 1 === 0 ? Number(node.qty) : node.qty}
                        <span className="text-[10px] text-muted-foreground ml-0.5">{node.unit}</span>
                      </span>
                    </div>

                    {/* Масса */}
                    <div className="hidden sm:flex items-center justify-center">
                      {node.total_weight_kg != null ? (
                        <span className="text-xs text-muted-foreground">
                          {Number(node.total_weight_kg).toFixed(2)}
                        </span>
                      ) : <span className="text-[10px] text-muted-foreground/40">—</span>}
                    </div>

                    {/* Действия */}
                    <div
                      className={cn(
                        "flex items-center gap-0.5 flex-shrink-0 transition-opacity",
                        isHovered || isSelected ? "opacity-100" : "opacity-0"
                      )}
                      onClick={e => e.stopPropagation()}
                    >
                      {(node.node_type === "assembly") && (
                        <button
                          onClick={() => openAddChild(node)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="Добавить дочерний узел"
                        >
                          <Icon name="Plus" size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(node)}
                        className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                        title="Редактировать"
                      >
                        <Icon name="Pencil" size={13} />
                      </button>
                      <button
                        onClick={() => deleteNode(node)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Удалить"
                      >
                        <Icon name="Trash2" size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Панель детали — только на lg+ */}
        {selected && (
          <div className="hidden lg:block w-72 flex-shrink-0">
            <AssemblyNodeDetail
              node={selected}
              onEdit={() => openEdit(selected)}
              onClose={() => setSelected(null)}
              onNavigateToPart={onNavigateToPart}
            />
          </div>
        )}
      </div>

      {/* Панель детали — на мобиле под деревом */}
      {selected && (
        <div className="lg:hidden">
          <AssemblyNodeDetail
            node={selected}
            onEdit={() => openEdit(selected)}
            onClose={() => setSelected(null)}
            onNavigateToPart={onNavigateToPart}
          />
        </div>
      )}

      {/* Форма создания/редактирования */}
      {showForm && (
        <AssemblyNodeForm
          assemblyId={assemblyId}
          parentId={formParent}
          node={editNode}
          partsList={partsList}
          onSave={onFormSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
