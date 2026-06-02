import { invoke } from "@tauri-apps/api/core";

import type { RemoteAlbum } from "../types/album";
import type { TokenStatus } from "../types/auth";
import type { AppError } from "../types/error";
import type { RemoteImage, RemoteImagePage } from "../types/image";
import type { AccountUploadSettings, AppSettings } from "../types/settings";
import { safeLogger } from "../utils/safe-logger";

type InvokeArgs = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDesktopError(error: unknown): AppError {
  if (isRecord(error)) {
    return {
      code: typeof error.code === "string" ? error.code : "UNKNOWN",
      message:
        typeof error.message === "string"
          ? error.message
          : "操作失败，请稍后重试。",
      retryable:
        typeof error.retryable === "boolean" ? error.retryable : false,
    } as AppError;
  }

  if (typeof error === "string" && error.length > 0) {
    return {
      code: "UNKNOWN",
      message: error,
      retryable: false,
    };
  }

  return {
    code: "UNKNOWN",
    message: "操作失败，请稍后重试。",
    retryable: false,
  };
}

export async function invokeCommand<T>(
  command: string,
  args?: InvokeArgs,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const normalizedError = normalizeDesktopError(error);
    safeLogger.warn("Desktop command failed", {
      command,
      error: normalizedError,
    });
    throw normalizedError;
  }
}

export function getAppHealth() {
  return invokeCommand<string>("app_health");
}

export function validateToken(token: string) {
  return invokeCommand<TokenStatus>("validate_token", { token });
}

export function saveToken(token: string) {
  return invokeCommand<TokenStatus>("save_token", { token });
}

export function getTokenStatus() {
  return invokeCommand<TokenStatus>("get_token_status");
}

export function clearToken() {
  return invokeCommand<TokenStatus>("clear_token");
}

export function getAppSettings() {
  return invokeCommand<AppSettings>("get_app_settings");
}

export function saveAppSettings(settings: AppSettings) {
  return invokeCommand<AppSettings>("save_app_settings", { settings });
}

export function clearThumbnailCache() {
  return invokeCommand<void>("clear_thumbnail_cache");
}

export function getUploadSettings() {
  return invokeCommand<AccountUploadSettings>("get_upload_settings");
}

export function writeClipboardText(text: string) {
  return invokeCommand<void>("write_clipboard_text", { text });
}

export function openExternalUrl(url: string) {
  return invokeCommand<void>("open_external_url", { url });
}

export function listImages(options: { page?: number; pageSize?: number } = {}) {
  return invokeCommand<RemoteImagePage>("list_images", {
    page: options.page,
    pageSize: options.pageSize,
  });
}

export function listAlbums() {
  return invokeCommand<RemoteAlbum[]>("list_albums");
}

export function uploadImage(
  path: string,
  fileName?: string,
  albumId?: string,
  uploadSettings?: AccountUploadSettings,
) {
  return invokeCommand<RemoteImage>("upload_image", {
    path,
    fileName,
    albumId,
    uploadSettings,
  });
}

export function savePastedImage(fileName: string, bytes: number[]) {
  return invokeCommand<string>("save_pasted_image", {
    fileName,
    bytes,
  });
}

export function readUploadFileBytes(path: string) {
  return invokeCommand<number[]>("read_upload_file_bytes", { path });
}

export function deleteImage(imageId: string) {
  return invokeCommand<void>("delete_image", { imageId });
}
