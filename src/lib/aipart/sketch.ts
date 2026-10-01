/**
 * Подготовка эскиза к распознаванию: проверка формата, уменьшение до 1600 px по большей стороне,
 * белый фон под прозрачность, JPEG с подбором качества под лимит размера.
 * Распознаванию нужна читаемость размерных надписей, а не исходное разрешение камеры.
 */

export const SKETCH_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MAX_SOURCE_MB = 15;
export const MAX_SIDE = 1600;
export const MAX_BYTES = 450_000;

export class SketchError extends Error {}

export function validateSketchFile(file: { type: string; size: number; name: string }) {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!SKETCH_TYPES.includes(file.type) && !["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) {
    throw new SketchError("Загрузите изображение: JPG, PNG или WEBP. PDF и DWG пока не поддерживаются — сделайте скриншот.");
  }
  if (file.size > MAX_SOURCE_MB * 1024 * 1024) throw new SketchError(`Файл больше ${MAX_SOURCE_MB} МБ`);
}

/** Размер после вписывания в квадрат MAX_SIDE с сохранением пропорций */
export function fitSize(w: number, h: number, max = MAX_SIDE): [number, number] {
  const k = Math.min(1, max / Math.max(w, h));
  return [Math.round(w * k), Math.round(h * k)];
}

/** Длина данных base64 data URL в байтах */
export const dataUrlBytes = (url: string) => Math.floor(((url.length - url.indexOf(",") - 1) * 3) / 4);

export async function prepareSketch(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  validateSketchFile(file);
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new SketchError("Не удалось открыть изображение. Если это фото с iPhone (HEIC) — сохраните его как JPG."); }
  const [w, h] = fitSize(bmp.width, bmp.height);
  if (Math.min(w, h) < 200) throw new SketchError("Изображение слишком маленькое — размеры на нём не прочитать");
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new SketchError("Браузер не поддерживает обработку изображений");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  let dataUrl = "";
  for (const q of [0.85, 0.75, 0.65, 0.5]) {
    dataUrl = canvas.toDataURL("image/jpeg", q);
    if (dataUrlBytes(dataUrl) <= MAX_BYTES) break;
  }
  return { dataUrl, width: w, height: h };
}
