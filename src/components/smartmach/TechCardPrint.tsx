/**
 * Маршрутная карта по ГОСТ 3.1118-82 (форма 1 / 1б), альбомная A4.
 * Служебные символы строк: А — цех, участок, операция; Б — оборудование и нормы;
 * О — содержание перехода; Т — технологическая оснастка; М — материал (на первом листе).
 */
import { useMemo } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { type TechProcess, fmtNum } from "@/lib/techcard";

type Row = { sym: string; cells: string[]; kind: "A" | "B" | "O" | "T" | "M" | "blank" };

const FIRST_ROWS = 15;
const NEXT_ROWS = 22;

export function buildRows(tp: TechProcess): Row[] {
  const rows: Row[] = [];
  rows.push({
    sym: "М01", kind: "M",
    cells: [tp.material ?? "", "", tp.part_mass != null ? fmtNum(tp.part_mass, 3) : "", tp.blank_type ?? "",
      tp.blank_size ?? "", "1", tp.blank_mass != null ? fmtNum(tp.blank_mass, 3) : "",
      tp.blank_mass && tp.part_mass ? fmtNum(Number(tp.part_mass) / Number(tp.blank_mass), 2) : ""],
  });
  for (const op of tp.operations) {
    rows.push({
      sym: "А", kind: "A",
      cells: [op.workshop ?? "", op.area ?? "", "", op.op_no, op.name, ""],
    });
    rows.push({
      sym: "Б", kind: "B",
      cells: [
        op.eq_model ? `${op.eq_model} ${op.eq_name ?? ""}`.trim() : op.equipment_name ?? "",
        op.profession ?? "", op.worker_rank ? String(op.worker_rank) : "", "",
        String(op.workers ?? 1), "", "", String(tp.batch_size ?? 1), "1",
        fmtNum(op.t_pz, 2), fmtNum(op.t_sht, 3),
      ],
    });
    if (op.cam_code) rows.push({ sym: "О", kind: "O", cells: [`Обработка по УП ${op.cam_code}${op.cam_name ? ` «${op.cam_name}»` : ""}`] });
    for (const st of op.steps) {
      const mode = [
        st.depth != null && `t=${fmtNum(st.depth)}`, st.feed != null && `S=${fmtNum(st.feed, 3)}`,
        st.spindle != null && `n=${fmtNum(st.spindle, 0)}`, st.speed != null && `V=${fmtNum(st.speed, 0)}`,
      ].filter(Boolean).join("; ");
      rows.push({ sym: "О", kind: "O", cells: [`${st.step_no}. ${st.description}${mode ? `  (${mode})` : ""}`] });
      const tools = [st.tool, st.measuring_tool].filter(Boolean).join("; ");
      if (tools) rows.push({ sym: "Т", kind: "T", cells: [tools] });
    }
    if (op.fixture) rows.push({ sym: "Т", kind: "T", cells: [op.fixture] });
  }
  return rows;
}

export function paginate(rows: Row[]): Row[][] {
  const pages: Row[][] = [];
  let i = 0;
  let cap = FIRST_ROWS;
  while (i < rows.length || pages.length === 0) {
    const page = rows.slice(i, i + cap);
    i += cap;
    while (page.length < cap) page.push({ sym: "", kind: "blank", cells: [] });
    pages.push(page);
    cap = NEXT_ROWS;
  }
  return pages;
}

const B = "border border-black";

