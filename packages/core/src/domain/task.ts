import { type TaskStatus, type TaskType } from "@sweet-star/shared";

export const storyboardGenerateQueueName = "storyboard-generate";
export const taskArtifactsDirectoryName = "tasks";
export const taskInputFileName = "input.json";
export const taskOutputFileName = "output.json";
export const taskLogFileName = "log.txt";

export interface TaskRecord {
  id: string;
  projectId: string;
  type: TaskType;
  status: TaskStatus;
  queueName: string;
  storageDir: string;
  inputRelPath: string;
  outputRelPath: string;
  logRelPath: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface StoryboardGenerateTaskInput {
  taskId: string;
  projectId: string;
  taskType: "storyboard_generate";
  scriptPath: string;
  scriptUpdatedAt: string;
}

export interface CreateTaskRecordInput {
  id: string;
  projectId: string;
  projectStorageDir: string;
  type: TaskType;
  queueName: string;
  createdAt: string;
  updatedAt?: string;
  status?: TaskStatus;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export function toTaskStorageDir(projectStorageDir: string, taskId: string) {
  return `${projectStorageDir}/${taskArtifactsDirectoryName}/${taskId}`;
}

export function toTaskInputRelPath(taskId: string) {
  return `${taskArtifactsDirectoryName}/${taskId}/${taskInputFileName}`;
}

export function toTaskOutputRelPath(taskId: string) {
  return `${taskArtifactsDirectoryName}/${taskId}/${taskOutputFileName}`;
}

export function toTaskLogRelPath(taskId: string) {
  return `${taskArtifactsDirectoryName}/${taskId}/${taskLogFileName}`;
}

export function createTaskRecord(input: CreateTaskRecordInput): TaskRecord {
  return {
    id: input.id,
    projectId: input.projectId,
    type: input.type,
    status: input.status ?? "pending",
    queueName: input.queueName,
    storageDir: toTaskStorageDir(input.projectStorageDir, input.id),
    inputRelPath: toTaskInputRelPath(input.id),
    outputRelPath: toTaskOutputRelPath(input.id),
    logRelPath: toTaskLogRelPath(input.id),
    errorMessage: input.errorMessage ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
    startedAt: input.startedAt ?? null,
    finishedAt: input.finishedAt ?? null,
  };
}
