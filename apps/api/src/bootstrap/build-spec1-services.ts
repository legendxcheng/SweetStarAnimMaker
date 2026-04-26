import type { TaskIdGenerator, TaskQueue, VideoPromptProvider } from "@sweet-star/core";

import { createSpec1Infrastructure } from "./spec1-infrastructure";
import { createSpec1TaskQueue } from "./spec1-task-queue";
import { createSpec1UseCases } from "./spec1-use-cases";

export interface BuildSpec1ServicesOptions {
  workspaceRoot: string;
  taskQueue?: TaskQueue;
  taskIdGenerator?: TaskIdGenerator;
  redisUrl?: string;
  videoPromptProvider?: VideoPromptProvider;
}

export function buildSpec1Services(options: BuildSpec1ServicesOptions) {
  const infrastructure = createSpec1Infrastructure({
    workspaceRoot: options.workspaceRoot,
    videoPromptProvider: options.videoPromptProvider,
  });
  const taskQueue = createSpec1TaskQueue({
    taskQueue: options.taskQueue,
    taskIdGenerator: options.taskIdGenerator,
    redisUrl: options.redisUrl,
  });
  const useCases = createSpec1UseCases({
    infrastructure,
    taskQueue,
  });

  return {
    db: infrastructure.db,
    async close() {
      await taskQueue.close();
      infrastructure.db.close();
    },
    ...useCases,
  };
}
