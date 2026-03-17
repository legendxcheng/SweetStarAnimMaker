import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  createGetProjectDetailUseCase,
} from "../src/index";

describe("get project detail use case", () => {
  it("returns the expected detail dto", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue({
        id: "proj_20260317_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        scriptRelPath: "script/original.txt",
        scriptBytes: 7,
        status: "script_ready",
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
        scriptUpdatedAt: "2026-03-17T00:00:00.000Z",
      }),
      updateScriptMetadata: vi.fn(),
      updateCurrentStoryboardVersion: vi.fn(),
    };
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
        createdAt: "2026-03-17T00:00:00.000Z",
      }),
    };
    const useCase = createGetProjectDetailUseCase({
      repository,
      storyboardVersionRepository,
    });

    const result = await useCase.execute({
      projectId: "proj_20260317_ab12cd",
    });

    expect(result.script.bytes).toBe(7);
    expect(result.script.path).toBe("script/original.txt");
    expect(result.currentStoryboard).toEqual({
      id: "sbv_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      versionNumber: 1,
      kind: "ai",
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
      filePath: "storyboards/versions/v1-ai.json",
      createdAt: "2026-03-17T00:00:00.000Z",
      sourceTaskId: "task_20260317_ab12cd",
    });
  });

  it("throws when the project does not exist", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue(null),
      updateScriptMetadata: vi.fn(),
      updateCurrentStoryboardVersion: vi.fn(),
    };
    const useCase = createGetProjectDetailUseCase({
      repository,
      storyboardVersionRepository: {
        insert: vi.fn(),
        findCurrentByProjectId: vi.fn(),
      },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
