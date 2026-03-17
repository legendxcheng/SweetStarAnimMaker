import { describe, expect, it } from "vitest";
import {
  createStoryboardGenerateTaskResponseSchema,
  taskDetailResponseSchema,
} from "../src/schemas/task-api";

describe("task api schema", () => {
  it("accepts a storyboard task response", () => {
    const parsed = createStoryboardGenerateTaskResponseSchema.parse({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "storyboard_generate",
      status: "pending",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260317_ab12cd/input.json",
        outputPath: "tasks/task_20260317_ab12cd/output.json",
        logPath: "tasks/task_20260317_ab12cd/log.txt",
      },
    });

    expect(parsed.status).toBe("pending");
  });

  it("accepts a task detail response", () => {
    const parsed = taskDetailResponseSchema.parse({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "storyboard_generate",
      status: "succeeded",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:03:00.000Z",
      startedAt: "2026-03-17T12:01:00.000Z",
      finishedAt: "2026-03-17T12:03:00.000Z",
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260317_ab12cd/input.json",
        outputPath: "tasks/task_20260317_ab12cd/output.json",
        logPath: "tasks/task_20260317_ab12cd/log.txt",
      },
    });

    expect(parsed.finishedAt).toBe("2026-03-17T12:03:00.000Z");
  });
});
