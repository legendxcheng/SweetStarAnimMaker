import { describe, expect, it, vi } from "vitest";

import { createRegenerateStoryboardUseCase } from "../src/index";

describe("regenerate storyboard use case", () => {
  it("resets downstream stage pointers and restarts storyboard generation", async () => {
    const createStoryboardGenerateTask = {
      execute: vi.fn().mockResolvedValue({
        id: "task_storyboard_restart",
      }),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 128,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "character_batch_v1",
        currentStoryboardId: null,
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: "image_batch_v1",
        status: "images_generating",
        createdAt: "2026-03-24T10:00:00.000Z",
        updatedAt: "2026-03-24T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-24T10:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const useCase = createRegenerateStoryboardUseCase({
      projectRepository,
      createStoryboardGenerateTask,
      clock: {
        now: () => "2026-03-24T12:30:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260324_ab12cd",
    });

    expect(projectRepository.updateCurrentStoryboard).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
      storyboardId: null,
    });
    expect(projectRepository.updateCurrentShotScript).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
      shotScriptId: null,
    });
    expect(projectRepository.updateCurrentImageBatch).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
      batchId: null,
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
      status: "character_sheets_approved",
      updatedAt: "2026-03-24T12:30:00.000Z",
    });
    expect(createStoryboardGenerateTask.execute).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
    });
    expect(result.id).toBe("task_storyboard_restart");
  });
});
