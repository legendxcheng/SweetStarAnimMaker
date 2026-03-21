import { describe, expect, it, vi } from "vitest";

import { createBullMqTaskQueue } from "../src/index";

describe("bullmq task queue", () => {
  it("enqueues the master-plot task with a stable job id", async () => {
    const queue = {
      add: vi.fn(),
    };
    const taskQueue = createBullMqTaskQueue({
      queue,
    });

    await taskQueue.enqueue({
      taskId: "task_20260317_ab12cd",
      queueName: "master-plot-generate",
      taskType: "master_plot_generate",
    });

    expect(queue.add).toHaveBeenCalledWith(
      "master_plot_generate",
      { taskId: "task_20260317_ab12cd" },
      { jobId: "task_20260317_ab12cd" },
    );
  });
});
