import { describe, expect, it } from "vitest";

import { createTaskRecord } from "../src/index";

describe("task domain", () => {
  it("derives the task storage directory from project storage", () => {
    const task = createTaskRecord({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
      type: "storyboard_generate",
      queueName: "storyboard-generate",
      createdAt: "2026-03-17T12:00:00.000Z",
    });

    expect(task.storageDir).toBe(
      "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
    );
    expect(task.inputRelPath).toBe("tasks/task_20260317_ab12cd/input.json");
    expect(task.outputRelPath).toBe("tasks/task_20260317_ab12cd/output.json");
    expect(task.logRelPath).toBe("tasks/task_20260317_ab12cd/log.txt");
  });
});
