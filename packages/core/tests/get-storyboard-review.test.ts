import { describe, expect, it, vi } from "vitest";

import { createGetStoryboardReviewUseCase } from "../src/index";

describe("get storyboard review use case", () => {
  it("returns the review workspace for the current storyboard", async () => {
    const useCase = createGetStoryboardReviewUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260318_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260318_ab12cd-my-story",
          scriptRelPath: "script/original.txt",
          scriptBytes: 120,
          status: "storyboard_in_review",
          createdAt: "2026-03-18T10:00:00.000Z",
          updatedAt: "2026-03-18T12:00:00.000Z",
          scriptUpdatedAt: "2026-03-18T10:00:00.000Z",
        }),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
        updateStatus: vi.fn(),
      },
      storyboardVersionRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findCurrentByProjectId: vi.fn().mockResolvedValue({
          id: "sbv_20260318_ab12cd",
          projectId: "proj_20260318_ab12cd",
          projectStorageDir: "projects/proj_20260318_ab12cd-my-story",
          sourceTaskId: "task_20260318_ab12cd",
          versionNumber: 1,
          kind: "ai",
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
          storageDir: "projects/proj_20260318_ab12cd-my-story/storyboards/versions",
          fileRelPath: "storyboards/versions/v1-ai.json",
          rawResponseRelPath: "storyboards/raw/task_20260318_ab12cd-gemini-response.json",
          createdAt: "2026-03-18T12:00:00.000Z",
        }),
        getNextVersionNumber: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn().mockResolvedValue({
          summary: "Generated storyboard summary",
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
        }),
      },
      storyboardReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "sbr_20260318_ab12cd",
          projectId: "proj_20260318_ab12cd",
          storyboardVersionId: "sbv_20260318_ab12cd",
          action: "reject",
          reason: "Need better pacing.",
          triggeredTaskId: null,
          createdAt: "2026-03-18T12:10:00.000Z",
        }),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "task_20260318_ab12cd",
          projectId: "proj_20260318_ab12cd",
          type: "storyboard_generate",
          status: "succeeded",
          queueName: "storyboard-generate",
          storageDir: "projects/proj_20260318_ab12cd-my-story/tasks/task_20260318_ab12cd",
          inputRelPath: "tasks/task_20260318_ab12cd/input.json",
          outputRelPath: "tasks/task_20260318_ab12cd/output.json",
          logRelPath: "tasks/task_20260318_ab12cd/log.txt",
          errorMessage: null,
          createdAt: "2026-03-18T11:50:00.000Z",
          updatedAt: "2026-03-18T12:00:00.000Z",
          startedAt: "2026-03-18T11:52:00.000Z",
          finishedAt: "2026-03-18T12:00:00.000Z",
        }),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
    });

    expect(result.projectStatus).toBe("storyboard_in_review");
    expect(result.currentStoryboard.id).toBe("sbv_20260318_ab12cd");
    expect(result.latestReview?.action).toBe("reject");
    expect(result.latestStoryboardTask?.id).toBe("task_20260318_ab12cd");
    expect(result.availableActions).toEqual({
      saveHumanVersion: true,
      approve: true,
      reject: true,
    });
  });
});
