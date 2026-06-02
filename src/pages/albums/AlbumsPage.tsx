import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAlbum,
  deleteAlbum,
  listAlbums,
  listImages,
  renameAlbum,
} from "../../api/desktop-commands";
import { navigateToImage } from "../../app/routes";
import { ErrorState } from "../../components/error-state";
import { PrivateAwareImage } from "../../components/private-image";
import type { RemoteImage } from "../../types/image";
import { toUserErrorMessage } from "../../utils/user-error";

const albumImagePageSize = 20;

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "未知容量";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

function formatDimensions(image: RemoteImage) {
  if (!image.width || !image.height) return "未知尺寸";
  return `${image.width} x ${image.height}`;
}

export function AlbumsPage() {
  const queryClient = useQueryClient();
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>();
  const [albumKeyword, setAlbumKeyword] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [renameAlbumName, setRenameAlbumName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState<string>();

  const {
    data: albums = [],
    error: albumsError,
    isError: isAlbumsError,
    isLoading: isLoadingAlbums,
    refetch: refetchAlbums,
  } = useQuery({
    queryKey: ["albums"],
    queryFn: listAlbums,
  });

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId);

  useEffect(() => {
    if (selectedAlbumId && albums.some((album) => album.id === selectedAlbumId)) return;
    setSelectedAlbumId(albums[0]?.id);
  }, [albums, selectedAlbumId]);

  useEffect(() => {
    setRenameAlbumName(selectedAlbum?.name ?? "");
    setCurrentPage(1);
  }, [selectedAlbum?.id, selectedAlbum?.name]);

  const normalizedKeyword = albumKeyword.trim().toLowerCase();
  const filteredAlbums = useMemo(
    () =>
      normalizedKeyword
        ? albums.filter((album) => album.name.toLowerCase().includes(normalizedKeyword))
        : albums,
    [albums, normalizedKeyword],
  );

  const {
    data: imagePage,
    error: imagesError,
    isError: isImagesError,
    isFetching: isFetchingImages,
    isLoading: isLoadingImages,
    refetch: refetchImages,
  } = useQuery({
    enabled: Boolean(selectedAlbumId),
    queryKey: ["images", "album", selectedAlbumId, currentPage, albumImagePageSize],
    queryFn: () =>
      listImages({
        albumId: selectedAlbumId,
        page: currentPage,
        pageSize: albumImagePageSize,
      }),
  });
  const images = imagePage?.items ?? [];
  const totalPages = imagePage?.totalPages;
  const hasPreviousPage = currentPage > 1 || Boolean(imagePage?.hasPreviousPage);
  const hasNextPage =
    Boolean(imagePage?.hasNextPage) || (totalPages !== undefined ? currentPage < totalPages : false);

  const createMutation = useMutation({
    mutationFn: (name: string) => createAlbum(name),
    onSuccess: (album) => {
      setMessage("相册已创建。");
      setNewAlbumName("");
      setSelectedAlbumId(album.id);
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
    onError: (error) => setMessage(toUserErrorMessage(error, "创建相册失败，请稍后重试。")),
  });

  const renameMutation = useMutation({
    mutationFn: ({ albumId, name }: { albumId: string; name: string }) => renameAlbum(albumId, name),
    onSuccess: () => {
      setMessage("相册已重命名。");
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
    onError: (error) => setMessage(toUserErrorMessage(error, "重命名失败，请稍后重试。")),
  });

  const deleteMutation = useMutation({
    mutationFn: (albumId: string) => deleteAlbum(albumId),
    onSuccess: (_, albumId) => {
      setMessage("相册已删除。");
      if (selectedAlbumId === albumId) setSelectedAlbumId(undefined);
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
      void queryClient.invalidateQueries({ queryKey: ["images"] });
    },
    onError: (error) => setMessage(toUserErrorMessage(error, "删除相册失败，请确认相册为空。")),
  });

  const handleCreateAlbum = () => {
    const name = newAlbumName.trim();
    if (!name) {
      setMessage("请输入相册名称。");
      return;
    }

    createMutation.mutate(name);
  };

  const handleRenameAlbum = () => {
    if (!selectedAlbum) return;
    const name = renameAlbumName.trim();

    if (!name) {
      setMessage("请输入相册名称。");
      return;
    }

    renameMutation.mutate({ albumId: selectedAlbum.id, name });
  };

  const handleDeleteAlbum = () => {
    if (!selectedAlbum || selectedAlbum.isDefault) return;

    const confirmed = window.confirm(`确定删除相册“${selectedAlbum.name}”？只有空相册可以删除。`);
    if (confirmed) deleteMutation.mutate(selectedAlbum.id);
  };

  return (
    <div className="albums-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">相册管理</p>
          <h1>相册与图片</h1>
          <p className="intro">查询相册、查看相册内图片，并维护空相册。</p>
        </div>

        <div className="page-actions">
          <button
            className="secondary-button"
            disabled={isLoadingAlbums || isFetchingImages}
            onClick={() => {
              void refetchAlbums();
              void refetchImages();
            }}
            type="button"
          >
            刷新
          </button>
        </div>
      </header>

      {message ? <div className="notice ok">{message}</div> : null}

      {isAlbumsError ? (
        <ErrorState
          error={albumsError}
          fallbackMessage="相册列表加载失败，请稍后重试。"
          fallbackTitle="暂时无法读取相册"
          onRetry={() => void refetchAlbums()}
          retryLabel="重新加载"
        />
      ) : null}

      <section className="albums-layout">
        <aside className="albums-panel">
          <div className="album-create-row">
            <input
              className="text-input"
              onChange={(event) => setNewAlbumName(event.target.value)}
              placeholder="新建相册名称"
              type="text"
              value={newAlbumName}
            />
            <button
              className="primary-button"
              disabled={createMutation.isPending}
              onClick={handleCreateAlbum}
              type="button"
            >
              新建
            </button>
          </div>

          <label className="search-field">
            <span>相册查询</span>
            <input
              onChange={(event) => setAlbumKeyword(event.target.value)}
              placeholder="输入相册名称"
              type="search"
              value={albumKeyword}
            />
          </label>

          <div className="album-list" aria-label="相册列表">
            {isLoadingAlbums ? <div className="album-list-empty">加载中</div> : null}
            {!isLoadingAlbums && filteredAlbums.length === 0 ? (
              <div className="album-list-empty">没有相册</div>
            ) : null}
            {filteredAlbums.map((album) => (
              <button
                className={`album-list-item ${selectedAlbumId === album.id ? "active" : ""}`}
                key={album.id}
                onClick={() => setSelectedAlbumId(album.id)}
                type="button"
              >
                <span>
                  <strong>{album.name}</strong>
                  {album.isDefault ? <em>默认</em> : null}
                </span>
                <small>
                  {album.imageCount ?? 0} 张 · {formatBytes(album.storageBytes)}
                </small>
              </button>
            ))}
          </div>
        </aside>

        <section className="album-detail-panel">
          {selectedAlbum ? (
            <>
              <div className="album-detail-header">
                <div>
                  <p className="eyebrow">当前相册</p>
                  <h2>{selectedAlbum.name}</h2>
                  <p>
                    {selectedAlbum.imageCount ?? 0} 张图片 · {formatBytes(selectedAlbum.storageBytes)} ·{" "}
                    {formatDate(selectedAlbum.createdAt)}
                  </p>
                </div>
              </div>

              <div className="album-manage-row">
                <input
                  className="text-input"
                  disabled={selectedAlbum.isDefault}
                  onChange={(event) => setRenameAlbumName(event.target.value)}
                  type="text"
                  value={renameAlbumName}
                />
                <button
                  className="secondary-button"
                  disabled={selectedAlbum.isDefault || renameMutation.isPending}
                  onClick={handleRenameAlbum}
                  type="button"
                >
                  重命名
                </button>
                <button
                  className="danger-button"
                  disabled={selectedAlbum.isDefault || deleteMutation.isPending}
                  onClick={handleDeleteAlbum}
                  type="button"
                >
                  删除
                </button>
              </div>

              {isImagesError ? (
                <ErrorState
                  error={imagesError}
                  fallbackMessage="相册内图片加载失败，请稍后重试。"
                  fallbackTitle="暂时无法读取图片"
                  onRetry={() => void refetchImages()}
                  retryLabel="重新加载"
                  variant="notice"
                />
              ) : null}

              {isLoadingImages ? (
                <section className="gallery-grid" aria-label="相册图片加载中">
                  {Array.from({ length: 6 }).map((_, index) => (
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

              {!isLoadingImages && !isImagesError && images.length === 0 ? (
                <section className="empty-state compact-empty">
                  <div>
                    <p className="eyebrow">空相册</p>
                    <h2>这个相册还没有图片</h2>
                    <p>在图库页上传时选择该相册，图片会出现在这里。</p>
                  </div>
                </section>
              ) : null}

              {!isLoadingImages && !isImagesError && images.length > 0 ? (
                <>
                  <section className="gallery-grid album-image-grid" aria-label="相册内图片">
                    {images.map((image) => (
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
                          <PrivateAwareImage image={image} />
                        </div>
                        <div className="image-card-body">
                          <strong title={image.fileName}>{image.fileName}</strong>
                          <span>{formatDimensions(image)}</span>
                          <span>{formatDate(image.createdAt)}</span>
                        </div>
                      </button>
                    ))}
                  </section>

                  <nav className="pagination-bar" aria-label="相册图片分页">
                    <div className="pagination-summary">
                      <strong>
                        {totalPages !== undefined
                          ? `第 ${currentPage} / ${totalPages} 页`
                          : `第 ${currentPage} 页${hasNextPage ? "，还有更多" : ""}`}
                      </strong>
                      {imagePage?.total !== undefined ? <span>共 {imagePage.total} 张</span> : null}
                    </div>
                    <div className="pagination-actions">
                      <button
                        className="secondary-button"
                        disabled={!hasPreviousPage || isFetchingImages}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        type="button"
                      >
                        上一页
                      </button>
                      <button
                        className="secondary-button"
                        disabled={!hasNextPage || isFetchingImages}
                        onClick={() => setCurrentPage((page) => page + 1)}
                        type="button"
                      >
                        下一页
                      </button>
                    </div>
                  </nav>
                </>
              ) : null}
            </>
          ) : (
            <section className="empty-state compact-empty">
              <div>
                <p className="eyebrow">暂无相册</p>
                <h2>还没有可管理的相册</h2>
                <p>创建一个相册后，可以在这里查看并管理其中的图片。</p>
              </div>
            </section>
          )}
        </section>
      </section>
    </div>
  );
}
