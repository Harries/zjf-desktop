import { describe, expect, it } from "vitest";

import { maskToken } from "./mask-token";

describe("maskToken", () => {
  it("masks short tokens completely", () => {
    expect(maskToken("short")).toBe("****");
  });

  it("keeps only the first and last four characters", () => {
    expect(maskToken("zjf_1234567890abcd")).toBe("zjf_**********abcd");
  });

  it("trims surrounding whitespace before masking", () => {
    expect(maskToken("  zjf_1234567890abcd  ")).toBe("zjf_**********abcd");
  });
});
