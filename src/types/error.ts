export type AppErrorCode =
  | "TOKEN_INVALID"
  | "TOKEN_MISSING"
  | "NETWORK_ERROR"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "API_ERROR"
  | "UNKNOWN";

export type AppError = {
  code: AppErrorCode;
  message: string;
  retryable: boolean;
};

