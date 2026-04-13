import Icon from "@/components/ui/icon";

export default function ModuleCAE() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CAE — Инженерный анализ</h1>
        <p className="text-muted-foreground text-sm mt-0.5">МКЭ, тепловые и динамические симуляции</p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <span className="text-sm font-semibold text-foreground">Симуляции</span>
        </div>
        <div className="p-12 text-center text-muted-foreground">
          <Icon name="FlaskConical" size={40} className="mx-auto mb-3 opacity-25" />
          <div className="text-sm font-medium mb-1">Модуль в разработке</div>
          <div className="text-xs">Здесь будут МКЭ-расчёты, тепловой и динамический анализ</div>
        </div>
      </div>
    </div>
  );
}
