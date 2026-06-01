import type { RemoteImage } from "./image";

export type UploadTaskStatus = "queued" | "uploading" | "success" | "failed";

export type UploadTask = {
  id: string;
  fileName: string;
  sourcePath?: string;
  sizeBytes: number;
  status: UploadTaskStatus;
  progress: number;
  image?: RemoteImage;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
