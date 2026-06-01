import { describe, expect, it } from "vitest";

import { toUserError, toUserErrorMessage } from "./user-error";

describe("toUserError", () => {
  it("normalizes token invalid errors", () => {
    expect(
      toUserError(
        {
          code: "TOKEN_INVALID",
          message: "Token 无效或权限不足，请重新配置。",
          retryable: false,
        },
        { message: "操作失败" },
      ),
    ).toMatchObject({
      code: "TOKEN_INVALID",
      title: "Token 无效",
      retryable: false,
    });
  });

  it("keeps network errors retryable", () => {
    expect(
      toUserError(
        {
          code: "NETWORK_ERROR",
          message: "网络请求超时，请稍后重试。",
          retryable: true,
        },
        { message: "操作失败" },
      ),
    ).toMatchObject({
      code: "NETWORK_ERROR",
      title: "网络连接失败",
      retryable: true,
    });
  });

  it("removes sensitive tokens and stack lines from messages", () => {
    expect(
      toUserErrorMessage(
        "Authorization: Bearer zjf_secret_token\nat stacktrace",
        "操作失败",
      ),
    ).toBe("Authorization: **** ****");
  });
});
