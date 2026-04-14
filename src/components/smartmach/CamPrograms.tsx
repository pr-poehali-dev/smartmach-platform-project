import { useState } from "react";
import { type Program, type Part, type Machine, type User } from "@/lib/manufacture";
import { EMPTY_FORM } from "@/components/smartmach/cam.data";
import CamPipelineBar   from "@/components/smartmach/CamPipelineBar";
import CamProgramForm   from "@/components/smartmach/CamProgramForm";
import CamProgramList   from "@/components/smartmach/CamProgramList";
import CamProgramDetail from "@/components/smartmach/CamProgramDetail";

interface Props {
  programs: Program[];
  parts: Part[];
  machines: Machine[];
  users: User[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  saving: boolean;
  form: typeof EMPTY_FORM;
  onSetShowForm: (v: boolean) => void;
  onSetForm: (v: typeof EMPTY_FORM) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAdvance: (p: Program) => void;
  onRetry: () => void;
}

export default function CamPrograms({
  programs, parts, machines, users,
  loading, error, showForm, saving, form,
  onSetShowForm, onSetForm, onSubmit, onAdvance, onRetry,
}: Props) {
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [search, setSearch]                 = useState("");
  const [selected, setSelected]             = useState<Program | null>(null);

  const f = (k: keyof typeof EMPTY_FORM, v: string) => onSetForm({ ...form, [k]: v });

  const filtered = programs.filter((p) => {
    const matchStatus   = filterStatus === "all"   || p.status === filterStatus;
    const matchPriority = filterPriority === "all" || (p as Record<string, unknown>).priority === filterPriority;
    const q = search.toLowerCase();
    const matchSearch   = !q || p.name.toLowerCase().includes(q) || (p.part_name ?? "").toLowerCase().includes(q) || (p.machine_name ?? "").toLowerCase().includes(q);
    return matchStatus && matchPriority && matchSearch;
  });

  return (
    <>
      <CamPipelineBar
        programs={programs}
        filterStatus={filterStatus}
        filterPriority={filterPriority}
        search={search}
        onFilterStatus={setFilterStatus}
        onFilterPriority={setFilterPriority}
        onSearch={setSearch}
      />

      {showForm && (
        <CamProgramForm
          form={form}
          saving={saving}
          parts={parts}
          machines={machines}
          users={users}
          onField={f}
          onSubmit={onSubmit}
          onClose={() => onSetShowForm(false)}
        />
      )}

      <CamProgramList
        programs={programs}
        filtered={filtered}
        loading={loading}
        error={error}
        onSelect={setSelected}
        onAdvance={onAdvance}
        onRetry={onRetry}
      />

      {selected && (
        <CamProgramDetail
          program={selected}
          onClose={() => setSelected(null)}
          onAdvance={onAdvance}
        />
      )}
    </>
  );
}
