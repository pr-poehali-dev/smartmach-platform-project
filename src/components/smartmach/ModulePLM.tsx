import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import AiAssistant from "@/components/smartmach/AiAssistant";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { stageLabel, AI_SYSTEM, AI_SUGGESTIONS, type Product, type User } from "@/components/smartmach/plm.types";
import PlmProductForm   from "@/components/smartmach/PlmProductForm";
import PlmProductList   from "@/components/smartmach/PlmProductList";
import PlmProductDetail from "@/components/smartmach/PlmProductDetail";

const EMPTY_FORM = { code: "", name: "", description: "", stage: "draft", owner_id: "" };

export default function ModulePLM() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [pData, uData] = await Promise.all([
        apiGet<Product[]>("plm", "", { resource: "products" }),
        apiGet<User[]>("plm", "", { resource: "users" }),
      ]);
      setProducts(pData); setUsers(uData);
    } catch {
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await apiPost("plm", {
        code: form.code, name: form.name,
        description: form.description || null,
        stage: form.stage,
        owner_id: form.owner_id ? Number(form.owner_id) : null,
      }, { resource: "products" });
      setForm(EMPTY_FORM); setShowForm(false); await load();
    } catch {
      alert("Ошибка при создании изделия");
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(productId: number, newStage: string) {
    try {
      await apiPut("plm", { stage: newStage }, { resource: "products", id: productId });
      await load();
      setSelected((prev) => prev ? { ...prev, stage: newStage, stage_label: stageLabel(newStage) } : null);
    } catch {
      alert("Ошибка при смене стадии");
    }
  }

  function handleSelect(p: Product) {
    setSelected((prev) => prev?.id === p.id ? null : p);
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Жизненный цикл</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Управление версиями, согласование, архив</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Icon name="Plus" size={16} /><span className="hidden sm:inline">Новое изделие</span><span className="sm:hidden">Изделие</span>
        </button>
      </div>

      {showForm && (
        <PlmProductForm
          form={form}
          saving={saving}
          users={users}
          onChange={setForm}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PlmProductList
          products={products}
          loading={loading}
          error={error}
          selected={selected}
          onSelect={handleSelect}
          onRetry={load}
        />
        <PlmProductDetail
          selected={selected}
          onStageChange={handleStageChange}
        />
      </div>

      <AiAssistant
        title="Помощник по документации"
        systemPrompt={AI_SYSTEM}
        suggestions={AI_SUGGESTIONS}
      />
    </div>
  );
}