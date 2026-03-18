import { describe, expect, it } from "vitest";

import {
  currentStoryboardResponseSchema,
  storyboardVersionResponseSchema,
} from "../src/schemas/storyboard-api";

describe("storyboard api schema", () => {
  it("accepts a storyboard version summary", () => {
    const parsed = storyboardVersionResponseSchema.parse({
      id: "sbv_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      versionNumber: 1,
      kind: "ai",
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      filePath: "storyboards/versions/v1-ai.json",
      createdAt: "2026-03-17T12:00:00.000Z",
      sourceTaskId: "task_20260317_ab12cd",
    });

    expect(parsed.kind).toBe("ai");
  });

  it("accepts a current storyboard response", () => {
    const parsed = currentStoryboardResponseSchema.parse({
      id: "sbv_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      versionNumber: 1,
      kind: "ai",
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      filePath: "storyboards/versions/v1-ai.json",
      createdAt: "2026-03-17T12:00:00.000Z",
      sourceTaskId: "task_20260317_ab12cd",
      summary: "A short story summary",
      scenes: [
        {
          id: "scene_1",
          sceneIndex: 1,
          description: "A enters the room",
          camera: "medium shot",
          characters: ["A"],
          prompt: "medium shot, character A entering a dim room",
        },
      ],
    });

    expect(parsed.scenes).toHaveLength(1);
  });

  it("accepts a human storyboard version summary", () => {
    const parsed = storyboardVersionResponseSchema.parse({
      id: "sbv_20260318_hu12cd",
      projectId: "proj_20260318_ab12cd",
      versionNumber: 2,
      kind: "human",
      provider: "manual",
      model: "manual-edit",
      filePath: "storyboards/versions/v2-human.json",
      createdAt: "2026-03-18T12:30:00.000Z",
      sourceTaskId: "task_20260318_ab12cd",
    });

    expect(parsed.kind).toBe("human");
  });
});
