import type { AppError, AppErrorCode } from "../types/error";

export type UserError = {
  code: AppErrorCode;
  title: string;
  message: string;
  retryable: boolean;
};

type ErrorFallback = {
  title?: string;
  message: string;
};

const fallbackByCode: Record<AppErrorCode, Omit<UserError, "code">> = {
  TOKEN_INVALID: {
    title: "Token 无效",
    message: "Token 无效或权限不足，请重新配置后再试。",
    retryable: false,
  },
  TOKEN_MISSING: {
    title: "缺少 Token",
    message: "尚未配置 zjf.ai Token，请先完成首次配置。",
    retryable: false,
  },
  NETWORK_ERROR: {
    title: "网络连接失败",
    message: "无法连接 zjf.ai，请检查网络后重试。",
    retryable: true,
  },
  FILE_TOO_LARGE: {
    title: "文件过大",
    message: "图片文件过大，请压缩后再上传。",
    retryable: false,
  },
  UNSUPPORTED_FILE_TYPE: {
    title: "文件类型不支持",
    message: "请选择 PNG、JPG、GIF、WebP、BMP、SVG 或 AVIF 图片。",
    retryable: false,
  },
  API_ERROR: {
    title: "操作失败",
    message: "zjf.ai 暂时无法完成请求，请稍后重试。",
    retryable: false,
  },
  UNKNOWN: {
    title: "操作失败",
    message: "操作失败，请稍后重试。",
    retryable: false,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAppErrorCode(value: unknown): value is AppErrorCode {
  return (
    value === "TOKEN_INVALID" ||
    value === "TOKEN_MISSING" ||
    value === "NETWORK_ERROR" ||
    value === "FILE_TOO_LARGE" ||
    value === "UNSUPPORTED_FILE_TYPE" ||
    value === "API_ERROR" ||
    value === "UNKNOWN"
  );
}

function sanitizeMessage(message: string) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ****")
    .replace(/Authorization:\s*[^\s]+/gi, "Authorization: ****")
    .replace(/zjf_[A-Za-z0-9._~+/=-]+/gi, "zjf_****")
    .split("\n")[0]
    .trim();
}

function appErrorFromUnknown(error: unknown): AppError | undefined {
  if (!isRecord(error)) return undefined;

  return {
    code: isAppErrorCode(error.code) ? error.code : "UNKNOWN",
    message: typeof error.message === "string" ? error.message : "",
    retryable: typeof error.retryable === "boolean" ? error.retryable : false,
  };
}

export function toUserError(error: unknown, fallback: ErrorFallback): UserError {
  const appError = appErrorFromUnknown(error);
  const code = appError?.code ?? "UNKNOWN";
  const preset = fallbackByCode[code];
  const rawMessage =
    appError?.message || (typeof error === "string" ? error : "") || fallback.message;
  const sanitized = sanitizeMessage(rawMessage);

  return {
    code,
    title: fallback.title ?? preset.title,
    message: sanitized || preset.message || fallback.message,
    retryable: appError?.retryable ?? preset.retryable,
  };
}

export function toUserErrorMessage(error: unknown, fallbackMessage: string) {
  return toUserError(error, { message: fallbackMessage }).message;
}
