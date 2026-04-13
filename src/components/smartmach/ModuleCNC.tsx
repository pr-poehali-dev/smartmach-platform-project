import Icon from "@/components/ui/icon";

export default function ModuleCNC() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CNC — Мониторинг станков</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Состояние оборудования</p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold text-foreground">Оборудование</span>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          <Icon name="Radio" size={40} className="mx-auto mb-3 opacity-25" />
          <div className="text-sm font-medium mb-1">Модуль в разработке</div>
          <div className="text-xs">Здесь будет мониторинг станков, статусы и загрузка в реальном времени</div>
        </div>
      </div>
    </div>
  );
}
