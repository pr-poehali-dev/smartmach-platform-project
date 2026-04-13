import Icon from "@/components/ui/icon";

export default function ModuleAnalytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Аналитика</h1>
        <p className="text-muted-foreground text-sm mt-0.5">KPI и предиктивная диагностика производства</p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold text-foreground">Показатели</span>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          <Icon name="BarChart2" size={40} className="mx-auto mb-3 opacity-25" />
          <div className="text-sm font-medium mb-1">Модуль в разработке</div>
          <div className="text-xs">Здесь будут OEE, выпуск, брак и предиктивная диагностика</div>
        </div>
      </div>
    </div>
  );
}
