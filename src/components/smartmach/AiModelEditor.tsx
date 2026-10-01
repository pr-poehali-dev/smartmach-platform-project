/** Правка параметрической модели детали: чертёж перестраивается мгновенно. */
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { type PartModel, type ShaftSection, num, fmt } from "@/lib/aipart/model";
import { gearGeometry, nearestModule } from "@/lib/aipart/gear";

interface Props { model: PartModel; onChange: (m: PartModel) => void }

/** Поле с собственным текстом: можно стереть и набрать заново, в модель уходит только корректное значение */
function Cell({ value, onChange, w = "w-16", testId }: { value: string | number | null; onChange: (v: string) => void; w?: string; testId?: string }) {
  const ext = value == null ? "" : String(value);
  const [text, setText] = useState(ext);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(ext); }, [ext, focused]);
  return (
    <Input className={`h-7 px-1.5 text-xs ${w}`} value={text} data-testid={testId}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setText(ext); }}
      onChange={(e) => { setText(e.target.value); if (e.target.value.trim() !== "" || typeof value !== "number") onChange(e.target.value); }} />
  );
}

export default function AiModelEditor({ model, onChange }: Props) {
  const set = <K extends keyof PartModel>(k: K, v: PartModel[K]) => onChange({ ...model, [k]: v });
  const numOrKeep = (v: string, prev: number) => (v.trim() === "" ? prev : num(v, prev));

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="space-y-0.5"><span className="text-xs text-muted-foreground">Наименование</span>
          <Input className="h-8" value={model.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="space-y-0.5"><span className="text-xs text-muted-foreground">Обозначение</span>
          <Input className="h-8" value={model.designation} onChange={(e) => set("designation", e.target.value)} /></label>
        <label className="space-y-0.5"><span className="text-xs text-muted-foreground">Материал</span>
          <Input className="h-8" value={model.material} onChange={(e) => set("material", e.target.value)} /></label>
      </div>

      {model.shaft && (() => {
        const sh = model.shaft;
        const setSec = (i: number, patch: Partial<ShaftSection>) =>
          set("shaft", { ...sh, sections: sh.sections.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
        return (
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead className="text-muted-foreground"><tr className="text-left">
                <th className="pr-2 py-1">Ступень</th><th className="pr-2">∅, мм</th><th className="pr-2">Длина</th>
                <th className="pr-2">Допуск</th><th className="pr-2">Ra</th><th />
              </tr></thead>
              <tbody>
                {sh.sections.map((x, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-0.5 text-muted-foreground">{i + 1}</td>
                    <td className="pr-2"><Cell value={x.d} onChange={(v) => setSec(i, { d: numOrKeep(v, x.d) })} testId={`sec-d-${i}`} /></td>
                    <td className="pr-2"><Cell value={x.l} onChange={(v) => setSec(i, { l: numOrKeep(v, x.l) })} testId={`sec-l-${i}`} /></td>
                    <td className="pr-2"><Cell value={x.tol} onChange={(v) => setSec(i, { tol: v.trim() || null })} w="w-14" /></td>
                    <td className="pr-2"><Cell value={x.ra} onChange={(v) => setSec(i, { ra: v.trim() ? num(v, 6.3) : null })} w="w-14" /></td>
                    <td>
                      <button className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30" title="Удалить ступень"
                        disabled={sh.sections.length < 2}
                        onClick={() => set("shaft", {
                          ...sh, sections: sh.sections.filter((_, j) => j !== i),
                          keyways: sh.keyways.filter((k) => k.section !== i).map((k) => ({ ...k, section: k.section > i ? k.section - 1 : k.section })),
                        })}><Icon name="X" size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button variant="ghost" size="sm" className="h-7 mt-1 text-xs"
              onClick={() => set("shaft", { ...sh, sections: [...sh.sections, { d: sh.sections[sh.sections.length - 1].d, l: 30, tol: null, ra: null, thread: null }] })}>
              <Icon name="Plus" size={12} className="mr-1" />Ступень
            </Button>
          </div>
        );
      })()}

      {model.disc && (() => {
        const d = model.disc;
        const f = (label: string, value: number, apply: (v: number) => void) => (
          <label className="space-y-0.5"><span className="text-xs text-muted-foreground">{label}</span>
            <Cell value={value} onChange={(v) => apply(numOrKeep(v, value))} w="w-20" /></label>
        );
        return (
          <div className="flex flex-wrap gap-3">
            {f("Наружный ∅", d.D, (v) => set("disc", { ...d, D: v }))}
            {f("Толщина", d.H, (v) => set("disc", { ...d, H: v }))}
            {f("Отверстие ∅", d.bore.d, (v) => set("disc", { ...d, bore: { ...d.bore, d: v } }))}
            {d.holes && f("Отверстий, шт", d.holes.n, (v) => set("disc", { ...d, holes: { ...d.holes!, n: Math.max(1, Math.round(v)) } }))}
            {d.holes && f("∅ отверстий", d.holes.d, (v) => set("disc", { ...d, holes: { ...d.holes!, d: v } }))}
            {d.holes && f("∅ расположения", d.holes.pcd, (v) => set("disc", { ...d, holes: { ...d.holes!, pcd: v } }))}
          </div>
        );
      })()}

      {model.gear && (() => {
        const g = model.gear;
        const f = (label: string, value: number, apply: (v: number) => void, testId?: string) => (
          <label className="space-y-0.5"><span className="text-xs text-muted-foreground">{label}</span>
            <Cell value={value} onChange={(v) => apply(numOrKeep(v, value))} w="w-20" testId={testId} /></label>
        );
        const geo = gearGeometry(g);
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              {f("Модуль m", g.m, (v) => set("gear", { ...g, m: nearestModule(v) }), "gear-m")}
              {f("Зубьев z", g.z, (v) => set("gear", { ...g, z: Math.max(8, Math.round(v)) }), "gear-z")}
              {f("Угол β, °", g.beta, (v) => set("gear", { ...g, beta: Math.min(45, Math.max(0, v)), hand: v > 0 ? g.hand ?? "right" : null }))}
              {f("Ширина b", g.b, (v) => set("gear", { ...g, b: v }))}
              {f("Отверстие ∅", g.bore.d, (v) => set("gear", { ...g, bore: { ...g.bore, d: v } }))}
              <label className="space-y-0.5"><span className="text-xs text-muted-foreground">Точность</span>
                <Cell value={g.accuracy} onChange={(v) => set("gear", { ...g, accuracy: v.trim() || "8-B" })} w="w-20" /></label>
            </div>
            <p className="text-xs text-muted-foreground">
              da = {fmt(geo.da)} · d = {fmt(geo.d)} · df = {fmt(geo.df)} · W = {fmt(geo.W)} (zw = {geo.zw})
            </p>
          </div>
        );
      })()}

      {model.plate && (() => {
        const p = model.plate;
        const f = (label: string, value: number, apply: (v: number) => void) => (
          <label className="space-y-0.5"><span className="text-xs text-muted-foreground">{label}</span>
            <Cell value={value} onChange={(v) => apply(numOrKeep(v, value))} w="w-20" /></label>
        );
        return (
          <div className="flex flex-wrap gap-3">
            {f("Длина", p.L, (v) => set("plate", { ...p, L: v }))}
            {f("Ширина", p.W, (v) => set("plate", { ...p, W: v }))}
            {f("Толщина", p.H, (v) => set("plate", { ...p, H: v }))}
          </div>
        );
      })()}

      <label className="block space-y-0.5">
        <span className="text-xs text-muted-foreground">Технические требования (по строке на пункт)</span>
        <textarea className="w-full min-h-[84px] rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          value={model.requirements.join("\n")}
          onChange={(e) => set("requirements", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
      </label>
    </div>
  );
}
