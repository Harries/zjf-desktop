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
  albumId?: string;
  albumName?: string;
  createdAt?: string;
};

export type RemoteImagePage = {
  items: RemoteImage[];
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type SignedImageUrl = {
  url: string;
  expiresAt?: string;
};
