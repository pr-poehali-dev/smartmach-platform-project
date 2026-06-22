import { type CalcResult } from "@/components/smartmach/economics.types";
import EconomicsCostTable from "@/components/smartmach/EconomicsCostTable";
import EconomicsCostStructure from "@/components/smartmach/EconomicsCostStructure";
import EconomicsWorkshopTotals from "@/components/smartmach/EconomicsWorkshopTotals";

interface Props {
  calc: CalcResult;
}

export default function EconomicsTabCalc({ calc }: Props) {
  return (
    <div className="space-y-6">
      <EconomicsCostTable calc={calc} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <EconomicsCostStructure calc={calc} />
        <EconomicsWorkshopTotals calc={calc} />
      </div>
    </div>
  );
}
