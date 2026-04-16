import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

interface Employee {
  id: number;
  full_name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  salary: number;
  hire_date: string | null;
  status: "active" | "vacation" | "fired";
  notes: string;
}

const EMPTY: Omit<Employee, "id"> = {
  full_name: "", position: "", department: "", email: "", phone: "",
  salary: 0, hire_date: "", status: "active", notes: "",
};

const STATUS_CFG = {
  active:   { label: "Работает", color: "bg-green-100 text-green-800" },
  vacation: { label: "В отпуске", color: "bg-yellow-100 text-yellow-800" },
  fired:    { label: "Уволен",    color: "bg-gray-100 text-gray-500" },
};

const DEPARTMENTS = ["Производство", "Технология", "Конструкторский", "ОТК", "Снабжение", "Администрация", "Прочее"];

export default function ModuleEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [deptFilter, setDeptFilter] = useState("Все");
  const [selected, setSelected]   = useState<Employee | null>(null);
  const [editMode, setEditMode]   = useState(false);
  const [isNew, setIsNew]         = useState(false);
  const [form, setForm]           = useState<Omit<Employee, "id">>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<Employee[]>("economics", "", { resource: "employees" });
      setEmployees(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const departments = ["Все", ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))];

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.full_name.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
    const matchDept = deptFilter === "Все" || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const counts = {
    total:   employees.length,
    active:  employees.filter((e) => e.status === "active").length,
    vacation:employees.filter((e) => e.status === "vacation").length,
    fired:   employees.filter((e) => e.status === "fired").length,
    payroll: employees.filter((e) => e.status !== "fired").reduce((s, e) => s + Number(e.salary), 0),
  };

  function openCreate() {
    setForm(EMPTY); setIsNew(true); setEditMode(true); setSelected(null);
  }
  function openEdit(e: Employee) {
    setForm({ ...e }); setIsNew(false); setEditMode(true);
  }

  async function handleSave() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await apiPost("economics", form, { resource: "employees" });
      } else if (selected) {
        await apiPut("economics", form, { resource: "employees", id: selected.id });
      }
      await load();
      setEditMode(false); setSelected(null);
    } catch { alert("Ошибка сохранения"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await apiDelete("economics", { resource: "employees", id: deleteTarget.id });
    await load();
    setDeleteTarget(null); setSelected(null);
  }

  const f = (k: keyof typeof EMPTY, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const fmt = (n: number) => n.toLocaleString("ru-RU");

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {/* Шапка */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Сотрудники</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Справочник персонала предприятия</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shrink-0">
          <Icon name="Plus" size={16} /><span className="hidden sm:inline">Добавить сотрудника</span><span className="sm:hidden">Сотрудник</span>
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Всего",       value: counts.total,   icon: "Users",            color: "text-blue-600 bg-blue-50" },
          { label: "Работает",    value: counts.active,  icon: "UserCheck",        color: "text-green-600 bg-green-50" },
          { label: "В отпуске",   value: counts.vacation,icon: "Plane",            color: "text-yellow-600 bg-yellow-50" },
          { label: "ФОТ/мес",    value: `${fmt(counts.payroll)} ₽`, icon: "Wallet", color: "text-purple-600 bg-purple-50" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
              <Icon name={m.icon as Parameters<typeof Icon>[0]["name"]} size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-tight">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, должности, email..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {departments.map((d) => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                deptFilter === d ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"
              }`}>{d}</button>
          ))}
        </div>
      </div>

      {/* Форма создания/редактирования */}
      {editMode && (
        <div className="bg-white border border-border rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">{isNew ? "Новый сотрудник" : "Редактировать сотрудника"}</span>
            <button onClick={() => setEditMode(false)}><Icon name="X" size={18} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">ФИО *</label>
              <input value={form.full_name} onChange={(e) => f("full_name", e.target.value)} placeholder="Иванов Иван Иванович"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Статус</label>
              <select value={form.status} onChange={(e) => f("status", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Должность</label>
              <input value={form.position} onChange={(e) => f("position", e.target.value)} placeholder="Токарь 4р."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Отдел / цех</label>
              <select value={form.department} onChange={(e) => f("department", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— выберите —</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Оклад, ₽</label>
              <input type="number" value={form.salary} onChange={(e) => f("salary", Number(e.target.value))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => f("email", e.target.value)} placeholder="ivanov@company.ru"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Телефон</label>
              <input value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="+7 900 000-00-00"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Дата приёма</label>
              <input type="date" value={form.hire_date ?? ""} onChange={(e) => f("hire_date", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Примечания</label>
              <input value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Необязательно"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEditMode(false)}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
            <button onClick={handleSave} disabled={saving || !form.full_name.trim()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? "Сохранение…" : isNew ? "Добавить" : "Сохранить"}
            </button>
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40 flex justify-between items-center">
          <span className="text-sm font-semibold">Список сотрудников</span>
          <span className="text-xs text-muted-foreground">{filtered.length} из {employees.length}</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="Loader2" size={28} className="mx-auto mb-2 opacity-40 animate-spin" />Загрузка…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <Icon name="Users" size={36} className="mx-auto mb-2 opacity-20" />Сотрудники не найдены
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">ФИО</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Должность</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Отдел</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Контакты</th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Оклад</th>
                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Статус</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-secondary/20 cursor-pointer"
                  onClick={() => { setSelected(e); setEditMode(false); }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                        {e.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                      </div>
                      <span className="font-medium">{e.full_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{e.position}</td>
                  <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{e.department}</td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {e.email && <div>{e.email}</div>}
                      {e.phone && <div>{e.phone}</div>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-medium">{fmt(Number(e.salary))} ₽</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CFG[e.status]?.color ?? ""}`}>
                      {STATUS_CFG[e.status]?.label ?? e.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); setSelected(e); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <Icon name="Pencil" size={13} />
                      </button>
                      <button onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500">
                        <Icon name="Trash2" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Диалог подтверждения удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Удалить сотрудника?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Сотрудник <span className="font-medium text-foreground">«{deleteTarget.full_name}»</span> будет удалён из справочника.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary/60">Отмена</button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}