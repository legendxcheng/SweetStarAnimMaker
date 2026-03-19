import { Worker } from "bullmq";
import IORedis from "ioredis";
import type { MasterPlotProvider } from "@sweet-star/core";

import { buildSpec2WorkerServices } from "./bootstrap/build-spec2-worker-services";

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
    close?(): Promise<void> | void;
  };
  workspaceRoot?: string;
  redisUrl?: string;
  masterPlotProvider?: MasterPlotProvider;
  workerFactory?: (input: {
    queueName: string;
    processor(job: WorkerJob): Promise<void>;
  }) => Promise<WorkerInstance> | WorkerInstance;
}

export async function startWorker(
  options: StartWorkerOptions = {},
): Promise<StartWorkerResult> {
  const services =
    options.services ??
    buildSpec2WorkerServices({
      workspaceRoot: options.workspaceRoot ?? process.cwd(),
      masterPlotProvider: options.masterPlotProvider,
    });
  const processor = async (job: WorkerJob) => {
    await services.processStoryboardGenerateTask.execute({
      taskId: job.data.taskId,
    });
  };
  const redisConnection = options.workerFactory
    ? null
    : new IORedis(options.redisUrl ?? process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
        maxRetriesPerRequest: null,
      });
  const worker =
    (await options.workerFactory?.({
      queueName: "master-plot-generate",
      processor,
    })) ??
    createBullMqWorker({
      connection: redisConnection!,
      processor,
    });

  return {
    async close() {
      await worker.close();
      await redisConnection?.quit();
      await services.close?.();
    },
  };
}

function createBullMqWorker(input: {
  connection: IORedis;
  processor(job: WorkerJob): Promise<void>;
}): WorkerInstance {
  const worker = new Worker("master-plot-generate", input.processor, {
    connection: input.connection,
  });

  return {
    async close() {
      await worker.close();
    },
  };
}
