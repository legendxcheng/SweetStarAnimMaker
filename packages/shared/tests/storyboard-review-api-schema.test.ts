import { describe, expect, it } from "vitest";

import {
  approveStoryboardRequestSchema,
  rejectStoryboardRequestSchema,
  saveHumanStoryboardVersionRequestSchema,
  storyboardReviewSummarySchema,
  storyboardReviewWorkspaceResponseSchema,
} from "../src/index";

describe("storyboard review api schema", () => {
  it("accepts an approve request payload", () => {
    const parsed = approveStoryboardRequestSchema.parse({
      storyboardVersionId: "sbv_20260318_ab12cd",
      note: "Looks good.",
    });

    expect(parsed.storyboardVersionId).toBe("sbv_20260318_ab12cd");
    expect(parsed.note).toBe("Looks good.");
  });

  it("accepts a reject request payload", () => {
    const parsed = rejectStoryboardRequestSchema.parse({
      storyboardVersionId: "sbv_20260318_ab12cd",
      reason: "Need stronger scene transitions.",
      nextAction: "regenerate",
    });

    expect(parsed.nextAction).toBe("regenerate");
  });

  it("accepts a save-human-version request payload", () => {
    const parsed = saveHumanStoryboardVersionRequestSchema.parse({
      baseVersionId: "sbv_20260318_ab12cd",
      summary: "Updated storyboard summary.",
      scenes: [
        {
          id: "scene_1",
          sceneIndex: 1,
          description: "A revised opening beat.",
          camera: "wide shot",
          characters: ["A"],
          prompt: "wide shot of character A in a bright studio",
        },
      ],
    });

    expect(parsed.scenes).toHaveLength(1);
  });

  it("accepts a latest review summary", () => {
    const parsed = storyboardReviewSummarySchema.parse({
      id: "sbr_20260318_ab12cd",
      projectId: "proj_20260318_ab12cd",
      storyboardVersionId: "sbv_20260318_ab12cd",
      action: "reject",
      reason: "Need stronger visual continuity.",
      triggeredTaskId: "task_20260318_ab12cd",
      createdAt: "2026-03-18T12:00:00.000Z",
    });

    expect(parsed.action).toBe("reject");
    expect(parsed.triggeredTaskId).toBe("task_20260318_ab12cd");
  });

  it("accepts a storyboard review workspace response", () => {
    const parsed = storyboardReviewWorkspaceResponseSchema.parse({
      projectId: "proj_20260318_ab12cd",
      projectStatus: "storyboard_in_review",
      currentStoryboard: {
        id: "sbv_20260318_ab12cd",
        projectId: "proj_20260318_ab12cd",
        versionNumber: 2,
        kind: "human",
        provider: "manual",
        model: "manual-edit",
        filePath: "storyboards/versions/v2-human.json",
        createdAt: "2026-03-18T12:00:00.000Z",
        sourceTaskId: "task_20260318_ab12cd",
        summary: "Updated storyboard summary.",
        scenes: [
          {
            id: "scene_1",
            sceneIndex: 1,
            description: "A revised opening beat.",
            camera: "wide shot",
            characters: ["A"],
            prompt: "wide shot of character A in a bright studio",
          },
        ],
      },
      latestReview: {
        id: "sbr_20260318_ab12cd",
        projectId: "proj_20260318_ab12cd",
        storyboardVersionId: "sbv_20260318_ab12cd",
        action: "approve",
        reason: "Final approved version.",
        triggeredTaskId: null,
        createdAt: "2026-03-18T13:00:00.000Z",
      },
      availableActions: {
        saveHumanVersion: true,
        approve: true,
        reject: true,
      },
      latestStoryboardTask: {
        id: "task_20260318_ab12cd",
        projectId: "proj_20260318_ab12cd",
        type: "storyboard_generate",
        status: "succeeded",
        createdAt: "2026-03-18T11:55:00.000Z",
        updatedAt: "2026-03-18T12:00:00.000Z",
        startedAt: "2026-03-18T11:56:00.000Z",
        finishedAt: "2026-03-18T12:00:00.000Z",
        errorMessage: null,
        files: {
          inputPath: "tasks/task_20260318_ab12cd/input.json",
          outputPath: "tasks/task_20260318_ab12cd/output.json",
          logPath: "tasks/task_20260318_ab12cd/log.txt",
        },
      },
    });

    expect(parsed.projectStatus).toBe("storyboard_in_review");
    expect(parsed.currentStoryboard.kind).toBe("human");
    expect(parsed.availableActions.reject).toBe(true);
  });
});
