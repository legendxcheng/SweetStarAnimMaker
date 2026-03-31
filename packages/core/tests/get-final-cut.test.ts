import { describe, expect, it, vi } from "vitest";

import { createGetFinalCutUseCase } from "../src/index";

describe("get final cut use case", () => {
  it("returns an empty response when the project has no final cut yet", async () => {
    const useCase = createGetFinalCutUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          storageDir: "projects/proj_1-my-story",
          currentVideoBatchId: "video_batch_1",
        }),
        listAll: vi.fn(),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateCurrentVideoBatch: vi.fn(),
        updateStatus: vi.fn(),
      },
      videoRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listSegmentsByBatchId: vi.fn(),
        insertSegment: vi.fn(),
        findSegmentById: vi.fn(),
        findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
        findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
        updateSegment: vi.fn(),
        findCurrentFinalCutByProjectId: vi.fn().mockResolvedValue(null),
        upsertFinalCut: vi.fn(),
      },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).resolves.toEqual({
      currentFinalCut: null,
    });
  });
});
