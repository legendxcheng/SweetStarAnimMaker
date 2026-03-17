import { describe, expect, it } from "vitest";

import { createStoryboardVersionRecord } from "../src/domain/storyboard";

describe("storyboard domain", () => {
  it("builds the first ai storyboard version metadata", () => {
    const version = createStoryboardVersionRecord({
      id: "sbv_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      sourceTaskId: "task_20260317_ab12cd",
      versionNumber: 1,
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T12:00:00.000Z",
    });

    expect(version.fileRelPath).toBe("storyboards/versions/v1-ai.json");
    expect(version.rawResponseRelPath).toBe(
      "storyboards/raw/task_20260317_ab12cd-gemini-response.json",
    );
  });
});
