import { describe, expect, it, vi } from "vitest";

import { startWorker } from "../src/index";

describe("storyboard worker integration", () => {
  it("routes queued task ids into the process use case", async () => {
    const processStoryboardGenerateTask = {
      execute: vi.fn(),
    };
    const close = vi.fn();
    const workerFactory = vi.fn(({ processor }) => ({
      processor,
      close,
    }));

    const worker = await startWorker({
      services: {
        processStoryboardGenerateTask,
      },
      workerFactory,
    });

    const createdWorker = workerFactory.mock.results[0]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };

    await createdWorker.processor({
      data: {
        taskId: "task_20260317_ab12cd",
      },
    });

    expect(processStoryboardGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
    });

    await worker.close();

    expect(close).toHaveBeenCalled();
  });
});
