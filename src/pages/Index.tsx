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

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar
        active={activeModule}
        collapsed={sidebarCollapsed}
        onNavigate={setActiveModule}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary key={activeModule} name={activeModule}>
          {renderModule()}
        </ErrorBoundary>
      </main>
    </div>
  );
}