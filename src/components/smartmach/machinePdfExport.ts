/**
 * Экспорт пакета рабочих чертежей станка МАТ-1 в единый PDF-документ.
 * Титульный лист + по странице на каждый чертёж (превью из S3).
 */
import { jsPDF } from "jspdf";
import type { MachineDrawing } from "@/components/smartmach/MachineDrawingsList";

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

export async function exportDrawingsPackage(drawings: MachineDrawing[]): Promise<void> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString("ru-RU");

  // ── Титульный лист ──────────────────────────────────────────
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageW, pageH, "F");

  pdf.setTextColor(245, 158, 11);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("SOBSTVENNAYA RAZRABOTKA / OWN DEVELOPMENT", pageW / 2, 70, { align: "center" });

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(34);
  pdf.text("MAT-1", pageW / 2, 95, { align: "center" });

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "normal");
  pdf.text("Gibridnyy stanok - paket rabochih chertezhey", pageW / 2, 110, { align: "center" });

  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(11);
  pdf.text(`Listov chertezhey: ${drawings.length}`, pageW / 2, 135, { align: "center" });
  pdf.text(`Data formirovaniya: ${today}`, pageW / 2, 145, { align: "center" });
  pdf.text("OOO \"MAT-Labs\" / SmartMash", pageW / 2, 155, { align: "center" });

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
