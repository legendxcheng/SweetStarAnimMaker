import { describe, expect, it } from "vitest";

import { createTaskRecord, storyboardGenerateQueueName } from "../src/index";

describe("task domain", () => {
  it("derives master-plot task storage and queue metadata", () => {
    const task = createTaskRecord({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
      type: "master_plot_generate",
      queueName: "master-plot-generate",
      createdAt: "2026-03-17T12:00:00.000Z",
    });

    expect(task.storageDir).toBe(
      "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
    );
    expect(task.inputRelPath).toBe("tasks/task_20260317_ab12cd/input.json");
    expect(task.outputRelPath).toBe("tasks/task_20260317_ab12cd/output.json");
    expect(task.logRelPath).toBe("tasks/task_20260317_ab12cd/log.txt");
    expect(task.type).toBe("master_plot_generate");
    expect(task.queueName).toBe("master-plot-generate");
  });

  it("derives storyboard task storage and queue metadata", () => {
    const task = createTaskRecord({
      id: "task_20260321_ab12cd",
      projectId: "proj_20260321_ab12cd",
      projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
      type: "storyboard_generate",
      queueName: storyboardGenerateQueueName,
      createdAt: "2026-03-21T12:00:00.000Z",
    });

    expect(task.storageDir).toBe(
      "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_ab12cd",
    );
    expect(task.type).toBe("storyboard_generate");
    expect(task.queueName).toBe("storyboard-generate");
  });
});
