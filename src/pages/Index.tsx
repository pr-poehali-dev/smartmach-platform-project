import { useState } from "react";
import Sidebar from "@/components/smartmach/Sidebar";
import DashboardHome from "@/components/smartmach/DashboardHome";
import ModuleCAD from "@/components/smartmach/ModuleCAD";
import ModuleCAM from "@/components/smartmach/ModuleCAM";
import ModuleCAE from "@/components/smartmach/ModuleCAE";
import ModulePLM from "@/components/smartmach/ModulePLM";
import ModuleCNC from "@/components/smartmach/ModuleCNC";
import ModuleAnalytics from "@/components/smartmach/ModuleAnalytics";

export type ModuleId = "home" | "cad" | "cam" | "cae" | "plm" | "cnc" | "analytics";

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
        {renderModule()}
      </main>
    </div>
  );
}
