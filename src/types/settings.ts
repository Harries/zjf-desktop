export type CopyFormat = "url" | "markdown" | "html";

export type AppSettings = {
  defaultCopyFormat: CopyFormat;
  autoCopyAfterUpload: boolean;
  thumbnailCacheEnabled: boolean;
};

