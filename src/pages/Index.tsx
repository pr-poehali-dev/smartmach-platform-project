import { useState } from "react";
import Sidebar from "@/components/smartmach/Sidebar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import DashboardHome from "@/components/smartmach/DashboardHome";
import ModuleCAD from "@/components/smartmach/ModuleCAD";
import ModuleCAM from "@/components/smartmach/ModuleCAM";
import ModuleCAE from "@/components/smartmach/ModuleCAE";
import ModulePLM from "@/components/smartmach/ModulePLM";
import ModuleCNC from "@/components/smartmach/ModuleCNC";
import ModuleAnalytics from "@/components/smartmach/ModuleAnalytics";
import ModuleEquipment from "@/components/smartmach/ModuleEquipment";
import ModuleEconomics from "@/components/smartmach/ModuleEconomics";
import ModuleEmployees from "@/components/smartmach/ModuleEmployees";
import SeoHead from "@/components/ui/seo-head";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { MODULE_SEO, MODULE_BREADCRUMB } from "@/lib/seo.data";

export type ModuleId = "home" | "cad" | "cam" | "cae" | "plm" | "cnc" | "analytics" | "equipment" | "economics" | "employees";

export default function Index() {
  const [activeModule, setActiveModule] = useState<ModuleId>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderModule = () => {
    switch (activeModule) {
      case "home":      return <DashboardHome onNavigate={setActiveModule} />;
      case "cad":       return <ModuleCAD />;
      case "cam":       return <ModuleCAM />;
      case "cae":       return <ModuleCAE />;
      case "plm":       return <ModulePLM />;
      case "cnc":       return <ModuleCNC />;
      case "analytics": return <ModuleAnalytics />;
      case "equipment": return <ModuleEquipment />;
      case "economics": return <ModuleEconomics />;
      case "employees": return <ModuleEmployees />;
      default:          return <DashboardHome onNavigate={setActiveModule} />;
    }
  };

  const seo = MODULE_SEO[activeModule];
  const crumbLabels = MODULE_BREADCRUMB[activeModule];

  const breadcrumbs = [
    { label: "СмартМаш", onClick: () => setActiveModule("home") },
    ...(activeModule === "home"
      ? []
      : crumbLabels.map((label) => ({ label }))),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <SeoHead {...seo} />
      <Sidebar
        active={activeModule}
        collapsed={sidebarCollapsed}
        onNavigate={setActiveModule}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Хлебные крошки */}
        {!sidebarCollapsed && breadcrumbs.length > 1 && (
          <div className="px-6 pt-4 pb-0">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        <ErrorBoundary key={activeModule} name={activeModule}>
          {renderModule()}
        </ErrorBoundary>
      </main>
    </div>
  );
}
