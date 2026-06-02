import { useQuery } from "@tanstack/react-query";

import { createSignedImageUrl } from "../../api/desktop-commands";
import type { RemoteImage } from "../../types/image";

type PrivateAwareImageProps = {
  image: RemoteImage;
  className?: string;
};

const signedPreviewExpiresIn = 3600;

export function PrivateAwareImage({ image, className }: PrivateAwareImageProps) {
  const needsSignedUrl = image.visibility === "private";
  const sourceUrl = image.thumbnailUrl ?? image.url;
  const { data: signedUrl, isError, isFetching } = useQuery({
    enabled: needsSignedUrl,
    queryKey: ["image", image.id, "signed-preview", signedPreviewExpiresIn],
    queryFn: () => createSignedImageUrl(image.id, signedPreviewExpiresIn),
    staleTime: 45 * 60 * 1000,
  });
  const resolvedUrl = needsSignedUrl ? signedUrl?.url : sourceUrl;

  if (resolvedUrl) {
    return <img alt={image.fileName} className={className} src={resolvedUrl} />;
  }

  if (isError) return <span>私有图片</span>;
  if (isFetching) return <span>加载中</span>;

  return <span>IMG</span>;
}
