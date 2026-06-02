import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSignedImageUrl,
  deleteImage,
  listImages,
  openExternalUrl,
  writeClipboardText,
} from "../../api/desktop-commands";
import { navigateTo, routes } from "../../app/routes";
import { ErrorState } from "../../components/error-state";
import { PrivateAwareImage } from "../../components/private-image";
import type { RemoteImage } from "../../types/image";
import { formatImageLink, type ImageLinkFormat } from "../../utils/format-image-link";
import { toUserErrorMessage } from "../../utils/user-error";

type ImageDetailPageProps = {
  imageId?: string;
};

const copyOptions: Array<{ format: ImageLinkFormat; label: string }> = [
  { format: "url", label: "复制 URL" },
  { format: "markdown", label: "复制 Markdown" },
  { format: "html", label: "复制 HTML" },
];

const signedUrlExpiresIn = 3600;

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "未知大小";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDimensions(image: RemoteImage) {
  if (!image.width || !image.height) return "未知尺寸";
  return `${image.width} x ${image.height}`;
}

function formatDate(value?: string) {
  if (!value) return "未知时间";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileType(image: RemoteImage) {
  if (image.mimeType) return image.mimeType;
  const extension = image.fileName.split(".").pop();
  return extension && extension !== image.fileName ? extension.toUpperCase() : "未知格式";
}

export function ImageDetailPage({ imageId }: ImageDetailPageProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: imagePage,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["images", "detail", imageId],
    queryFn: () => listImages({ page: 1, pageSize: 100 }),
  });
  const cachedImage = imageId ? queryClient.getQueryData<RemoteImage>(["image", imageId]) : undefined;
  const images = imagePage?.items ?? [];

  const image = useMemo(
    () => cachedImage ?? images.find((item) => item.id === imageId),
    [cachedImage, imageId, images],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteImage(id),
    onSuccess: (_, deletedImageId) => {
      void deletedImageId;
      if (imageId) void queryClient.removeQueries({ queryKey: ["image", imageId] });
      void queryClient.invalidateQueries({ queryKey: ["images"] });
      navigateTo(routes.gallery);
    },
  });

  const copyLink = async (format: ImageLinkFormat) => {
    if (!image) return;

    try {
      await writeClipboardText(formatImageLink(image, format));
      setMessage("已复制到剪贴板");
    } catch (copyError) {
      setMessage(toUserErrorMessage(copyError, "复制失败，请稍后重试。"));
    }
  };

  const createTemporaryLink = async () => {
    if (!image) return;

    try {
      const signedUrl = await createSignedImageUrl(image.id, signedUrlExpiresIn);
      await writeClipboardText(signedUrl.url);
      setMessage("临时访问链接已生成并复制到剪贴板，有效期 1 小时。");
    } catch (signedUrlError) {
      setMessage(toUserErrorMessage(signedUrlError, "生成临时访问链接失败，请稍后重试。"));
    }
  };

  const openImage = async () => {
    if (!image) return;

    try {
      const targetUrl =
        image.visibility === "private"
          ? (await createSignedImageUrl(image.id, signedUrlExpiresIn)).url
          : image.url;
      await openExternalUrl(targetUrl);
      setMessage("已交给默认浏览器打开");
    } catch (openError) {
      setMessage(toUserErrorMessage(openError, "打开图片失败，请稍后重试。"));
    }
  };

  const confirmDelete = () => {
    if (!image || deleteMutation.isPending) return;
    setShowDeleteConfirm(false);
    deleteMutation.mutate(image.id);
  };

  if (!imageId) {
    return (
      <section className="empty-state">
        <div>
          <p className="eyebrow">缺少图片</p>
          <h2>没有可展示的图片 ID</h2>
          <button className="primary-button" onClick={() => navigateTo(routes.gallery)} type="button">
            返回图库
          </button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className="detail-layout">
        <div className="detail-preview shimmer" />
        <div className="detail-panel">
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        fallbackTitle="暂时无法读取图片详情"
        fallbackMessage="图片详情加载失败，请稍后重试。"
        onRetry={() => void refetch()}
        retryLabel="重新加载"
      />
    );
  }

  if (!image) {
    return (
      <section className="empty-state">
        <div>
          <p className="eyebrow">没有找到</p>
          <h2>这张图片不在当前列表中</h2>
          <button className="primary-button" onClick={() => navigateTo(routes.gallery)} type="button">
            返回图库
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="detail-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">图片详情</p>
          <h1>{image.fileName}</h1>
          <p className="intro">{image.url}</p>
        </div>

        <div className="page-actions">
          <button className="secondary-button" onClick={() => navigateTo(routes.gallery)} type="button">
            返回
          </button>
          <button className="primary-button" onClick={() => void openImage()} type="button">
            打开
          </button>
        </div>
      </header>

      {message ? <div className="notice ok">{message}</div> : null}
      {deleteMutation.isError ? (
        <ErrorState
          error={deleteMutation.error}
          fallbackMessage="删除失败，请稍后重试。"
          onRetry={confirmDelete}
          retryLabel="重新删除"
          variant="notice"
        />
      ) : null}

      <section className="detail-layout">
        <div className="detail-preview">
          {image.url || image.visibility === "private" ? (
            <PrivateAwareImage image={image} />
          ) : (
            <span>IMG</span>
          )}
        </div>

        <aside className="detail-panel">
          <div className="detail-meta">
            <span>格式</span>
            <strong>{formatFileType(image)}</strong>
          </div>
          <div className="detail-meta">
            <span>尺寸</span>
            <strong>{formatDimensions(image)}</strong>
          </div>
          <div className="detail-meta">
            <span>大小</span>
            <strong>{formatBytes(image.sizeBytes)}</strong>
          </div>
          <div className="detail-meta">
            <span>上传时间</span>
            <strong>{formatDate(image.createdAt)}</strong>
          </div>
          <div className="detail-meta">
            <span>访问权限</span>
            <strong>{image.visibility === "private" ? "私有" : image.visibility === "public" ? "公开" : "未知"}</strong>
          </div>

          <div className="copy-list" aria-label="复制图片链接">
            {image.visibility === "private" ? (
              <button
                className="primary-button"
                onClick={() => void createTemporaryLink()}
                type="button"
              >
                生成临时访问链接
              </button>
            ) : null}
            {copyOptions.map((option) => (
              <button
                className="secondary-button"
                key={option.format}
                onClick={() => void copyLink(option.format)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            className="danger-button"
            disabled={deleteMutation.isPending}
            onClick={() => setShowDeleteConfirm(true)}
            type="button"
          >
            {deleteMutation.isPending ? "删除中" : "删除图片"}
          </button>
        </aside>
      </section>

      {showDeleteConfirm ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog" aria-modal="true" role="dialog">
            <p className="eyebrow">确认删除</p>
            <h2>{image.fileName}</h2>
            <p>删除后，这张图片的外链可能立即失效，已经复制或嵌入到其他页面的链接也可能无法访问。</p>

            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setShowDeleteConfirm(false)}
                type="button"
              >
                取消
              </button>
              <button
                className="danger-button"
                disabled={deleteMutation.isPending}
                onClick={confirmDelete}
                type="button"
              >
                确认删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
