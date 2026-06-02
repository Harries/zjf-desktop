import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listImages, savePastedImage, uploadImage } from "../../api/desktop-commands";
import { navigateToImage } from "../../app/routes";
import { Dropzone } from "../../components/dropzone";
import { ErrorState } from "../../components/error-state";
import type { RemoteImage } from "../../types/image";
import { useUploadQueueStore } from "../../stores/upload-queue-store";
import { autoCopyUploadedImage } from "../../utils/auto-copy-upload";
import { filterImages } from "../../utils/filter-images";
import { toUserErrorMessage } from "../../utils/user-error";

const galleryPageSize = 20;
const supportedImageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"];

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
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function extractFileName(path: string) {
  return path.split(/[\\/]/).pop() || "image";
}

function isSupportedImagePath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? supportedImageExtensions.includes(extension) : false;
}

function extensionFromMimeType(mimeType: string) {
  const extension = mimeType.split("/")[1]?.toLowerCase();
  if (!extension) return "png";
  if (extension === "jpeg") return "jpg";
  if (extension === "svg+xml") return "svg";
  return supportedImageExtensions.includes(extension) ? extension : "png";
}

function createPastedFileName(index: number, mimeType: string) {
  const extension = extensionFromMimeType(mimeType);
  return `pasted-image-${Date.now()}-${index + 1}.${extension}`;
}

