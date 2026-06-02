import type { AccountUploadSettings } from "../types/settings";

type ProcessedUploadImage = {
  bytes: number[];
  fileName: string;
};

const canvasProcessableMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const fallbackWatermarkText = "ZJF";

export function shouldProcessUploadImage(settings?: AccountUploadSettings) {
  return Boolean(settings?.defaultCompress || settings?.defaultWatermark);
}

export function mimeTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export async function processUploadImage(
  blob: Blob,
  fileName: string,
  settings?: AccountUploadSettings,
): Promise<ProcessedUploadImage | undefined> {
  if (!shouldProcessUploadImage(settings)) return undefined;

  const sourceMimeType = blob.type || mimeTypeFromFileName(fileName);
  if (!canvasProcessableMimeTypes.has(sourceMimeType)) return undefined;

  const image = await loadImage(blob);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext("2d");
  if (!context) return undefined;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawWatermark(context, canvas, settings);

  const outputMimeType = settings?.defaultCompress ? "image/jpeg" : sourceMimeType;
  const quality = normalizeQuality(settings?.defaultQuality);
  const outputBlob = await canvasToBlob(canvas, outputMimeType, quality);

  return {
    bytes: Array.from(new Uint8Array(await outputBlob.arrayBuffer())),
    fileName: withMimeExtension(fileName, outputMimeType),
  };
}

function drawWatermark(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  settings?: AccountUploadSettings,
) {
  const watermarkText = settings?.defaultWatermark
    ? settings.watermarkText?.trim() || fallbackWatermarkText
    : "";
  if (!watermarkText) return;

  const fontSize = Math.max(16, Math.round(Math.min(canvas.width, canvas.height) * 0.045));
  const padding = Math.max(14, Math.round(fontSize * 0.8));

  context.save();
  context.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textBaseline = "bottom";
  context.textAlign = "right";
  context.lineJoin = "round";
  context.shadowColor = "rgba(0, 0, 0, 0.28)";
  context.shadowBlur = Math.max(2, Math.round(fontSize * 0.16));
  context.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.05));

  const x = canvas.width - padding;
  const y = canvas.height - padding;

  context.strokeStyle = "rgba(0, 0, 0, 0.18)";
  context.lineWidth = Math.max(1, Math.round(fontSize * 0.08));
  context.strokeText(watermarkText, x, y);
  context.fillStyle = "rgba(255, 255, 255, 0.56)";
  context.fillText(watermarkText, x, y);
  context.restore();
}

function normalizeQuality(quality?: number) {
  if (!quality || Number.isNaN(quality)) return 0.82;
  return Math.min(1, Math.max(0.1, quality / 100));
}

function withMimeExtension(fileName: string, mimeType: string) {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] || "png";
  const baseName = fileName.replace(/\.[^.\\/]+$/, "");
  return `${baseName}.${extension}`;
}

function loadImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片处理失败，请重新选择图片。"));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("图片处理失败，请稍后重试。"));
        }
      },
      mimeType,
      quality,
    );
  });
}
