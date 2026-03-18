import { describe, expect, it, vi } from "vitest";

import {
  RejectStoryboardReasonRequiredError,
  createRejectStoryboardUseCase,
} from "../src/index";

describe("reject storyboard use case", () => {
  it("requires a reason", async () => {
    const useCase = createRejectStoryboardUseCase({
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
        }),
        getNextVersionNumber: vi.fn(),
      },
      storyboardReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn(),
      },
      createStoryboardGenerateTask: {
        execute: vi.fn(),
      },
      clock: {
        now: () => "2026-03-18T12:45:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260318_ab12cd",
        storyboardVersionId: "sbv_current",
        reason: "   ",
        nextAction: "edit_manually",
      }),
    ).rejects.toBeInstanceOf(RejectStoryboardReasonRequiredError);
  });

  it("stores only a reject review record for edit-manually", async () => {
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
    const storyboardReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const createStoryboardGenerateTask = {
      execute: vi.fn(),
    };
    const useCase = createRejectStoryboardUseCase({
      projectRepository,
      storyboardVersionRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findCurrentByProjectId: vi.fn().mockResolvedValue({
          id: "sbv_current",
          projectId: "proj_20260318_ab12cd",
        }),
        getNextVersionNumber: vi.fn(),
      },
      storyboardReviewRepository,
      createStoryboardGenerateTask,
      clock: {
        now: () => "2026-03-18T12:45:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
      storyboardVersionId: "sbv_current",
      reason: "Need better pacing.",
      nextAction: "edit_manually",
    });

    expect(createStoryboardGenerateTask.execute).not.toHaveBeenCalled();
    expect(storyboardReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "reject",
        reason: "Need better pacing.",
        triggeredTaskId: null,
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      status: "storyboard_in_review",
      updatedAt: "2026-03-18T12:45:00.000Z",
    });
    expect(result.triggeredTaskId).toBeNull();
  });

  it("creates a new storyboard task with review context for regenerate", async () => {
    const storyboardReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const createStoryboardGenerateTask = {
      execute: vi.fn().mockResolvedValue({
        id: "task_20260318_next",
      }),
    };
    const useCase = createRejectStoryboardUseCase({
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
        }),
        getNextVersionNumber: vi.fn(),
      },
      storyboardReviewRepository,
      createStoryboardGenerateTask,
      clock: {
        now: () => "2026-03-18T12:45:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
      storyboardVersionId: "sbv_current",
      reason: "Need stronger scene transitions.",
      nextAction: "regenerate",
    });

    expect(createStoryboardGenerateTask.execute).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      reviewContext: {
        reason: "Need stronger scene transitions.",
        rejectedVersionId: "sbv_current",
      },
    });
    expect(storyboardReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        triggeredTaskId: "task_20260318_next",
      }),
    );
    expect(result.triggeredTaskId).toBe("task_20260318_next");
  });
});
