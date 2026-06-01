import { invoke } from "@tauri-apps/api/core";

import type { TokenStatus } from "../types/auth";
import type { AppError } from "../types/error";
import type { RemoteImage } from "../types/image";
import type { AppSettings } from "../types/settings";
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

export function writeClipboardText(text: string) {
  return invokeCommand<void>("write_clipboard_text", { text });
}

export function openExternalUrl(url: string) {
  return invokeCommand<void>("open_external_url", { url });
}

export function listImages() {
  return invokeCommand<RemoteImage[]>("list_images");
}

export function uploadImage(path: string, fileName?: string) {
  return invokeCommand<RemoteImage>("upload_image", {
    path,
    fileName,
  });
}

export function savePastedImage(fileName: string, bytes: number[]) {
  return invokeCommand<string>("save_pasted_image", {
    fileName,
    bytes,
  });
}

export function deleteImage(imageId: string) {
  return invokeCommand<void>("delete_image", { imageId });
}
