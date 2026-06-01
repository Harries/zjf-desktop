export type RemoteImage = {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
  visibility?: "public" | "private" | "unknown";
  createdAt?: string;
};

