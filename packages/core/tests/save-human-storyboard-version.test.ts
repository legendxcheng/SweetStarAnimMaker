import { describe, expect, it, vi } from "vitest";

import {
  StoryboardReviewVersionConflictError,
  createSaveHumanStoryboardVersionUseCase,
} from "../src/index";

describe("save human storyboard version use case", () => {
  it("rejects a stale base version id", async () => {
    const useCase = createSaveHumanStoryboardVersionUseCase({
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
        listAll: vi.fn(),
      },
      storyboardVersionRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findCurrentByProjectId: vi.fn().mockResolvedValue({
          id: "sbv_current",
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
        readStoryboardVersion: vi.fn(),
      },
      clock: {
        now: () => "2026-03-18T12:30:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260318_ab12cd",
        baseVersionId: "sbv_old",
        summary: "Updated storyboard summary.",
        scenes: [],
      }),
    ).rejects.toBeInstanceOf(StoryboardReviewVersionConflictError);
  });

  it("creates the next human storyboard version and keeps the project in review", async () => {
    const projectRepository = {
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
      listAll: vi.fn(),
    };
    const storyboardVersionRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      findCurrentByProjectId: vi.fn().mockResolvedValue({
        id: "sbv_current",
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
      getNextVersionNumber: vi.fn().mockResolvedValue(2),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
    };
    const useCase = createSaveHumanStoryboardVersionUseCase({
      projectRepository,
      storyboardVersionRepository,
      storyboardStorage,
      clock: {
        now: () => "2026-03-18T12:30:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
      baseVersionId: "sbv_current",
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

    expect(storyboardStorage.writeStoryboardVersion).toHaveBeenCalledWith({
      version: expect.objectContaining({
        kind: "human",
        fileRelPath: "storyboards/versions/v2-human.json",
      }),
      storyboard: expect.objectContaining({
        summary: "Updated storyboard summary.",
      }),
    });
    expect(storyboardVersionRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        versionNumber: 2,
        kind: "human",
      }),
    );
    expect(projectRepository.updateCurrentStoryboardVersion).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      storyboardVersionId: result.id,
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      status: "storyboard_in_review",
      updatedAt: "2026-03-18T12:30:00.000Z",
    });
    expect(result.kind).toBe("human");
  });
});
