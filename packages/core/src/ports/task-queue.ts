import type { TaskType } from "@sweet-star/shared";

export interface EnqueueTaskInput {
  taskId: string;
  queueName: string;
  taskType: TaskType;
}

export interface TaskQueue {
  enqueue(input: EnqueueTaskInput): Promise<void> | void;
}
