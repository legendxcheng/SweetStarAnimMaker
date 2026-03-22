import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  characterSheetGenerateQueueName,
  characterSheetsGenerateQueueName,
  type CharacterSheetImageProvider,
  type CharacterSheetPromptProvider,
  storyboardGenerateQueueName,
  type StoryboardProvider,
} from "@sweet-star/core";

import { buildSpec2WorkerServices } from "./bootstrap/build-spec2-worker-services";
// @ts-expect-error runtime env loader lives outside this app tsconfig root
import { loadRootEnv } from "../../../tooling/env/load-env.mjs";

export interface WorkerJob {
  data: {
    taskId: string;
  };
}

export interface WorkerInstance {
  close(): Promise<void> | void;
}

export interface StartWorkerResult {
  close(): Promise<void>;
}

export interface StartWorkerOptions {
  services?: {
    processStoryboardGenerateTask: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processCharacterSheetsGenerateTask: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processCharacterSheetGenerateTask: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    close?(): Promise<void> | void;
  };
  workspaceRoot?: string;
  redisUrl?: string;
  storyboardProvider?: StoryboardProvider;
  characterSheetPromptProvider?: CharacterSheetPromptProvider;
  characterSheetImageProvider?: CharacterSheetImageProvider;
  workerFactory?: (input: {
    queueName: string;
    processor(job: WorkerJob): Promise<void>;
  }) => Promise<WorkerInstance> | WorkerInstance;
}

export async function startWorker(
  options: StartWorkerOptions = {},
): Promise<StartWorkerResult> {
  loadRootEnv();
  const services =
    options.services ??
    buildSpec2WorkerServices({
      workspaceRoot: options.workspaceRoot ?? process.cwd(),
      redisUrl: options.redisUrl,
      storyboardProvider: options.storyboardProvider,
      characterSheetPromptProvider: options.characterSheetPromptProvider,
      characterSheetImageProvider: options.characterSheetImageProvider,
    });
  const processors: Array<{
    queueName: string;
    processor(job: WorkerJob): Promise<void>;
  }> = [
    {
      queueName: storyboardGenerateQueueName,
      processor: async (job: WorkerJob) => {
        await services.processStoryboardGenerateTask.execute({
          taskId: job.data.taskId,
        });
      },
    },
    {
      queueName: characterSheetsGenerateQueueName,
      processor: async (job: WorkerJob) => {
        await services.processCharacterSheetsGenerateTask.execute({
          taskId: job.data.taskId,
        });
      },
    },
    {
      queueName: characterSheetGenerateQueueName,
      processor: async (job: WorkerJob) => {
        await services.processCharacterSheetGenerateTask.execute({
          taskId: job.data.taskId,
        });
      },
    },
  ];
  const redisConnection = options.workerFactory
    ? null
    : new IORedis(options.redisUrl ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
        maxRetriesPerRequest: null,
      });
  const workers = await Promise.all(
    processors.map(async ({ queueName, processor }) => {
      return (
        (await options.workerFactory?.({
          queueName,
          processor,
        })) ??
        createBullMqWorker({
          connection: redisConnection!,
          queueName,
          processor,
        })
      );
    }),
  );

  return {
    async close() {
      await Promise.all(workers.map((worker) => worker.close()));
      await redisConnection?.quit();
      await services.close?.();
    },
  };
}

function createBullMqWorker(input: {
  connection: IORedis;
  queueName: string;
  processor(job: WorkerJob): Promise<void>;
}): WorkerInstance {
  const worker = new Worker(input.queueName, input.processor, {
    connection: input.connection,
  });

  return {
    async close() {
      await worker.close();
    },
  };
}
