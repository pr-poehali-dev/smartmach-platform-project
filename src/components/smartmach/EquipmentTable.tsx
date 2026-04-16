import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Icon from "@/components/ui/icon";
import { STATUS_CONFIG, FILTER_TYPES, type Machine } from "@/components/smartmach/equipment.types";

interface Props {
  machines: Machine[];
  filtered: Machine[];
  counts: Record<"active" | "maintenance" | "idle" | "decommissioned", number>;
  search: string;
  typeFilter: string;
  onSearch: (v: string) => void;
  onTypeFilter: (v: string) => void;
  onView: (m: Machine) => void;
}

export default function EquipmentTable({
  filtered, counts, search, typeFilter,
  onSearch, onTypeFilter, onView,
}: Props) {
  return (
    <>
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {(["active", "maintenance", "idle", "decommissioned"] as const).map((s) => (
          <Card key={s} className="border shadow-none">
            <CardContent className="p-3 md:p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                s === "active" ? "bg-green-500" :
                s === "maintenance" ? "bg-yellow-500" :
                s === "idle" ? "bg-blue-400" : "bg-gray-400"
              }`} />
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold text-foreground">{counts[s]}</p>
                <p className="text-xs text-muted-foreground truncate">{STATUS_CONFIG[s].label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                typeFilter === t
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Таблица — только на sm+ */}
      <Card className="hidden sm:block border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="pl-4">Наименование</TableHead>
                <TableHead>Модель</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="hidden lg:table-cell">Производитель</TableHead>
                <TableHead className="text-center hidden md:table-cell">Оси</TableHead>
                <TableHead className="hidden lg:table-cell">СУ</TableHead>
                <TableHead className="hidden lg:table-cell">Инв. №</TableHead>
                <TableHead className="hidden xl:table-cell">Местонахождение</TableHead>
                <TableHead className="text-center">Статус</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => onView(m)}>
                  <TableCell className="pl-4 font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.model}</TableCell>
                  <TableCell className="text-sm">{m.type}</TableCell>
                  <TableCell className="text-sm hidden lg:table-cell">{m.manufacturer}</TableCell>
                  <TableCell className="text-center text-sm hidden md:table-cell">{m.axes}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{m.controlSystem}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground hidden lg:table-cell">{m.inventoryNumber}</TableCell>
                  <TableCell className="text-sm hidden xl:table-cell">{m.location}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[m.status].color}`}>
                      {STATUS_CONFIG[m.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    Станки не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Мобильные карточки — только на xs */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm bg-white rounded-xl border border-border">
            <Icon name="Search" size={32} className="mx-auto mb-2 opacity-20" />
            Станки не найдены
          </div>
        ) : filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => onView(m)}
            className="w-full bg-white rounded-xl border border-border p-4 text-left hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{m.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[m.model, m.type, m.manufacturer].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[m.status].color}`}>
                {STATUS_CONFIG[m.status].label}
              </span>
            </div>
            {(m.location || m.inventoryNumber || m.axes) && (
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                {m.location       && <span className="flex items-center gap-1"><Icon name="MapPin" size={10} />{m.location}</span>}
                {m.inventoryNumber && <span className="flex items-center gap-1"><Icon name="Hash"   size={10} />{m.inventoryNumber}</span>}
                {m.axes           && <span className="flex items-center gap-1"><Icon name="Move3D" size={10} />{m.axes} осей</span>}
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
