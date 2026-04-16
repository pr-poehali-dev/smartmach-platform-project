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
import NotificationBell from "@/components/smartmach/NotificationBell";

export type ModuleId = "home" | "cad" | "cam" | "cae" | "plm" | "cnc" | "analytics" | "equipment" | "economics" | "employees";

export default function Index() {
  const [activeModule,     setActiveModule]     = useState<ModuleId>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /** partId предвыбран при переходе CAD → CAM */
  const [camPartId,     setCamPartId]     = useState<number | undefined>();
  /** partId / programId предвыбраны при переходе CAM → Analytics */
  const [jobPartId,     setJobPartId]     = useState<number | undefined>();
  const [jobProgramId,  setJobProgramId]  = useState<number | undefined>();

  function navigate(module: ModuleId) {
    if (module !== "cam")       setCamPartId(undefined);
    if (module !== "analytics") { setJobPartId(undefined); setJobProgramId(undefined); }
    setActiveModule(module);
  }

  function goToCam(partId: number) {
    setCamPartId(partId);
    setActiveModule("cam");
  }

  function goToJob(opts: { partId?: number; programId?: number }) {
    setJobPartId(opts.partId);
    setJobProgramId(opts.programId);
    setActiveModule("analytics");
  }

  function goToCad() {
    setActiveModule("cad");
  }

  function goToCamByProgram(programId: number) {
    setCamPartId(undefined);
    setJobProgramId(programId);
    setActiveModule("cam");
  }

  const renderModule = () => {
    switch (activeModule) {
      case "home":      return <DashboardHome onNavigate={navigate} />;
      case "cad":       return <ModuleCAD onNavigateToCam={goToCam} />;
      case "cam":       return (
        <ModuleCAM
          preselectPartId={camPartId}
          onNavigateToJob={goToJob}
          onNavigateToPart={goToCad}
        />
      );
      case "cae":       return <ModuleCAE />;
      case "plm":       return <ModulePLM />;
      case "cnc":       return <ModuleCNC />;
      case "analytics": return (
        <ModuleAnalytics
          preselectPartId={jobPartId}
          preselectProgramId={jobProgramId}
          onNavigateToPart={goToCad}
          onNavigateToProgram={goToCamByProgram}
        />
      );
      case "equipment": return <ModuleEquipment />;
      case "economics": return <ModuleEconomics />;
      case "employees": return <ModuleEmployees />;
      default:          return <DashboardHome onNavigate={navigate} />;
    }
  };

  const seo = MODULE_SEO[activeModule];
  const crumbLabels = MODULE_BREADCRUMB[activeModule];

  const breadcrumbs = [
    { label: "СмартМаш", onClick: () => navigate("home") },
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
        onNavigate={navigate}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 pt-4 pb-0 shrink-0">
          <div className="flex-1">
            {!sidebarCollapsed && breadcrumbs.length > 1 && (
              <Breadcrumbs items={breadcrumbs} />
            )}
          </div>
          <NotificationBell onNavigate={navigate} />
        </div>
        <div className="flex-1">
          <ErrorBoundary key={activeModule} name={activeModule}>
            {renderModule()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
