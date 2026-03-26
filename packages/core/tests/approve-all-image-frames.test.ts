import { describe, expect, it, vi } from "vitest";

import {
  createApproveAllImageFramesUseCase,
  createShotReferenceBatchRecord,
  createShotReferenceRecord,
} from "../src/index";

describe("approve all image frames use case", () => {
  it("approves every ready shot reference and leaves incomplete shots pending", async () => {
    const readyShot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_1",
      batchId: "image_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "S01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 3,
      frameDependency: "start_frame_only",
      updatedAt: "2026-03-24T00:19:00.000Z",
      startFrame: {
        imageStatus: "in_review",
      },
    });
    const incompleteShot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_2",
      batchId: "image_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_2",
      shotCode: "S01-SG01-SH02",
      segmentOrder: 1,
      shotOrder: 2,
      durationSec: 3,
      frameDependency: "start_and_end_frame",
      updatedAt: "2026-03-24T00:19:00.000Z",
      startFrame: {
        imageStatus: "in_review",
      },
      endFrame: {
        imageStatus: "pending",
      },
    });
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue(
        createShotReferenceBatchRecord({
          id: "image_batch_1",
          projectId: "proj_1",
          projectStorageDir: "projects/proj_1-my-story",
          sourceShotScriptId: "shot_script_v1",
          shotCount: 2,
          totalRequiredFrameCount: 3,
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:19:00.000Z",
        }),
      ),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([readyShot, incompleteShot]),
      insertFrame: vi.fn(),
      insertShot: vi.fn(),
      findFrameById: vi.fn(),
      findShotById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        currentImageBatchId: "image_batch_1",
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

    const useCase = createApproveAllImageFramesUseCase({
      projectRepository,
      shotImageRepository,
      clock: { now: () => "2026-03-24T00:20:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(shotImageRepository.updateShot).toHaveBeenCalledTimes(2);
    expect(result.currentBatch.approvedShotCount).toBe(1);
    expect(result.shots[0]).toEqual(
      expect.objectContaining({
        referenceStatus: "approved",
      }),
    );
    expect(result.shots[1]).toEqual(
      expect.objectContaining({
        referenceStatus: "pending",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "images_in_review",
      updatedAt: "2026-03-24T00:20:00.000Z",
    });
  });
});
