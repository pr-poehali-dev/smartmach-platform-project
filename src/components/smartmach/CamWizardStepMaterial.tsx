import { WIZARD_MATERIALS } from "@/components/smartmach/cam.wizard.data";

interface Props {
  material: string;
  onSelect: (key: string) => void;
}

export default function CamWizardStepMaterial({ material, onSelect }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground mb-3">Выберите обрабатываемый материал:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(WIZARD_MATERIALS).map(([key, mat]) => (
          <button key={key} onClick={() => onSelect(key)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${material === key
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-secondary/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{mat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${mat.color}`}>
                {mat.group === "steel_soft" ? "Сталь" : mat.group === "steel_hard" ? "Сталь+" :
                  mat.group === "stainless" ? "Нерж." : mat.group === "aluminum" ? "Al" :
                  mat.group === "titanium" ? "Ti" : mat.group === "cast_iron" ? "Чугун" :
                  mat.group === "copper" ? "Cu" : "Пл."}
              </span>
            </div>
            <div className="flex gap-3 mt-1">
              <span className="text-[11px] text-muted-foreground">{mat.hardness}</span>
              <span className="text-[11px] text-muted-foreground">Vc≈{mat.vcBase}–{Math.round(mat.vcBase * mat.carbideK)} м/мин</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">СОЖ: {mat.coolant}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