function Stamp({ tp, sheet, sheets, first }: { tp: TechProcess; sheet: number; sheets: number; first: boolean }) {
  return (
    <table className="w-full border-collapse text-[9px] leading-tight mb-1">
      <tbody>
        <tr>
          <td className={`${B} px-1 w-[22%]`} rowSpan={first ? 4 : 2}>
            <div className="font-semibold">ГОСТ 3.1118-82</div>
            <div>Форма {first ? "1" : "1б"}</div>
          </td>
          <td className={`${B} px-1 text-center font-bold text-[11px]`} colSpan={4}>МАРШРУТНАЯ КАРТА</td>
          <td className={`${B} px-1 w-[14%]`}>Лист {sheet}</td>
          <td className={`${B} px-1 w-[14%]`}>Листов {sheets}</td>
        </tr>
        <tr>
          <td className={`${B} px-1`} colSpan={3}><span className="text-[8px] text-gray-600">Обозначение </span>{tp.code || tp.part_code || ""}</td>
          <td className={`${B} px-1`} colSpan={3}><span className="text-[8px] text-gray-600">Деталь </span>{tp.part_code ? `${tp.part_code} ${tp.part_name ?? ""}` : tp.name}</td>
        </tr>
        {first && (
          <>
            <tr>
              <td className={`${B} px-1`}>Разраб. {tp.developer ?? ""}</td>
              <td className={`${B} px-1`}>Провер. {tp.checker ?? ""}</td>
              <td className={`${B} px-1`}>Утв. {tp.approver ?? ""}</td>
              <td className={`${B} px-1`}>Н.контр.</td>
              <td className={`${B} px-1`} colSpan={2}>Партия {tp.batch_size} шт</td>
            </tr>
            <tr>
              <td className={`${B} px-1`} colSpan={6}>{tp.name}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}

function Head() {
  const th = `${B} px-0.5 font-normal text-[8px]`;
  return (
    <thead>
      <tr>
        <th className={`${th} w-7`} rowSpan={3} />
        <th className={th}>Цех</th><th className={th}>Уч.</th><th className={th}>РМ</th>
        <th className={th}>Опер.</th><th className={th} colSpan={7}>Код, наименование операции</th>
        <th className={th}>Обозначение документа</th>
      </tr>
      <tr>
        <th className={th} colSpan={4}>Код, наименование оборудования</th>
        <th className={th}>Профессия</th><th className={th}>Р</th><th className={th}>УТ</th>
        <th className={th}>КР</th><th className={th}>ЕН</th><th className={th}>ОП</th>
        <th className={th}>Кшт</th><th className={th}>Тпз · Тшт</th>
      </tr>
      <tr>
        <th className={th} colSpan={12}>О — содержание перехода · Т — оснастка</th>
      </tr>
    </thead>
  );
}

function RowView({ r }: { r: Row }) {
  const td = `${B} px-1 h-[18px] text-[9px] align-middle`;
  const sym = <td className={`${td} text-center font-semibold w-7`}>{r.sym}</td>;
  if (r.kind === "blank") return <tr>{sym}<td className={td} colSpan={12} /></tr>;
  if (r.kind === "M") {
    const [mat, , mass, blank, size, kd, mz, kim] = r.cells;
    return (
      <tr>{sym}
        <td className={td} colSpan={5}>{mat}</td>
        <td className={td} colSpan={2}>МД {mass}</td>
        <td className={td} colSpan={2}>{blank}</td>
        <td className={td}>{size}</td>
        <td className={td}>КД {kd} · МЗ {mz}</td>
        <td className={td}>КИМ {kim}</td>
      </tr>
    );
  }
  if (r.kind === "A") {
    const [ceh, uch, rm, opNo, name, doc] = r.cells;
    return (
      <tr className="font-medium">{sym}
        <td className={td}>{ceh}</td><td className={td}>{uch}</td><td className={td}>{rm}</td>
        <td className={td}>{opNo}</td><td className={td} colSpan={7}>{name}</td><td className={td}>{doc}</td>
      </tr>
    );
  }
  if (r.kind === "B") {
    const [eq, prof, rank, ut, kr, en, op, kshtBatch, kshtN, tpz, tsht] = r.cells;
    return (
      <tr>{sym}
        <td className={td} colSpan={4}>{eq}</td><td className={td}>{prof}</td><td className={td}>{rank}</td>
        <td className={td}>{ut}</td><td className={td}>{kr}</td><td className={td}>{en || "1"}</td>
        <td className={td}>{op || kshtBatch}</td><td className={td}>{kshtN}</td>
        <td className={td}>{tpz} · {tsht}</td>
      </tr>
    );
  }
  return <tr>{sym}<td className={td} colSpan={12}>{r.cells[0]}</td></tr>;
}

export default function TechCardPrint({ tp, onClose }: { tp: TechProcess; onClose: () => void }) {
  const pages = useMemo(() => paginate(buildRows(tp)), [tp]);

  return (
    <div className="bg-gray-200 min-h-full">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          #mk-print, #mk-print * { visibility: visible; }
          #mk-print { position: absolute; left: 0; top: 0; width: 100%; }
          .mk-sheet { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
          .mk-sheet:last-child { page-break-after: auto; }
        }
      `}</style>
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-white border-b px-4 py-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={onClose}><Icon name="ChevronLeft" size={15} className="mr-1" />К техкарте</Button>
        <span className="text-sm text-muted-foreground flex-1">Маршрутная карта · {pages.length} {pages.length === 1 ? "лист" : "листа(ов)"} · A4 альбомная</span>
        <Button size="sm" onClick={() => window.print()}><Icon name="Printer" size={15} className="mr-1.5" />Печать / PDF</Button>
      </div>
      <div id="mk-print" className="py-6 flex flex-col items-center gap-6 print:p-0 print:gap-0">
        {pages.map((rows, i) => (
          <div key={i} className="mk-sheet bg-white text-black shadow-lg w-[281mm] min-h-[194mm] p-[5mm] font-['Arial_Narrow',Arial,sans-serif]"
            data-testid="mk-sheet">
            <Stamp tp={tp} sheet={i + 1} sheets={pages.length} first={i === 0} />
            <table className="w-full border-collapse">
              <Head />
              <tbody>{rows.map((r, j) => <RowView key={j} r={r} />)}</tbody>
            </table>
            {i === pages.length - 1 && (
              <div className="text-[9px] mt-1 flex gap-6">
                <span>Σ Тшт = {fmtNum(tp.total_t_sht, 3)} мин</span>
                <span>Σ Тшк = {fmtNum(tp.total_t_sht_k, 3)} мин</span>
                <span>Σ Тпз = {fmtNum(tp.total_t_pz, 2)} мин</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
