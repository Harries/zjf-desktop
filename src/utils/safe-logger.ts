const sensitiveKeyPattern = /token|authorization|password|secret/i;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const tokenPattern = /zjf_[A-Za-z0-9._~+/=-]+/gi;

function redactString(value: string) {
  return value
    .replace(bearerPattern, "Bearer ****")
    .replace(/Authorization:\s*[^\s]+/gi, "Authorization: ****")
    .replace(tokenPattern, "zjf_****");
}

export function sanitizeLogValue(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(sanitizeLogValue);
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? "****" : sanitizeLogValue(entry),
    ]),
  );
}

export const safeLogger = {
  warn(message: string, context?: unknown) {
    if (context === undefined) {
      console.warn(redactString(message));
      return;
    }

    console.warn(redactString(message), sanitizeLogValue(context));
  },
};
