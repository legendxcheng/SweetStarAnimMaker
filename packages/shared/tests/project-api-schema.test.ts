import { describe, expect, it } from "vitest";
import {
  createProjectRequestSchema,
  projectDetailResponseSchema,
  updateProjectScriptRequestSchema,
} from "../src/index";

describe("project api schema", () => {
  it("accepts a valid create-project payload", () => {
    const parsed = createProjectRequestSchema.parse({
      name: "My Story",
      script: "Scene 1",
    });

    expect(parsed.name).toBe("My Story");
    expect(parsed.script).toBe("Scene 1");
  });

  it("accepts a valid update-project-script payload", () => {
    const parsed = updateProjectScriptRequestSchema.parse({
      script: "Updated Scene 1",
    });

    expect(parsed.script).toBe("Updated Scene 1");
  });

  it("accepts project detail without a current storyboard", () => {
    const parsed = projectDetailResponseSchema.parse({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "script_ready",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      script: {
        path: "script/original.txt",
        bytes: 123,
        updatedAt: "2026-03-17T12:00:00.000Z",
      },
      currentStoryboard: null,
    });

    expect(parsed.currentStoryboard).toBeNull();
  });
});
