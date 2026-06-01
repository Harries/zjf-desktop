import { create } from "zustand";

import type { RemoteImage } from "../types/image";
import type { UploadTask } from "../types/upload";

type AddUploadTaskInput = {
  id?: string;
  fileName: string;
  sourcePath?: string;
  sizeBytes: number;
};

type UploadQueueState = {
  tasks: UploadTask[];
  addTask: (input: AddUploadTaskInput) => string;
  setTaskSourcePath: (taskId: string, sourcePath: string) => void;
  updateProgress: (taskId: string, progress: number) => void;
  markUploading: (taskId: string) => void;
  markSuccess: (taskId: string, image: RemoteImage) => void;
  markFailed: (taskId: string, errorMessage: string) => void;
  retryTask: (taskId: string) => void;
  clearCompleted: () => void;
  removeTask: (taskId: string) => void;
};

function createTaskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function clampProgress(progress: number) {
  if (Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export const useUploadQueueStore = create<UploadQueueState>((set) => ({
  tasks: [],

  addTask: (input) => {
    const timestamp = nowIso();
    const taskId = input.id ?? createTaskId();

    set((state) => ({
      tasks: [
        {
          id: taskId,
          fileName: input.fileName,
          sourcePath: input.sourcePath,
          sizeBytes: input.sizeBytes,
          status: "queued",
          progress: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ...state.tasks,
      ],
    }));

    return taskId;
  },

  setTaskSourcePath: (taskId, sourcePath) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              sourcePath,
              updatedAt: nowIso(),
            }
          : task,
      ),
    }));
  },

  updateProgress: (taskId, progress) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              progress: clampProgress(progress),
              updatedAt: nowIso(),
            }
          : task,
      ),
    }));
  },

  markUploading: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "uploading",
              progress: task.progress > 0 ? task.progress : 1,
              errorMessage: undefined,
              updatedAt: nowIso(),
            }
          : task,
      ),
    }));
  },

  markSuccess: (taskId, image) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "success",
              progress: 100,
              image,
              errorMessage: undefined,
              updatedAt: nowIso(),
            }
          : task,
      ),
    }));
  },

  markFailed: (taskId, errorMessage) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "failed",
              errorMessage,
              updatedAt: nowIso(),
            }
          : task,
      ),
    }));
  },

  retryTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: "queued",
              progress: 0,
              errorMessage: undefined,
              updatedAt: nowIso(),
            }
          : task,
      ),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== "success"),
    }));
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    }));
  },
}));
