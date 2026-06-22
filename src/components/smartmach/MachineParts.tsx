import Icon from "@/components/ui/icon";
import {
  MACHINE_PART_GROUPS,
  MACHINE_MATERIALS,
  MACHINE_PART_USECASES,
} from "@/components/smartmach/machineParts.data";

const LEVEL = {
  ok:   { label: "Уверенно",     dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50" },
  care: { label: "С осторожн.",  dot: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50" },
  no:   { label: "Не подходит",  dot: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50" },
} as const;

export default function MachineParts() {
  return (
    <div className="space-y-6">

      {/* Пояснение */}
      <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
          <Icon name="PackageSearch" size={20} className="text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-base mb-1">Что можно изготавливать на МАТ-1</div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Номенклатура определяется рабочей зоной (точение Ø≤200, длина ≤600 мм; фрезерование
            500×300×250 мм), мощностью 3,5 кВт и точностью ±0,02 мм. Уровень — общее машиностроение,
            прототипирование и ремонт. Главный плюс — обработка детали за один установ.
          </p>
        </div>
      </div>

      {/* Группы деталей по режимам */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {MACHINE_PART_GROUPS.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border border-border overflow-hidden">
            <div className={`px-5 py-3.5 border-b ${g.color} flex items-center justify-between gap-2`}>
              <div className="flex items-center gap-2">
                <Icon name={g.icon as Parameters<typeof Icon>[0]["name"]} size={16} />
                <span className="text-sm font-bold">{g.mode}</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/60">{g.badge}</span>
            </div>
            <div className="px-5 pt-2.5 pb-1">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon name="Ruler" size={12} />
                <span>{g.limit}</span>
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {g.parts.map((p) => (
                <div key={p.name} className="flex items-start gap-3 px-5 py-2.5">
                  <Icon name="Check" size={14} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Материалы */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="Atom" size={15} className="text-primary" />
          <span className="text-sm font-semibold">Обрабатываемые материалы</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20 text-left">
                <th className="px-5 py-2.5 font-semibold text-muted-foreground">Группа</th>
                <th className="px-5 py-2.5 font-semibold text-muted-foreground">Материалы</th>
                <th className="px-5 py-2.5 font-semibold text-muted-foreground">Пригодность</th>
                <th className="px-5 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Примечание</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {MACHINE_MATERIALS.map((m) => {
                const lv = LEVEL[m.level];
                return (
                  <tr key={m.group} className="hover:bg-secondary/10">
                    <td className="px-5 py-2.5 font-medium text-foreground whitespace-nowrap">{m.group}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{m.items}</td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${lv.bg} ${lv.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${lv.dot}`} />
                        {lv.label}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{m.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Кому подходит */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Icon name="Target" size={15} className="text-primary" />
          <span className="text-sm font-semibold">Типовые задачи и заказчики</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-border/60">
          {MACHINE_PART_USECASES.map((u) => (
            <div key={u.label} className="flex items-start gap-3 px-5 py-4">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Icon name={u.icon as Parameters<typeof Icon>[0]["name"]} size={15} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{u.label}</div>
                <div className="text-xs text-muted-foreground">{u.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
