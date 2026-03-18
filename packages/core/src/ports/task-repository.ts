import type { TaskRecord } from "../domain/task";

export interface MarkTaskRunningInput {
  taskId: string;
  updatedAt: string;
  startedAt: string;
}

export interface MarkTaskSucceededInput {
  taskId: string;
  updatedAt: string;
  finishedAt: string;
}

export interface MarkTaskFailedInput {
  taskId: string;
  errorMessage: string;
  updatedAt: string;
  finishedAt: string;
}

export interface TaskRepository {
  insert(task: TaskRecord): Promise<void> | void;
  findById(taskId: string): Promise<TaskRecord | null> | TaskRecord | null;
  findLatestByProjectId(
    projectId: string,
    taskType?: TaskRecord["type"],
  ): Promise<TaskRecord | null> | TaskRecord | null;
  delete(taskId: string): Promise<void> | void;
  markRunning(input: MarkTaskRunningInput): Promise<void> | void;
  markSucceeded(input: MarkTaskSucceededInput): Promise<void> | void;
  markFailed(input: MarkTaskFailedInput): Promise<void> | void;
}
