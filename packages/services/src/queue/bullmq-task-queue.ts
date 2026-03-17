import type { Queue } from "bullmq";

import type { TaskQueue } from "@sweet-star/core";

export interface CreateBullMqTaskQueueOptions {
  queue: Pick<Queue, "add">;
}

export function createBullMqTaskQueue(
  options: CreateBullMqTaskQueueOptions,
): TaskQueue {
  return {
    async enqueue(input) {
      await options.queue.add(
        input.taskType,
        { taskId: input.taskId },
        { jobId: input.taskId },
      );
    },
  };
}