async function bytesFromBlob(blob: Blob) {
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

export function GalleryPage() {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadNotice, setUploadNotice] = useState<string>();
  const [isSelectingFiles, setIsSelectingFiles] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const addTask = useUploadQueueStore((state) => state.addTask);
  const markUploading = useUploadQueueStore((state) => state.markUploading);
  const setTaskSourcePath = useUploadQueueStore((state) => state.setTaskSourcePath);
  const updateProgress = useUploadQueueStore((state) => state.updateProgress);
  const markSuccess = useUploadQueueStore((state) => state.markSuccess);
  const markFailed = useUploadQueueStore((state) => state.markFailed);
  const {
    data: imagePage,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["images", currentPage, galleryPageSize],
    queryFn: () => listImages({ page: currentPage, pageSize: galleryPageSize }),
  });
  const images = imagePage?.items ?? [];

  const stats = useMemo(() => {
    const totalBytes = images.reduce((sum, image) => sum + (image.sizeBytes ?? 0), 0);
    const publicCount = images.filter((image) => image.visibility === "public").length;
    const privateCount = images.filter((image) => image.visibility === "private").length;

    return [
      {
        label: imagePage?.total === undefined ? "当前页" : "全部图片",
        value: (imagePage?.total ?? images.length).toString(),
      },
      { label: "当前页公开", value: publicCount.toString() },
      { label: "当前页私有", value: privateCount.toString() },
      { label: "当前页容量", value: formatBytes(totalBytes) },
    ];
  }, [imagePage?.total, images]);

  const normalizedKeyword = searchKeyword.trim().toLowerCase();
  const filteredImages = useMemo(() => filterImages(images, searchKeyword), [images, searchKeyword]);
  const totalPages = imagePage?.totalPages;
  const hasPreviousPage = currentPage > 1 || Boolean(imagePage?.hasPreviousPage);
  const hasNextPage =
    Boolean(imagePage?.hasNextPage) || (totalPages !== undefined ? currentPage < totalPages : false);
  const paginationSummary =
    totalPages !== undefined
      ? `第 ${currentPage} / ${totalPages} 页`
      : `第 ${currentPage} 页${hasNextPage ? "，还有更多" : ""}`;

  const uploadLocalFile = useCallback(
    async (path: string, fileName: string, sizeBytes: number) => {
      const taskId = addTask({ fileName, sourcePath: path, sizeBytes });

      markUploading(taskId);
      updateProgress(taskId, 35);

      try {
        const uploaded = await uploadImage(path, fileName);
        markSuccess(taskId, uploaded);
        queryClient.setQueryData(["image", uploaded.id], uploaded);
        setCurrentPage(1);
        void queryClient.invalidateQueries({ queryKey: ["images"] });
        const copied = await autoCopyUploadedImage(uploaded);
        return { success: true, copied };
      } catch (uploadError) {
        markFailed(taskId, toUserErrorMessage(uploadError, "上传失败，请稍后重试。"));
        return { success: false, copied: false };
      }
    },
    [addTask, markFailed, markSuccess, markUploading, queryClient, updateProgress],
  );

  const uploadPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;

      const validPaths = paths.filter(isSupportedImagePath);
      const skippedCount = paths.length - validPaths.length;
      if (validPaths.length === 0) {
        setUploadNotice("请选择 PNG、JPG、GIF、WebP、BMP、SVG 或 AVIF 图片。");
        return;
      }

      const results = await Promise.all(
        validPaths.map((path) => uploadLocalFile(path, extractFileName(path), 0)),
      );
      const successCount = results.filter((result) => result.success).length;
      const failedCount = results.length - successCount;
      const copiedCount = results.filter((result) => result.copied).length;

      if (failedCount > 0) {
        setUploadNotice(`已完成 ${successCount} 个，失败 ${failedCount} 个。可到上传队列重试。`);
      } else {
        const copySuffix = copiedCount > 0 ? "已自动复制链接。" : "";
        setUploadNotice(
          skippedCount > 0
            ? `已上传 ${successCount} 个，跳过 ${skippedCount} 个非图片文件。${copySuffix}`
            : `已上传 ${successCount} 个图片。${copySuffix}`,
        );
      }
    },
    [uploadLocalFile],
  );

  const uploadPastedBlobs = useCallback(
    async (blobs: Blob[], showEmptyNotice: boolean) => {
      const imageBlobs = blobs.filter((blob) => blob.type.startsWith("image/"));

      if (imageBlobs.length === 0) {
        if (showEmptyNotice) setUploadNotice("剪贴板里没有可上传的图片。");
        return;
      }

      const results = await Promise.all(
        imageBlobs.map(async (blob, index) => {
          const fileName = createPastedFileName(index, blob.type);
          const taskId = addTask({ fileName, sizeBytes: blob.size });

          markUploading(taskId);
          updateProgress(taskId, 10);

          try {
            const path = await savePastedImage(fileName, await bytesFromBlob(blob));
            setTaskSourcePath(taskId, path);
            updateProgress(taskId, 35);
            const uploaded = await uploadImage(path, fileName);
            markSuccess(taskId, uploaded);
            queryClient.setQueryData(["image", uploaded.id], uploaded);
            setCurrentPage(1);
            void queryClient.invalidateQueries({ queryKey: ["images"] });
            const copied = await autoCopyUploadedImage(uploaded);
            return { success: true, copied };
          } catch (pasteError) {
            markFailed(taskId, toUserErrorMessage(pasteError, "粘贴上传失败，请稍后重试。"));
            return { success: false, copied: false };
          }
        }),
      );
      const successCount = results.filter((result) => result.success).length;
      const failedCount = results.length - successCount;
      const copiedCount = results.filter((result) => result.copied).length;

      setUploadNotice(
        failedCount > 0
          ? `粘贴上传完成 ${successCount} 个，失败 ${failedCount} 个。`
          : `已粘贴上传 ${successCount} 个图片。${copiedCount > 0 ? "已自动复制链接。" : ""}`,
      );
    },
    [addTask, markFailed, markSuccess, markUploading, queryClient, setTaskSourcePath, updateProgress],
  );

  const handleUploadSelect = async () => {
    setUploadNotice(undefined);
    setIsSelectingFiles(true);

    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "图片", extensions: supportedImageExtensions }],
      });
      const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
      await uploadPaths(paths);
    } catch (selectError) {
      setUploadNotice(toUserErrorMessage(selectError, "选择图片失败，请稍后重试。"));
    } finally {
      setIsSelectingFiles(false);
    }
  };

  const handlePasteUpload = async () => {
    setUploadNotice(undefined);

    try {
      if (!navigator.clipboard?.read) {
        setUploadNotice("当前环境不支持主动读取剪贴板，请直接按 Ctrl/Cmd+V 粘贴图片。");
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      const blobs: Blob[] = [];

      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          blobs.push(await item.getType(imageType));
        }
      }

      await uploadPastedBlobs(blobs, true);
    } catch (pasteError) {
      setUploadNotice(toUserErrorMessage(pasteError, "读取剪贴板失败，请稍后重试。"));
    }
  };

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const dragDrop = event.payload;

        if (dragDrop.type === "enter" || dragDrop.type === "over") {
          setIsDragActive(true);
        }

        if (dragDrop.type === "leave") {
          setIsDragActive(false);
        }

        if (dragDrop.type === "drop") {
          setIsDragActive(false);
          void uploadPaths(dragDrop.paths);
        }
      })
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
        } else {
          unlisten = nextUnlisten;
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [uploadPaths]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length === 0) return;

      event.preventDefault();
      setUploadNotice(undefined);
      void uploadPastedBlobs(imageFiles, false);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [uploadPastedBlobs]);

  return (
    <div className="gallery-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">图库</p>
          <h1>图片列表</h1>
          <p className="intro">管理 zjf.ai 账号下的图片文件、公开链接和存储占用。</p>
        </div>

        <div className="page-actions">
          <button
            className="secondary-button"
            disabled={isFetching}
            onClick={() => void refetch()}
            type="button"
          >
            {isFetching ? "刷新中" : "刷新"}
          </button>
          <button
            className="primary-button"
            disabled={isSelectingFiles}
            onClick={() => void handleUploadSelect()}
            type="button"
          >
            {isSelectingFiles ? "上传中" : "上传"}
          </button>
          <button className="secondary-button" onClick={() => void handlePasteUpload()} type="button">
            粘贴上传
          </button>
        </div>
      </header>

      {uploadNotice ? <div className="notice ok">{uploadNotice}</div> : null}

      <Dropzone
        active={isDragActive}
        disabled={isSelectingFiles}
        onClick={() => void handleUploadSelect()}
      />

      <section className="stat-grid" aria-label="图片统计">
        {stats.map((stat) => (
          <div className="card stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </section>

      {!isLoading && !isError && images.length > 0 ? (
        <section className="gallery-tools" aria-label="图库筛选">
          <label className="search-field">
            <span>搜索</span>
            <input
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="输入文件名或 URL"
              type="search"
              value={searchKeyword}
            />
          </label>

          <div className="search-summary">
            {normalizedKeyword
              ? `当前页匹配 ${filteredImages.length} / ${images.length}`
              : `当前页 ${images.length} 张`}
          </div>

          {normalizedKeyword ? (
            <button className="secondary-button" onClick={() => setSearchKeyword("")} type="button">
              清空
            </button>
          ) : null}
        </section>
      ) : null}

      {isLoading ? (
        <section className="gallery-grid" aria-label="图片加载中">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="image-card image-card-loading" key={index}>
              <div className="image-thumb shimmer" />
              <div className="image-card-body">
                <span className="skeleton-line wide" />
                <span className="skeleton-line" />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {isError ? (
        <ErrorState
          error={error}
          fallbackTitle="暂时无法读取图片列表"
          fallbackMessage="图片列表加载失败，请稍后重试。"
          onRetry={() => void refetch()}
          retryLabel="重新加载"
        />
      ) : null}

      {!isLoading && !isError && images.length === 0 ? (
        <section className="empty-state">
          <div>
            <p className="eyebrow">空图库</p>
            <h2>还没有同步到图片</h2>
            <p>上传第一张图片后，这里会展示文件名、尺寸、大小和访问链接。</p>
            <button className="primary-button" onClick={() => void handleUploadSelect()} type="button">
              上传图片
            </button>
          </div>
        </section>
      ) : null}

      {!isLoading && !isError && images.length > 0 && filteredImages.length === 0 ? (
        <section className="empty-state">
          <div>
            <p className="eyebrow">无匹配结果</p>
            <h2>没有找到相关图片</h2>
            <p>换一个文件名或链接关键词试试。</p>
            <button className="primary-button" onClick={() => setSearchKeyword("")} type="button">
              清空搜索
            </button>
          </div>
        </section>
      ) : null}

      {!isLoading && !isError && filteredImages.length > 0 ? (
        <section className="gallery-grid" aria-label="图片列表">
          {filteredImages.map((image) => (
            <button
              className="image-card image-card-button"
              key={image.id}
              onClick={() => {
                queryClient.setQueryData(["image", image.id], image);
                navigateToImage(image.id);
              }}
              type="button"
            >
              <div className="image-thumb">
                {image.thumbnailUrl || image.url ? (
                  <img alt={image.fileName} src={image.thumbnailUrl ?? image.url} />
                ) : (
                  <span>IMG</span>
                )}
              </div>

              <div className="image-card-body">
                <strong title={image.fileName}>{image.fileName}</strong>
                <span>{formatDimensions(image)}</span>
                <span>{formatBytes(image.sizeBytes)}</span>
                <span>{formatDate(image.createdAt)}</span>
              </div>
            </button>
          ))}
        </section>
      ) : null}

      {!isLoading && !isError && (images.length > 0 || currentPage > 1) ? (
        <nav className="pagination-bar" aria-label="图片分页">
          <div className="pagination-summary">
            <strong>{paginationSummary}</strong>
            {imagePage?.total !== undefined ? <span>共 {imagePage.total} 张</span> : null}
          </div>
          <div className="pagination-actions">
            <button
              className="secondary-button"
              disabled={!hasPreviousPage || isFetching}
              onClick={() => {
                setSearchKeyword("");
                setCurrentPage((page) => Math.max(1, page - 1));
              }}
              type="button"
            >
              上一页
            </button>
            <button
              className="secondary-button"
              disabled={!hasNextPage || isFetching}
              onClick={() => {
                setSearchKeyword("");
                setCurrentPage((page) => page + 1);
              }}
              type="button"
            >
              下一页
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
