import { useEffect, useState } from "react";
import { mGet, Stats } from "@/lib/manufacture";
import { apiGet } from "@/lib/api";
import { ModuleId } from "@/pages/Index";
import { type Machine as EquipmentItem } from "@/components/smartmach/equipment.types";
import DashboardKpiCards, { type KpiCard } from "@/components/smartmach/DashboardKpiCards";
import DashboardEquipment from "@/components/smartmach/DashboardEquipment";
import DashboardPlmProducts, { type PlmProduct } from "@/components/smartmach/DashboardPlmProducts";
import DashboardModules from "@/components/smartmach/DashboardModules";

interface Props {
  onNavigate: (id: ModuleId) => void;
}

interface PlmStats {
  by_stage: Record<string, number>;
  total: number;
  total_versions: number;
}

export default function DashboardHome({ onNavigate }: Props) {
  const [stats, setStats]             = useState<Stats | null>(null);
  const [equipment, setEquipment]     = useState<EquipmentItem[] | null>(null);
  const [plmStats, setPlmStats]       = useState<PlmStats | null>(null);
  const [plmProducts, setPlmProducts] = useState<PlmProduct[]>([]);
  const [employeesCount, setEmployeesCount] = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.allSettled([
      mGet<Stats>("stats"),
      apiGet<EquipmentItem[]>("equipment"),
      apiGet<PlmStats>("plm", "/", { resource: "stats" }),
      apiGet<PlmProduct[]>("plm", "/", { resource: "products" }),
      apiGet<{ id: number }[]>("economics", "", { resource: "employees" }),
    ]).then(([s, eq, ps, pp, emp]) => {
      if (s.status   === "fulfilled") setStats(s.value);
      if (eq.status  === "fulfilled") setEquipment(eq.value);
      if (ps.status  === "fulfilled") setPlmStats(ps.value);
      if (pp.status  === "fulfilled") setPlmProducts(
        (pp.value as PlmProduct[]).filter((p) => p.stage !== "archive").slice(0, 5)
      );
      if (emp.status === "fulfilled") setEmployeesCount(Array.isArray(emp.value) ? emp.value.length : 0);
    }).finally(() => setLoading(false));
  }, []);

  const KPI: KpiCard[] = [
    {
      label: "Деталей в библиотеке",
      value: stats?.parts_total ?? "—",
      icon: "Box",
      color: "text-blue-600",
      bg: "bg-blue-50",
      onClick: () => onNavigate("cad"),
    },
    {
      label: "Изделий (PLM)",
      value: plmStats?.total ?? "—",
      icon: "GitBranch",
      color: "text-red-600",
      bg: "bg-red-50",
      onClick: () => onNavigate("plm"),
    },
    {
      label: "Активных заданий",
      value: stats?.jobs_active ?? "—",
      icon: "ClipboardList",
      color: "text-orange-600",
      bg: "bg-orange-50",
      onClick: () => onNavigate("analytics"),
    },
    {
      label: "Сотрудников",
      value: employeesCount ?? "—",
      icon: "Users",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      onClick: () => onNavigate("employees"),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Заголовок */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">СмартМаш</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Единая система управления производственным циклом</p>
      </div>

      {/* KPI карточки */}
      <DashboardKpiCards kpi={KPI} loading={loading} />

      {/* Состояние оборудования */}
      {equipment !== null && (
        <DashboardEquipment equipment={equipment} onNavigate={() => onNavigate("equipment")} />
      )}

      {/* Изделия PLM */}
      {plmProducts.length > 0 && (
        <DashboardPlmProducts products={plmProducts} onNavigate={() => onNavigate("plm")} />
      )}

      {/* Быстрый переход по модулям */}
      <DashboardModules onNavigate={onNavigate} />
    </div>
  );
}
