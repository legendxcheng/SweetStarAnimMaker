import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("task api schema", () => {
  it("exports a master-plot task response schema", () => {
    const schema = (shared as Record<string, unknown>).createMasterPlotGenerateTaskResponseSchema;

    expect(schema).toBeDefined();
  });

  it("accepts a master-plot task response", () => {
    const schema = (shared as Record<string, { parse: (value: unknown) => unknown }>).createMasterPlotGenerateTaskResponseSchema;
    const parsed = schema.parse({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "master_plot_generate",
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
    const parsed = shared.taskDetailResponseSchema.parse({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "master_plot_generate",
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
