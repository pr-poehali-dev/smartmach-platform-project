import { useState, useEffect } from "react";
import { apiGet, apiPost, apiRaw } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import {
  INITIAL_MACHINES, EMPTY_MACHINE,
  type Machine,
} from "@/components/smartmach/equipment.types";
import EquipmentTable from "@/components/smartmach/EquipmentTable";
import EquipmentViewDialog from "@/components/smartmach/EquipmentViewDialog";
import { EquipmentEditDialog, EquipmentDeleteDialog } from "@/components/smartmach/EquipmentEditDialog";

export default function ModuleEquipment() {
  const [machines, setMachines] = useState<Machine[]>(INITIAL_MACHINES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [viewMachine, setViewMachine] = useState<Machine | null>(null);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState<Omit<Machine, "id">>(EMPTY_MACHINE);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null);

  useEffect(() => {
    apiGet<Machine[]>("equipment")
      .then((data) => { setMachines(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = machines.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.name.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      m.manufacturer.toLowerCase().includes(q) ||
      m.inventoryNumber.toLowerCase().includes(q);
    const matchType = typeFilter === "Все" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const counts = {
    active:         machines.filter((m) => m.status === "active").length,
    maintenance:    machines.filter((m) => m.status === "maintenance").length,
    idle:           machines.filter((m) => m.status === "idle").length,
    decommissioned: machines.filter((m) => m.status === "decommissioned").length,
  };

  function openCreate() {
    setFormData(EMPTY_MACHINE);
    setIsNew(true);
    setEditMachine({ id: 0, ...EMPTY_MACHINE });
  }

  function openEdit(m: Machine) {
    setFormData({ ...m });
    setIsNew(false);
    setEditMachine(m);
    setViewMachine(null);
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.model.trim()) return;
    if (isNew) {
      const result = await apiPost<{ id: number }>("equipment", formData);
      const { id } = result;
      setMachines((prev) => [...prev, { id, ...formData }]);
    } else if (editMachine) {
      await apiRaw("equipment", `/${editMachine.id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setMachines((prev) => prev.map((m) => m.id === editMachine.id ? { ...m, ...formData } : m));
    }
    setEditMachine(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await apiRaw("equipment", `/${deleteTarget.id}`, { method: "DELETE" });
    setMachines((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
    setViewMachine(null);
  }

  function setField<K extends keyof Omit<Machine, "id">>(key: K, value: Omit<Machine, "id">[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Icon name="Loader2" size={22} className="animate-spin mr-2" />
      Загрузка оборудования...
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Справочник оборудования</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Станки и технологическое оборудование предприятия</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Icon name="Plus" size={15} className="mr-2" />
          Добавить станок
        </Button>
      </div>

      <EquipmentTable
        machines={machines}
        filtered={filtered}
        counts={counts}
        search={search}
        typeFilter={typeFilter}
        onSearch={setSearch}
        onTypeFilter={setTypeFilter}
        onView={setViewMachine}
      />

      <EquipmentViewDialog
        machine={viewMachine}
        open={!!viewMachine && !editMachine}
        onClose={() => setViewMachine(null)}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <EquipmentEditDialog
        open={!!editMachine}
        isNew={isNew}
        formData={formData}
        onClose={() => setEditMachine(null)}
        onSave={handleSave}
        setField={setField}
      />

      <EquipmentDeleteDialog
        machine={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
