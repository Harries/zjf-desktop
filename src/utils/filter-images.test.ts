import { describe, expect, it } from "vitest";

import type { RemoteImage } from "../types/image";
import { filterImages } from "./filter-images";

const images: RemoteImage[] = [
  {
    id: "image-001",
    fileName: "Landing-Hero.png",
    url: "https://zjf.ai/i/landing-hero.png",
  },
  {
    id: "image-002",
    fileName: "avatar.jpg",
    url: "https://cdn.zjf.ai/users/me/avatar.jpg",
  },
];

describe("filterImages", () => {
  it("returns all images for an empty keyword", () => {
    expect(filterImages(images, " ")).toBe(images);
  });

  it("filters by file name case-insensitively", () => {
    expect(filterImages(images, "hero")).toEqual([images[0]]);
  });

  it("filters by URL", () => {
    expect(filterImages(images, "users/me")).toEqual([images[1]]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterImages(images, "invoice")).toEqual([]);
  });
});
