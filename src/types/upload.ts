import type { RemoteImage } from "./image";
import type { AccountUploadSettings } from "./settings";

export type UploadTaskStatus = "queued" | "uploading" | "success" | "failed";

export type UploadTask = {
  id: string;
  fileName: string;
  sourcePath?: string;
  albumId?: string;
  albumName?: string;
  uploadSettings?: AccountUploadSettings;
  sizeBytes: number;
  status: UploadTaskStatus;
  progress: number;
  image?: RemoteImage;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
