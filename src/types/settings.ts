export type CopyFormat = "url" | "markdown" | "html";

export type AppSettings = {
  defaultCopyFormat: CopyFormat;
  autoCopyAfterUpload: boolean;
  thumbnailCacheEnabled: boolean;
};

export type AccountUploadSettings = {
  defaultVisibility?: "public" | "private";
  defaultCompress: boolean;
  defaultQuality?: number;
  defaultWatermark: boolean;
  watermarkText?: string;
};
