import Icon from "@/components/ui/icon";
import { fmt, Section, Th, SUPPLIERS, type CalcResult } from "@/components/smartmach/economics.types";

interface Props {
  supplierSearch: string;
  setSupplierSearch: React.Dispatch<React.SetStateAction<string>>;
  calc: CalcResult;
}

export default function EconomicsTabSuppliers({ supplierSearch, setSupplierSearch, calc }: Props) {
  const filteredSuppliers = SUPPLIERS.filter((s) => {
    const q = supplierSearch.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) ||
      s.services.some((sv) => sv.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-5">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)}
            placeholder="Поиск по названию, городу, услуге..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <span className="text-xs text-muted-foreground">{filteredSuppliers.length} компаний</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSuppliers.map((s) => (
          <div key={s.name} className="bg-white border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Icon name="MapPin" size={11} />{s.city}
                </p>
              </div>
              {s.cert !== "—" && (
                <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                  {s.cert}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {s.services.map((sv) => (
                <span key={sv} className="text-[11px] bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full">{sv}</span>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm pt-1 border-t border-border/60">
              <div>
                <p className="font-semibold text-foreground">от {fmt(s.priceFrom)} {s.unit}</p>
                <p className="text-xs text-muted-foreground">Срок: {s.lead}</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5">
                <Icon name="Phone" size={12} />Запрос
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Сравнение с собственным производством */}
      <Section title="Сравнение: своё производство vs аутсорсинг" icon="GitCompareArrows">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <Th>Изделие</Th>
              <Th align="right">Своя себест./шт</Th>
              <Th align="right">Мин. аутсорсинг</Th>
              <Th align="right">Разница</Th>
              <Th align="right">Вывод</Th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {calc.productCalcs.map((p) => {
                const minExternal = Math.min(...SUPPLIERS.map((s) => s.priceFrom)) * p.laborHours;
                const diff = p.costPerUnit - minExternal;
                return (
                  <tr key={p.id} className="hover:bg-secondary/10">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.costPerUnit)} ₽</td>
                    <td className="px-3 py-2 text-right">{fmt(minExternal)} ₽</td>
                    <td className={`px-3 py-2 text-right font-medium ${diff <= 0 ? "text-green-600" : "text-red-500"}`}>
                      {diff <= 0 ? "−" : "+"}{fmt(Math.abs(diff))} ₽
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diff <= 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        {diff <= 0 ? "Выгоднее своё" : "Рассмотреть аутсорсинг"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
