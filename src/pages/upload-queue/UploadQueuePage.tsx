import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { uploadImage } from "../../api/desktop-commands";
import type { UploadTask, UploadTaskStatus } from "../../types/upload";
import { useUploadQueueStore } from "../../stores/upload-queue-store";
import { autoCopyUploadedImage } from "../../utils/auto-copy-upload";
import { toUserErrorMessage } from "../../utils/user-error";

const statusLabel: Record<UploadTaskStatus, string> = {
  queued: "等待中",
  uploading: "上传中",
  success: "已完成",
  failed: "失败",
};

function formatBytes(bytes: number) {
  if (bytes <= 0) return "未知大小";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getTaskMeta(task: UploadTask) {
  if (task.status === "success" && task.image?.url) return task.image.url;
  if (task.errorMessage) return task.errorMessage;
  return task.sourcePath ?? "准备上传";
}

export function UploadQueuePage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string>();
  const tasks = useUploadQueueStore((state) => state.tasks);
  const clearCompleted = useUploadQueueStore((state) => state.clearCompleted);
  const markUploading = useUploadQueueStore((state) => state.markUploading);
  const updateProgress = useUploadQueueStore((state) => state.updateProgress);
  const markSuccess = useUploadQueueStore((state) => state.markSuccess);
  const markFailed = useUploadQueueStore((state) => state.markFailed);
  const retryTask = useUploadQueueStore((state) => state.retryTask);
  const completedCount = tasks.filter((task) => task.status === "success").length;

  const retryUpload = async (task: UploadTask) => {
    setNotice(undefined);
    retryTask(task.id);

    if (!task.sourcePath) {
      markFailed(task.id, "缺少本地文件路径，请重新选择图片上传。");
      return;
    }

    markUploading(task.id);
    updateProgress(task.id, 35);

    try {
      const uploaded = await uploadImage(task.sourcePath, task.fileName);
      markSuccess(task.id, uploaded);
      queryClient.setQueryData(["image", uploaded.id], uploaded);
      void queryClient.invalidateQueries({ queryKey: ["images"] });
      const copied = await autoCopyUploadedImage(uploaded);
      setNotice(copied ? "重试上传成功，已自动复制链接。" : "重试上传成功。");
    } catch (error) {
      markFailed(task.id, toUserErrorMessage(error, "上传失败，请稍后重试。"));
    }
  };

  return (
    <div className="upload-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">上传队列</p>
          <h1>批量上传状态</h1>
          <p className="intro">查看等待、上传中、完成和失败任务，并处理需要重试的图片。</p>
        </div>

        <div className="page-actions">
          <button
            className="secondary-button"
            disabled={completedCount === 0}
            onClick={clearCompleted}
            type="button"
          >
            清除完成
          </button>
        </div>
      </header>

      {notice ? <div className="notice ok">{notice}</div> : null}

      {tasks.length === 0 ? (
        <section className="empty-state">
          <div>
            <p className="eyebrow">暂无任务</p>
            <h2>上传队列是空的</h2>
            <p>从图库页选择、拖拽或粘贴图片后，任务会出现在这里。</p>
          </div>
        </section>
      ) : (
        <section className="upload-list" aria-label="上传任务列表">
          {tasks.map((task) => (
            <article className="upload-item" key={task.id}>
              <div className="upload-item-main">
                <div className="upload-item-title">
                  <strong title={task.fileName}>{task.fileName}</strong>
                  <span className={`status-pill ${task.status}`}>{statusLabel[task.status]}</span>
                </div>
                <p>{getTaskMeta(task)}</p>
                <div className="progress-track" aria-label={`${task.fileName} 上传进度`}>
                  <span style={{ width: `${task.progress}%` }} />
                </div>
              </div>

              <div className="upload-item-side">
                <span>{formatBytes(task.sizeBytes)}</span>
                {task.status === "failed" ? (
                  <button
                    className="secondary-button"
                    onClick={() => void retryUpload(task)}
                    type="button"
                  >
                    重试
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
