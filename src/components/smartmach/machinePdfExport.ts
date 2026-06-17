/**
 * Экспорт пакета рабочих чертежей станка МАТ-1 в единый PDF-документ.
 * Титульный лист + по странице на каждый чертёж (превью из S3).
 */
import { jsPDF } from "jspdf";
import type { MachineDrawing } from "@/components/smartmach/MachineDrawingsList";

// Подписи ответственных лиц для титульного листа (ГОСТ Р 2.105)
export interface PackageSignatures {
  designer: string;   // Разработал
  checker: string;    // Проверил
  normControl: string;// Нормоконтроль
  approver: string;   // Утвердил
  company: string;    // Организация
  docName: string;    // Наименование изделия
  docNumber: string;  // Обозначение документа
}

export const DEFAULT_SIGNATURES: PackageSignatures = {
  designer: "",
  checker: "",
  normControl: "",
  approver: "",
  company: "ООО «МАТ-Лабс»",
  docName: "Гибридный станок МАТ-1",
  docNumber: "МАТ-1.000.000",
};

// Загружает картинку по URL и возвращает dataURL + размеры
function loadImage(url: string): Promise<{ data: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve({ data: canvas.toDataURL("image/jpeg", 0.92), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => reject(new Error("load error"));
    img.src = url;
  });
}

export async function exportDrawingsPackage(
  drawings: MachineDrawing[],
  sign: PackageSignatures = DEFAULT_SIGNATURES,
): Promise<void> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("ru-RU");
  const tr = transliterate;

  // ── Титульный лист ──────────────────────────────────────────
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageW, pageH, "F");

  // Верхняя строка — организация
  pdf.setTextColor(148, 163, 184);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(tr(sign.company), pageW / 2, 28, { align: "center" });

  pdf.setTextColor(245, 158, 11);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("KOMPLEKT RABOCHIH CHERTEZHEY", pageW / 2, 52, { align: "center" });

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(30);
  pdf.text(tr(sign.docName), pageW / 2, 70, { align: "center" });

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(203, 213, 225);
  pdf.text(tr(sign.docNumber), pageW / 2, 82, { align: "center" });

  // Линия-разделитель
  pdf.setDrawColor(71, 85, 105);
  pdf.setLineWidth(0.3);
  pdf.line(pageW / 2 - 60, 90, pageW / 2 + 60, 90);

  // ── Блок подписей ответственных лиц ────────────────────────
  const rows: [string, string][] = [
    ["Razrabotal", sign.designer],
    ["Proveril", sign.checker],
    ["N. kontrol", sign.normControl],
    ["Utverdil", sign.approver],
  ];

  const blockW = 150;
  const blockX = (pageW - blockW) / 2;
  let ry = 108;
  const rowH = 13;

  pdf.setFontSize(10);
  rows.forEach(([role, name]) => {
    // роль (слева)
    pdf.setTextColor(148, 163, 184);
    pdf.setFont("helvetica", "normal");
    pdf.text(tr(role), blockX, ry);

    // линия для подписи
    pdf.setDrawColor(71, 85, 105);
    pdf.line(blockX + 40, ry + 1.5, blockX + 95, ry + 1.5);

    // ФИО (над линией)
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    if (name.trim()) {
      pdf.text(tr(name), blockX + 67, ry, { align: "center" });
    }

    // дата
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(today, blockX + 110, ry);
    pdf.setFontSize(10);

    ry += rowH;
  });

  // ── Низ титула — сводка ────────────────────────────────────
  pdf.setDrawColor(71, 85, 105);
  pdf.line(pageW / 2 - 60, ry + 4, pageW / 2 + 60, ry + 4);

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(10);
  pdf.text(`${tr("Listov chertezhey")}: ${drawings.length}`, pageW / 2, ry + 16, { align: "center" });
  pdf.text(`${tr("Data formirovaniya")}: ${today}`, pageW / 2, ry + 24, { align: "center" });

  pdf.setTextColor(245, 158, 11);
  pdf.setFontSize(8);
  pdf.text("SmartMash - edinoe cifrovoe prostranstvo dannyh KD-CAE-CAM-MES", pageW / 2, pageH - 12, { align: "center" });

  // ── Страницы чертежей ───────────────────────────────────────
  let index = 0;
  for (const d of drawings) {
    if (!d.file_url) continue;
    index++;
    pdf.addPage("a4", "landscape");

    // Верхняя полоса с названием
    pdf.setFillColor(241, 245, 249);
    pdf.rect(0, 0, pageW, 16, "F");
    pdf.setTextColor(30, 41, 59);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    const name = transliterate(d.name);
    pdf.text(name, 8, 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${d.paper_size}  |  ${index}/${drawings.length}`, pageW - 8, 10, { align: "right" });

    // Изображение чертежа — вписываем в область с полями
    try {
      const { data, w, h } = await loadImage(d.file_url);
      const marginX = 8, marginTop = 22, marginBottom = 8;
      const availW = pageW - marginX * 2;
      const availH = pageH - marginTop - marginBottom;
      const ratio = Math.min(availW / w, availH / h);
      const imgW = w * ratio;
      const imgH = h * ratio;
      const x = (pageW - imgW) / 2;
      const y = marginTop + (availH - imgH) / 2;
      pdf.addImage(data, "JPEG", x, y, imgW, imgH);
    } catch {
      pdf.setTextColor(180, 50, 50);
      pdf.setFontSize(11);
      pdf.text("Ne udalos zagruzit izobrazhenie chertezha", pageW / 2, pageH / 2, { align: "center" });
    }
  }

  pdf.save(`MAT-1_chertezhi_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Транслитерация кириллицы для совместимости со стандартными шрифтами jsPDF
function transliterate(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return s.split("").map((ch) => {
    const lower = ch.toLowerCase();
    const tr = map[lower];
    if (tr === undefined) return ch;
    return ch === lower ? tr : tr.charAt(0).toUpperCase() + tr.slice(1);
  }).join("");
}