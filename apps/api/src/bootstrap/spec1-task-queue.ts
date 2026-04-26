import crypto from "node:crypto";

import type { TaskIdGenerator, TaskQueue } from "@sweet-star/core";
import { createBullMqTaskQueue } from "@sweet-star/services";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export interface Spec1TaskQueueOptions {
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
}

export function createSpec1TaskQueue(options: Spec1TaskQueueOptions) {
  let redisConnection: IORedis | null = null;
  const bullMqQueues = new Map<string, Queue>();
  const bullMqTaskQueues = new Map<string, TaskQueue>();
  const injectedTaskQueue: TaskQueue | null = options.taskQueue ?? null;
  const taskIdGenerator =
    options.taskIdGenerator ??
    ({
      generateTaskId: () => {
        const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const randomPart = crypto.randomBytes(3).toString("hex");

        return `task_${datePart}_${randomPart}`;
      },
    } satisfies TaskIdGenerator);

  function getTaskQueue(queueName: string) {
    if (injectedTaskQueue) {
      return injectedTaskQueue;
    }

    if (!redisConnection) {
      redisConnection = new IORedis(
        options.redisUrl ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        {
          maxRetriesPerRequest: null,
        },
      );
    }

    const existingTaskQueue = bullMqTaskQueues.get(queueName);

    if (existingTaskQueue) {
      return existingTaskQueue;
    }

    const queue = new Queue(queueName, {
      connection: redisConnection,
    });
    const mappedTaskQueue = createBullMqTaskQueue({
      queue,
    });
    bullMqQueues.set(queueName, queue);
    bullMqTaskQueues.set(queueName, mappedTaskQueue);

    return mappedTaskQueue;
  }

  const queuedTaskGateway: TaskQueue = {
    enqueue(input) {
      return getTaskQueue(input.queueName).enqueue(input);
    },
  };

  return {
    taskQueue: queuedTaskGateway,
    taskIdGenerator,
    async close() {
      await Promise.all(Array.from(bullMqQueues.values()).map((queue) => queue.close()));
      await redisConnection?.quit();
    },
  };
}

export type Spec1TaskQueue = ReturnType<typeof createSpec1TaskQueue>;
