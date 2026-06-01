import type { RemoteImage } from "../types/image";

export type ImageLinkFormat = "url" | "markdown" | "html";

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function altText(image: RemoteImage) {
  return image.fileName.trim() || "image";
}

export function formatImageLink(image: RemoteImage, format: ImageLinkFormat) {
  if (format === "url") return image.url;
  if (format === "markdown") return `![${altText(image)}](${image.url})`;
  return `<img src="${escapeHtmlAttribute(image.url)}" alt="${escapeHtmlAttribute(altText(image))}">`;
}
