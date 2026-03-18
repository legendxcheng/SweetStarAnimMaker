import { describe, expect, it, vi } from "vitest";

import {
  StoryboardReviewVersionConflictError,
  createApproveStoryboardUseCase,
} from "../src/index";

describe("approve storyboard use case", () => {
  it("rejects non-current versions", async () => {
    const useCase = createApproveStoryboardUseCase({
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
      clock: {
        now: () => "2026-03-18T12:40:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260318_ab12cd",
        storyboardVersionId: "sbv_old",
      }),
    ).rejects.toBeInstanceOf(StoryboardReviewVersionConflictError);
  });

  it("writes an approve review record and updates the project status", async () => {
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
    const useCase = createApproveStoryboardUseCase({
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
      clock: {
        now: () => "2026-03-18T12:40:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
      storyboardVersionId: "sbv_current",
      note: "Approved after manual review.",
    });

    expect(storyboardReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "approve",
        reason: "Approved after manual review.",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      status: "storyboard_approved",
      updatedAt: "2026-03-18T12:40:00.000Z",
    });
    expect(result.action).toBe("approve");
  });
});
