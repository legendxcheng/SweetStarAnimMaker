import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("task api schema", () => {
  it("exposes the character-sheet task types", () => {
    expect(shared.taskTypes).toEqual([
      "master_plot_generate",
      "character_sheets_generate",
      "character_sheet_generate",
      "storyboard_generate",
      "shot_script_generate",
      "shot_script_segment_generate",
    ]);
  });

  it("exports a master-plot task response schema", () => {
    const schema = shared.createMasterPlotGenerateTaskResponseSchema;

    expect(schema).toBeDefined();
  });

  it("exports a storyboard task response schema", () => {
    const schema = shared.createStoryboardGenerateTaskResponseSchema;

    expect(schema).toBeDefined();
  });

  it("exports a character-sheet task response schema", () => {
    const schema = shared.createCharacterSheetsGenerateTaskResponseSchema;

    expect(schema).toBeDefined();
  });

  it("exports a shot-script task response schema", () => {
    const schema = shared.createShotScriptGenerateTaskResponseSchema;

    expect(schema).toBeDefined();
  });

  it("accepts a master-plot task response", () => {
    const parsed = shared.createMasterPlotGenerateTaskResponseSchema.parse({
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

  it("accepts a storyboard generation task detail response", () => {
    const parsed = shared.taskDetailResponseSchema.parse({
      id: "task_20260321_ab12cd",
      projectId: "proj_20260321_ab12cd",
      type: "storyboard_generate",
      status: "succeeded",
      createdAt: "2026-03-21T12:00:00.000Z",
      updatedAt: "2026-03-21T12:03:00.000Z",
      startedAt: "2026-03-21T12:01:00.000Z",
      finishedAt: "2026-03-21T12:03:00.000Z",
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260321_ab12cd/input.json",
        outputPath: "tasks/task_20260321_ab12cd/output.json",
        logPath: "tasks/task_20260321_ab12cd/log.txt",
      },
    });

    expect(parsed.type).toBe("storyboard_generate");
  });

  it("accepts a character-sheet generation task detail response", () => {
    const parsed = shared.taskDetailResponseSchema.parse({
      id: "task_20260321_char1",
      projectId: "proj_20260321_ab12cd",
      type: "character_sheet_generate",
      status: "succeeded",
      createdAt: "2026-03-21T12:10:00.000Z",
      updatedAt: "2026-03-21T12:12:00.000Z",
      startedAt: "2026-03-21T12:10:05.000Z",
      finishedAt: "2026-03-21T12:12:00.000Z",
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260321_char1/input.json",
        outputPath: "tasks/task_20260321_char1/output.json",
        logPath: "tasks/task_20260321_char1/log.txt",
      },
    });

    expect(parsed.type).toBe("character_sheet_generate");
  });

  it("accepts a shot-script generation task detail response", () => {
    const parsed = shared.taskDetailResponseSchema.parse({
      id: "task_20260322_shot",
      projectId: "proj_20260322_ab12cd",
      type: "shot_script_generate",
      status: "succeeded",
      createdAt: "2026-03-22T12:10:00.000Z",
      updatedAt: "2026-03-22T12:12:00.000Z",
      startedAt: "2026-03-22T12:10:05.000Z",
      finishedAt: "2026-03-22T12:12:00.000Z",
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260322_shot/input.json",
        outputPath: "tasks/task_20260322_shot/output.json",
        logPath: "tasks/task_20260322_shot/log.txt",
      },
    });

    expect(parsed.type).toBe("shot_script_generate");
  });

  it("accepts a shot-script-segment generation task detail response", () => {
    const parsed = shared.taskDetailResponseSchema.parse({
      id: "task_20260323_shot_segment_1",
      projectId: "proj_20260323_ab12cd",
      type: "shot_script_segment_generate",
      status: "pending",
      createdAt: "2026-03-23T12:10:00.000Z",
      updatedAt: "2026-03-23T12:10:00.000Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260323_shot_segment_1/input.json",
        outputPath: "tasks/task_20260323_shot_segment_1/output.json",
        logPath: "tasks/task_20260323_shot_segment_1/log.txt",
      },
    });

    expect(parsed.type).toBe("shot_script_segment_generate");
  });

});
