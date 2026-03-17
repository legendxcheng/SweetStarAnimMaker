import { describe, expect, it, vi } from "vitest";

import {
  CurrentStoryboardNotFoundError,
  createGetCurrentStoryboardUseCase,
} from "../src/index";

describe("get current storyboard use case", () => {
  it("returns the current storyboard document", async () => {
    const storyboardVersionRepository = {
      insert: vi.fn(),
      findCurrentByProjectId: vi.fn().mockResolvedValue({
        id: "sbv_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
        sourceTaskId: "task_20260317_ab12cd",
        versionNumber: 1,
        kind: "ai",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storageDir: "projects/proj_20260317_ab12cd-my-story/storyboards/versions",
        fileRelPath: "storyboards/versions/v1-ai.json",
        rawResponseRelPath: "storyboards/raw/task_20260317_ab12cd-gemini-response.json",
        createdAt: "2026-03-17T12:00:00.000Z",
      }),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn().mockResolvedValue({
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
      }),
    };
    const useCase = createGetCurrentStoryboardUseCase({
      storyboardVersionRepository,
      storyboardStorage,
    });

    const result = await useCase.execute({
      projectId: "proj_20260317_ab12cd",
    });

    expect(result.filePath).toBe("storyboards/versions/v1-ai.json");
    expect(result.summary).toBe("A short story summary");
    expect(result.scenes).toHaveLength(1);
  });

  it("throws when the project has no current storyboard", async () => {
    const useCase = createGetCurrentStoryboardUseCase({
      storyboardVersionRepository: {
        insert: vi.fn(),
        findCurrentByProjectId: vi.fn().mockResolvedValue(null),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260317_missing",
      }),
    ).rejects.toBeInstanceOf(CurrentStoryboardNotFoundError);
  });
});
