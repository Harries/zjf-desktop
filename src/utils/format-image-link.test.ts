import { describe, expect, it } from "vitest";

import type { RemoteImage } from "../types/image";
import { formatImageLink } from "./format-image-link";

const image: RemoteImage = {
  id: "img-001",
  fileName: "cover.png",
  url: "https://zjf.ai/i/cover.png",
};

describe("formatImageLink", () => {
  it("returns the raw URL format", () => {
    expect(formatImageLink(image, "url")).toBe("https://zjf.ai/i/cover.png");
  });

  it("returns the Markdown image format", () => {
    expect(formatImageLink(image, "markdown")).toBe(
      "![cover.png](https://zjf.ai/i/cover.png)",
    );
  });

  it("returns the HTML image format", () => {
    expect(formatImageLink(image, "html")).toBe(
      '<img src="https://zjf.ai/i/cover.png" alt="cover.png">',
    );
  });

  it("escapes HTML attributes", () => {
    expect(
      formatImageLink(
        {
          ...image,
          fileName: 'cover "large" <final>.png',
          url: "https://zjf.ai/i/cover.png?name=a&size=large",
        },
        "html",
      ),
    ).toBe(
      '<img src="https://zjf.ai/i/cover.png?name=a&amp;size=large" alt="cover &quot;large&quot; &lt;final&gt;.png">',
    );
  });

  it("uses a default alt when the file name is empty", () => {
    expect(formatImageLink({ ...image, fileName: " " }, "markdown")).toBe(
      "![image](https://zjf.ai/i/cover.png)",
    );
  });
});
