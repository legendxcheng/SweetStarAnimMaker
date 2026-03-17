import type { Spec2WorkerServices } from "./bootstrap/build-spec2-worker-services";

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
  services?: Spec2WorkerServices;
  workerFactory?: (input: {
    queueName: string;
    processor(job: WorkerJob): Promise<void>;
  }) => Promise<WorkerInstance> | WorkerInstance;
}

export async function startWorker(
  options: StartWorkerOptions = {},
): Promise<StartWorkerResult> {
  const processor = async (job: WorkerJob) => {
    await options.services?.processStoryboardGenerateTask.execute({
      taskId: job.data.taskId,
    });
  };
  const worker =
    (await options.workerFactory?.({
      queueName: "storyboard-generate",
      processor,
    })) ?? {
      async close() {},
    };

  return {
    async close() {
      await worker.close();
    },
  };
}
