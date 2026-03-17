import type { TaskStatus } from "../constants/task-status";
import type { TaskType } from "../constants/task-type";

export interface TaskFileMetadata {
  inputPath: string;
  outputPath: string;
  logPath: string;
}

export interface TaskDetail {
  id: string;
  projectId: string;
  type: TaskType;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  files: TaskFileMetadata;
}
