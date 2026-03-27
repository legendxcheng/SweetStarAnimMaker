import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  characterSheetGenerateQueueName,
  characterSheetsGenerateQueueName,
  frameImageGenerateQueueName,
  framePromptGenerateQueueName,
  imagesGenerateQueueName,
  masterPlotGenerateQueueName,
  segmentVideoGenerateQueueName,
  type CharacterSheetImageProvider,
  type CharacterSheetPromptProvider,
  type FramePromptProvider,
  type MasterPlotProvider,
  shotScriptGenerateQueueName,
  shotScriptSegmentGenerateQueueName,
  type ShotImageProvider,
  type ShotScriptProvider,
  storyboardGenerateQueueName,
  type StoryboardProvider,
  videosGenerateQueueName,
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
    processMasterPlotGenerateTask: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processStoryboardGenerateTask: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processShotScriptGenerateTask?: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processShotScriptSegmentGenerateTask?: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processCharacterSheetsGenerateTask: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processCharacterSheetGenerateTask: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processImagesGenerateTask?: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processVideosGenerateTask?: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processSegmentVideoGenerateTask?: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processFramePromptGenerateTask?: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    processFrameImageGenerateTask?: {
      execute(input: { taskId: string }): Promise<void> | void;
    };
    close?(): Promise<void> | void;
  };
  workspaceRoot?: string;
  redisUrl?: string;
  masterPlotProvider?: MasterPlotProvider;
  storyboardProvider?: StoryboardProvider;
  shotScriptProvider?: ShotScriptProvider;
  characterSheetPromptProvider?: CharacterSheetPromptProvider;
  characterSheetImageProvider?: CharacterSheetImageProvider;
  framePromptProvider?: FramePromptProvider;
  shotImageProvider?: ShotImageProvider;
  workerFactory?: (input: {
    queueName: string;
    concurrency: number;
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
      masterPlotProvider: options.masterPlotProvider,
      storyboardProvider: options.storyboardProvider,
      shotScriptProvider: options.shotScriptProvider,
      characterSheetPromptProvider: options.characterSheetPromptProvider,
      characterSheetImageProvider: options.characterSheetImageProvider,
      framePromptProvider: options.framePromptProvider,
      shotImageProvider: options.shotImageProvider,
    });
  const processors: Array<{
    queueName: string;
    concurrency: number;
    processor(job: WorkerJob): Promise<void>;
  }> = [
    {
      queueName: masterPlotGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await services.processMasterPlotGenerateTask.execute({
          taskId: job.data.taskId,
        });
      },
    },
    {
      queueName: storyboardGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await services.processStoryboardGenerateTask.execute({
          taskId: job.data.taskId,
        });
      },
    },
    {
      queueName: characterSheetsGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await services.processCharacterSheetsGenerateTask.execute({
          taskId: job.data.taskId,
        });
      },
    },
    {
      queueName: characterSheetGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await services.processCharacterSheetGenerateTask.execute({
          taskId: job.data.taskId,
        });
      },
    },
  ];

  const shotScriptTaskProcessor = services.processShotScriptGenerateTask;

  if (shotScriptTaskProcessor) {
    processors.splice(2, 0, {
      queueName: shotScriptGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await shotScriptTaskProcessor.execute({
          taskId: job.data.taskId,
        });
      },
    });
  }
  const shotScriptSegmentTaskProcessor = services.processShotScriptSegmentGenerateTask;

  if (shotScriptSegmentTaskProcessor) {
    processors.splice(3, 0, {
      queueName: shotScriptSegmentGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await shotScriptSegmentTaskProcessor.execute({
          taskId: job.data.taskId,
        });
      },
    });
  }
  const imagesTaskProcessor = services.processImagesGenerateTask;

  if (imagesTaskProcessor) {
    processors.push({
      queueName: imagesGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await imagesTaskProcessor.execute({
          taskId: job.data.taskId,
        });
      },
    });
  }
  const framePromptTaskProcessor = services.processFramePromptGenerateTask;

  if (framePromptTaskProcessor) {
    processors.push({
      queueName: framePromptGenerateQueueName,
      concurrency: 4,
      processor: async (job: WorkerJob) => {
        await framePromptTaskProcessor.execute({
          taskId: job.data.taskId,
        });
      },
    });
  }
  const frameImageTaskProcessor = services.processFrameImageGenerateTask;

  if (frameImageTaskProcessor) {
    processors.push({
      queueName: frameImageGenerateQueueName,
      concurrency: 4,
      processor: async (job: WorkerJob) => {
        await frameImageTaskProcessor.execute({
          taskId: job.data.taskId,
        });
      },
    });
  }
  const videosTaskProcessor = services.processVideosGenerateTask;

  if (videosTaskProcessor) {
    processors.push({
      queueName: videosGenerateQueueName,
      concurrency: 1,
      processor: async (job: WorkerJob) => {
        await videosTaskProcessor.execute({
          taskId: job.data.taskId,
        });
      },
    });
  }
  const segmentVideoTaskProcessor = services.processSegmentVideoGenerateTask;

  if (segmentVideoTaskProcessor) {
    processors.push({
      queueName: segmentVideoGenerateQueueName,
      concurrency: 10,
      processor: async (job: WorkerJob) => {
        await segmentVideoTaskProcessor.execute({
          taskId: job.data.taskId,
        });
      },
    });
  }
  const redisConnection = options.workerFactory
    ? null
    : new IORedis(options.redisUrl ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
        maxRetriesPerRequest: null,
      });
  const workers = await Promise.all(
    processors.map(async ({ queueName, concurrency, processor }) => {
      return (
        (await options.workerFactory?.({
          queueName,
          concurrency,
          processor,
        })) ??
        createBullMqWorker({
          connection: redisConnection!,
          queueName,
          concurrency,
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
  concurrency: number;
  processor(job: WorkerJob): Promise<void>;
}): WorkerInstance {
  const worker = new Worker(input.queueName, input.processor, {
    connection: input.connection,
    concurrency: input.concurrency,
  });

  return {
    async close() {
      await worker.close();
    },
  };
}


