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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["active", "maintenance", "idle", "decommissioned"] as const).map((s) => (
          <Card key={s} className="border shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                s === "active" ? "bg-green-500" :
                s === "maintenance" ? "bg-yellow-500" :
                s === "idle" ? "bg-blue-400" : "bg-gray-400"
              }`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
                <p className="text-xs text-muted-foreground">{STATUS_CONFIG[s].label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, модели, инв. номеру..."
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

      {/* Table */}
      <Card className="border shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="pl-4">Наименование</TableHead>
                <TableHead>Модель</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Производитель</TableHead>
                <TableHead className="text-center">Оси</TableHead>
                <TableHead>СУ</TableHead>
                <TableHead>Инв. №</TableHead>
                <TableHead>Местонахождение</TableHead>
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
                  <TableCell className="text-sm">{m.manufacturer}</TableCell>
                  <TableCell className="text-center text-sm">{m.axes}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.controlSystem}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{m.inventoryNumber}</TableCell>
                  <TableCell className="text-sm">{m.location}</TableCell>
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
    </>
  );
}
