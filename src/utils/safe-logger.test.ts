import { describe, expect, it, vi } from "vitest";

import { safeLogger, sanitizeLogValue } from "./safe-logger";

describe("safe logger", () => {
  it("redacts token-like values from strings", () => {
    expect(sanitizeLogValue("Authorization: Bearer zjf_secret_token")).toBe(
      "Authorization: **** ****",
    );
  });

  it("redacts sensitive object fields", () => {
    expect(
      sanitizeLogValue({
        token: "zjf_secret_token",
        nested: {
          Authorization: "Bearer zjf_secret_token",
          fileName: "cover.png",
        },
      }),
    ).toEqual({
      token: "****",
      nested: {
        Authorization: "****",
        fileName: "cover.png",
      },
    });
  });

  it("writes only sanitized context to console", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    safeLogger.warn("Authorization: Bearer zjf_secret_token", {
      error: "Bearer zjf_secret_token",
    });

    expect(warn).toHaveBeenCalledWith("Authorization: **** ****", {
      error: "Bearer ****",
    });

    warn.mockRestore();
  });
});
