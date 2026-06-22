/**
 * DashboardEquipment — блок «Состояние оборудования» на главной панели.
 * Извлечено 1:1 из DashboardHome без изменения логики.
 */
import Icon from "@/components/ui/icon";
import { type Machine as EquipmentItem } from "@/components/smartmach/equipment.types";

const EQ_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  active:         { label: "Активен",        color: "text-green-700",  dot: "bg-green-500" },
  idle:           { label: "Простой",         color: "text-amber-700",  dot: "bg-amber-400" },
  maintenance:    { label: "Обслуживание",   color: "text-red-700",    dot: "bg-red-500" },
  decommissioned: { label: "Списан",         color: "text-gray-400",   dot: "bg-gray-300" },
};

function daysUntil(dateStr: string): number | null {
  if (!dateStr || dateStr === "—") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

interface Props {
  equipment: EquipmentItem[];
  onNavigate: () => void;
}

export default function DashboardEquipment({ equipment, onNavigate }: Props) {
  const activeEquipment = equipment.filter((e) => e.status !== "decommissioned");
  const maintenanceCount = equipment.filter((e) => e.status === "maintenance").length;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Состояние оборудования</h2>
          {maintenanceCount > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {maintenanceCount} на обслуживании
            </span>
          )}
        </div>
        <button
          onClick={onNavigate}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Все станки <Icon name="ChevronRight" size={12} />
        </button>
      </div>
      <div className="divide-y divide-border">
        {activeEquipment.length === 0 ? (
          <p className="text-sm text-muted-foreground p-5">Оборудование не найдено</p>
        ) : (
          activeEquipment.map((eq) => {
            const st = EQ_STATUS[eq.status] ?? EQ_STATUS.idle;
            const days = daysUntil(eq.nextMaintenance);
            const isOverdue = days !== null && days < 0;
            const isSoon = days !== null && days >= 0 && days <= 14;
            return (
              <div key={eq.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface/50 transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{eq.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{eq.type} · {eq.location}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-medium ${st.color}`}>{st.label}</p>
                  {eq.nextMaintenance && eq.nextMaintenance !== "—" && (
                    <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-500 font-semibold" : isSoon ? "text-amber-600" : "text-muted-foreground"}`}>
                      {isOverdue
                        ? `ТО просрочено ${Math.abs(days!)} дн.`
                        : isSoon
                          ? `ТО через ${days} дн.`
                          : `ТО ${eq.nextMaintenance}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
