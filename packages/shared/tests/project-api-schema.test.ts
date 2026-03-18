import { describe, expect, it } from "vitest";
import {
  createProjectRequestSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  projectStatuses,
  projectSummaryResponseSchema,
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

  it("exposes the expanded storyboard workflow statuses", () => {
    expect(projectStatuses).toEqual([
      "script_ready",
      "storyboard_generating",
      "storyboard_in_review",
      "storyboard_approved",
    ]);
  });

  it("accepts project summary without a current storyboard", () => {
    const parsed = projectSummaryResponseSchema.parse({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "script_ready",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      currentStoryboard: null,
    });

    expect(parsed.id).toBe("proj_20260317_ab12cd");
    expect(parsed.currentStoryboard).toBeNull();
  });

  it("accepts project summary with a current storyboard", () => {
    const parsed = projectSummaryResponseSchema.parse({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "storyboard_in_review",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      currentStoryboard: {
        id: "storyboard_v1",
        projectId: "proj_20260317_ab12cd",
        versionNumber: 1,
        kind: "ai",
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        filePath: "storyboard/v1.json",
        createdAt: "2026-03-17T12:05:00.000Z",
        sourceTaskId: "task_123",
      },
    });

    expect(parsed.currentStoryboard).not.toBeNull();
    expect(parsed.currentStoryboard?.versionNumber).toBe(1);
  });

  it("accepts a project list response", () => {
    const parsed = projectListResponseSchema.parse([
      {
        id: "proj_1",
        name: "Project One",
        slug: "project-one",
        status: "script_ready",
        storageDir: "projects/proj_1-project-one",
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        currentStoryboard: null,
      },
      {
        id: "proj_2",
        name: "Project Two",
        slug: "project-two",
        status: "storyboard_approved",
        storageDir: "projects/proj_2-project-two",
        createdAt: "2026-03-17T13:00:00.000Z",
        updatedAt: "2026-03-17T13:00:00.000Z",
        currentStoryboard: {
          id: "storyboard_v2",
          projectId: "proj_2",
          versionNumber: 2,
          kind: "human",
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          filePath: "storyboard/v2.json",
          createdAt: "2026-03-17T13:05:00.000Z",
          sourceTaskId: "task_456",
        },
      },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("Project One");
    expect(parsed[1].currentStoryboard?.versionNumber).toBe(2);
  });
});
