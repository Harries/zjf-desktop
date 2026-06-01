import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RemoteImage } from "../types/image";
import { autoCopyUploadedImage } from "./auto-copy-upload";

const commands = vi.hoisted(() => ({
  getAppSettings: vi.fn(),
  writeClipboardText: vi.fn(),
}));

vi.mock("../api/desktop-commands", () => commands);

const image: RemoteImage = {
  id: "image-001",
  fileName: "cover.png",
  url: "https://zjf.ai/i/cover.png",
};

beforeEach(() => {
  commands.getAppSettings.mockReset();
  commands.writeClipboardText.mockReset();
});

describe("autoCopyUploadedImage", () => {
  it("copies the uploaded image using the configured format", async () => {
    commands.getAppSettings.mockResolvedValue({
      defaultCopyFormat: "markdown",
      autoCopyAfterUpload: true,
      thumbnailCacheEnabled: true,
    });

    await expect(autoCopyUploadedImage(image)).resolves.toBe(true);

    expect(commands.writeClipboardText).toHaveBeenCalledWith(
      "![cover.png](https://zjf.ai/i/cover.png)",
    );
  });

  it("does not copy when auto copy is disabled", async () => {
    commands.getAppSettings.mockResolvedValue({
      defaultCopyFormat: "html",
      autoCopyAfterUpload: false,
      thumbnailCacheEnabled: true,
    });

    await expect(autoCopyUploadedImage(image)).resolves.toBe(false);

    expect(commands.writeClipboardText).not.toHaveBeenCalled();
  });
});
