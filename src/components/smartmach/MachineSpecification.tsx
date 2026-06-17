import Icon from "@/components/ui/icon";
import { MACHINE_SPEC } from "@/components/smartmach/machineSpec.data";

export default function MachineSpecification() {
  const totalPos = MACHINE_SPEC.reduce(
    (acc, s) => acc + s.items.filter((i) => i.pos != null).length, 0
  );
  const totalItems = MACHINE_SPEC.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="space-y-4">
      {/* Шапка документа */}
      <div className="bg-white rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0">
            <Icon name="FileSpreadsheet" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Спецификация</h2>
            <p className="text-sm text-muted-foreground">
              МАТ-1.000.000 · по ГОСТ 2.106-2019
            </p>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalPos}</div>
            <div className="text-[11px] text-muted-foreground">позиций</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalItems}</div>
            <div className="text-[11px] text-muted-foreground">строк всего</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{MACHINE_SPEC.length}</div>
            <div className="text-[11px] text-muted-foreground">разделов</div>
          </div>
        </div>
      </div>

      {/* Таблица спецификации в стиле ГОСТ */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-secondary/50 text-foreground border-b-2 border-border">
                <th className="w-12 px-2 py-2.5 text-center font-semibold border-r border-border">Зона</th>
                <th className="w-14 px-2 py-2.5 text-center font-semibold border-r border-border">Поз.</th>
                <th className="w-44 px-3 py-2.5 text-left font-semibold border-r border-border">Обозначение</th>
                <th className="px-3 py-2.5 text-left font-semibold border-r border-border">Наименование</th>
                <th className="w-16 px-2 py-2.5 text-center font-semibold border-r border-border">Кол.</th>
                <th className="w-32 px-3 py-2.5 text-left font-semibold">Примечание</th>
              </tr>
            </thead>
            <tbody>
              {MACHINE_SPEC.map((section) => (
                <>
                  {/* Заголовок раздела — по центру, подчёркнут */}
                  <tr key={section.title} className="bg-slate-50">
                    <td colSpan={6} className="px-3 py-2 text-center font-bold text-foreground border-y border-border">
                      <span className="underline underline-offset-4">{section.title}</span>
                    </td>
                  </tr>
                  {section.items.map((item, idx) => (
                    <tr
                      key={`${section.title}-${idx}`}
                      className="border-b border-border/60 hover:bg-primary/3 transition-colors"
                    >
                      <td className="px-2 py-2 text-center text-muted-foreground border-r border-border/40">
                        {item.zone ?? ""}
                      </td>
                      <td className="px-2 py-2 text-center font-medium border-r border-border/40">
                        {item.pos ?? ""}
                      </td>
                      <td className="px-3 py-2 font-mono text-[13px] border-r border-border/40">
                        {item.designation === "—" ? <span className="text-muted-foreground">—</span> : item.designation}
                      </td>
                      <td className="px-3 py-2 border-r border-border/40">{item.name}</td>
                      <td className="px-2 py-2 text-center font-medium border-r border-border/40">{item.qty}</td>
                      <td className="px-3 py-2 text-muted-foreground text-[13px]">{item.note ?? ""}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Примечание */}
      <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-4 py-3">
        <Icon name="Info" size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <p>
          Спецификация оформлена по ГОСТ 2.106-2019. Разделы расположены в стандартном
          порядке: документация, сборочные единицы, детали, стандартные изделия, материалы.
          Обозначения деталей соответствуют чертежам из раздела «Чертежи».
        </p>
      </div>
    </div>
  );
}
