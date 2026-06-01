import { getAppSettings, writeClipboardText } from "../api/desktop-commands";
import type { RemoteImage } from "../types/image";
import { formatImageLink } from "./format-image-link";

export async function autoCopyUploadedImage(image: RemoteImage) {
  const settings = await getAppSettings();

  if (!settings.autoCopyAfterUpload) {
    return false;
  }

  await writeClipboardText(formatImageLink(image, settings.defaultCopyFormat));
  return true;
}
