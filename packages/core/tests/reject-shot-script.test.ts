import { describe, expect, it, vi } from "vitest";

import {
  CurrentShotScriptNotFoundError,
  createRejectShotScriptUseCase,
} from "../src/index";

describe("reject shot script use case", () => {
  it("throws when there is no current shot script", async () => {
    const useCase = createRejectShotScriptUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: "mp_20260322_ab12cd",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_20260322_ab12cd",
          currentShotScriptId: null,
          status: "shot_script_in_review",
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue(null),
        writeCurrentShotScript: vi.fn(),
      },
      shotScriptReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn(),
      },
      createShotScriptGenerateTask: {
        execute: vi.fn(),
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260322_ab12cd",
        reason: "Need tighter continuity notes.",
        nextAction: "edit_manually",
      }),
    ).rejects.toBeInstanceOf(CurrentShotScriptNotFoundError);
  });

  it("records a manual-edit rejection and keeps the project in review", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260322_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 120,
        currentMasterPlotId: "mp_20260322_ab12cd",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_20260322_ab12cd",
        currentShotScriptId: "shot_script_20260322_ab12cd",
        status: "shot_script_in_review",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const shotScriptReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const createShotScriptGenerateTask = {
      execute: vi.fn(),
    };
    const useCase = createRejectShotScriptUseCase({
      projectRepository,
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_20260322_ab12cd",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          sourceTaskId: "task_20260322_shot_script",
          updatedAt: "2026-03-22T12:00:00.000Z",
          approvedAt: null,
          shots: [],
        }),
        writeCurrentShotScript: vi.fn(),
      },
      shotScriptReviewRepository,
      createShotScriptGenerateTask,
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
      reason: "Need tighter continuity notes.",
      nextAction: "edit_manually",
    });

    expect(shotScriptReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_20260322_ab12cd",
        shotScriptId: "shot_script_20260322_ab12cd",
        action: "reject",
        nextAction: "edit_manually",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "shot_script_in_review",
      updatedAt: "2026-03-22T12:00:00.000Z",
    });
    expect(createShotScriptGenerateTask.execute).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("records a regenerate rejection and returns the project to generating", async () => {
    const createShotScriptGenerateTask = {
      execute: vi.fn().mockResolvedValue({
        id: "task_20260322_next",
        updatedAt: "2026-03-22T12:30:00.000Z",
        type: "shot_script_generate",
      }),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260322_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 120,
        currentMasterPlotId: "mp_20260322_ab12cd",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_20260322_ab12cd",
        currentShotScriptId: "shot_script_20260322_ab12cd",
        status: "shot_script_in_review",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const useCase = createRejectShotScriptUseCase({
      projectRepository,
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_20260322_ab12cd",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          sourceTaskId: "task_20260322_shot_script",
          updatedAt: "2026-03-22T12:00:00.000Z",
          approvedAt: null,
          shots: [],
        }),
        writeCurrentShotScript: vi.fn(),
      },
      shotScriptReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn(),
      },
      createShotScriptGenerateTask,
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
      reason: "Need tighter continuity notes.",
      nextAction: "regenerate",
    });

    expect(createShotScriptGenerateTask.execute).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
    });
    expect(projectRepository.updateStatus).toHaveBeenNthCalledWith(1, {
      projectId: "proj_20260322_ab12cd",
      status: "storyboard_approved",
      updatedAt: "2026-03-22T12:00:00.000Z",
    });
    expect(projectRepository.updateStatus).toHaveBeenNthCalledWith(2, {
      projectId: "proj_20260322_ab12cd",
      status: "shot_script_generating",
      updatedAt: "2026-03-22T12:30:00.000Z",
    });
    expect(result?.id).toBe("task_20260322_next");
  });
});
