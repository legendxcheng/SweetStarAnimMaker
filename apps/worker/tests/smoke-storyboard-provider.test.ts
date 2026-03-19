import { describe, expect, it } from "vitest";

import { createSmokeStoryboardProvider } from "../src/dev/smoke-storyboard-provider";

describe("smoke storyboard provider", () => {
  it("returns an initial storyboard for first-pass generation", async () => {
    const provider = createSmokeStoryboardProvider();

    const result = await provider.generateStoryboard({
      projectId: "proj_20260318_demo",
      script: "Scene 1: A enters the rehearsal room.",
    });

    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-3.1-pro-preview");
    expect(result.storyboard.summary).toBe("Initial storyboard summary");
    expect(result.storyboard.scenes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scene_1",
          sceneIndex: 1,
        }),
      ]),
    );
  });

  it("returns a regeneration storyboard when review context is present", async () => {
    const provider = createSmokeStoryboardProvider();

    const result = await provider.generateStoryboard({
      projectId: "proj_20260318_demo",
      script: "Scene 1: A enters the rehearsal room.",
      reviewContext: {
        reason: "Need a stronger emotional turn.",
        rejectedVersionId: "sbv_20260318_prev",
      },
    });

    expect(result.storyboard.summary).toBe("Regenerated storyboard summary");
    expect(result.storyboard.scenes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scene_2",
          sceneIndex: 2,
        }),
      ]),
    );
  });
});
