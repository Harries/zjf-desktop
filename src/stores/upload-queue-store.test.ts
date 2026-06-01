import { beforeEach, describe, expect, it } from "vitest";

import type { RemoteImage } from "../types/image";
import { useUploadQueueStore } from "./upload-queue-store";

const uploadedImage: RemoteImage = {
  id: "image-001",
  fileName: "done.png",
  url: "https://zjf.ai/i/done.png",
};

beforeEach(() => {
  useUploadQueueStore.setState({ tasks: [] });
});

describe("useUploadQueueStore", () => {
  it("adds a queued upload task", () => {
    const id = useUploadQueueStore.getState().addTask({
      id: "task-001",
      fileName: "cover.png",
      sizeBytes: 1024,
    });

    expect(id).toBe("task-001");
    expect(useUploadQueueStore.getState().tasks).toMatchObject([
      {
        id: "task-001",
        fileName: "cover.png",
        sizeBytes: 1024,
        status: "queued",
        progress: 0,
      },
    ]);
  });

  it("updates one task without affecting another task", () => {
    const store = useUploadQueueStore.getState();
    store.addTask({ id: "task-001", fileName: "a.png", sizeBytes: 100 });
    store.addTask({ id: "task-002", fileName: "b.png", sizeBytes: 200 });

    useUploadQueueStore.getState().markUploading("task-001");
    useUploadQueueStore.getState().updateProgress("task-001", 48);

    expect(useUploadQueueStore.getState().tasks).toMatchObject([
      { id: "task-002", status: "queued", progress: 0 },
      { id: "task-001", status: "uploading", progress: 48 },
    ]);
  });

  it("keeps the error reason on failed tasks", () => {
    const store = useUploadQueueStore.getState();
    store.addTask({ id: "task-001", fileName: "a.png", sizeBytes: 100 });

    useUploadQueueStore.getState().markFailed("task-001", "文件类型不支持");

    expect(useUploadQueueStore.getState().tasks[0]).toMatchObject({
      id: "task-001",
      status: "failed",
      errorMessage: "文件类型不支持",
    });
  });

  it("stores a source path after a pasted image is saved", () => {
    const store = useUploadQueueStore.getState();
    store.addTask({ id: "task-001", fileName: "pasted.png", sizeBytes: 100 });

    useUploadQueueStore.getState().setTaskSourcePath("task-001", "/tmp/pasted.png");

    expect(useUploadQueueStore.getState().tasks[0]).toMatchObject({
      id: "task-001",
      sourcePath: "/tmp/pasted.png",
    });
  });

  it("retries failed tasks from the queued state", () => {
    const store = useUploadQueueStore.getState();
    store.addTask({ id: "task-001", fileName: "a.png", sizeBytes: 100 });
    store.markFailed("task-001", "网络失败");

    useUploadQueueStore.getState().retryTask("task-001");

    expect(useUploadQueueStore.getState().tasks[0]).toMatchObject({
      id: "task-001",
      status: "queued",
      progress: 0,
      errorMessage: undefined,
    });
  });

  it("clears only completed tasks", () => {
    const store = useUploadQueueStore.getState();
    store.addTask({ id: "task-001", fileName: "done.png", sizeBytes: 100 });
    store.addTask({ id: "task-002", fileName: "failed.png", sizeBytes: 200 });
    store.markSuccess("task-001", uploadedImage);
    store.markFailed("task-002", "网络失败");

    useUploadQueueStore.getState().clearCompleted();

    expect(useUploadQueueStore.getState().tasks).toMatchObject([
      { id: "task-002", status: "failed" },
    ]);
  });
});
