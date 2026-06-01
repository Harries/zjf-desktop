import type { RemoteImage } from "../types/image";

export function filterImages(images: RemoteImage[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) return images;

  return images.filter((image) => {
    const fileName = image.fileName.toLowerCase();
    const url = image.url.toLowerCase();
    return fileName.includes(normalizedKeyword) || url.includes(normalizedKeyword);
  });
}
