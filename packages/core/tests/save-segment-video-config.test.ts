import { describe, expect, it, vi } from "vitest";

import {
  createSaveSegmentVideoConfigUseCase,
  createSegmentVideoRecord,
} from "../src/index";

describe("save segment video config use case", () => {
  it("saves prompt text and reference image/audio configuration for a segment", async () => {
    const segment = createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentName: "Arrival",
      segmentSummary: "Rin arrives at the flooded market.",
      shotCount: 2,
      sourceShotIds: ["shot_1", "shot_2"],
      promptTextSeed: "seed prompt",
      promptTextCurrent: "old prompt",
      promptUpdatedAt: "2026-03-25T00:18:00.000Z",
      referenceImages: [],
      referenceAudios: [],
      updatedAt: "2026-03-25T00:18:00.000Z",
    });
    const videoRepository = createVideoRepository({
      findSegmentById: vi.fn().mockResolvedValue(segment),
      updateSegment: vi.fn(),
    });
    const useCase = createSaveSegmentVideoConfigUseCase({
      projectRepository: createProjectRepository(),
      videoRepository,
      clock: { now: () => "2026-03-25T00:19:00.000Z" },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      videoId: "video_segment_1",
      promptTextCurrent: " operator edited prompt ",
      referenceImages: [
        {
          id: "ref_img_1",
          assetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_img_1.png",
          source: "manual",
          order: 0,
          sourceShotId: null,
          label: "Manual continuity",
        },
      ],
      referenceAudios: [
        {
          id: "ref_audio_1",
          assetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/references/audios/ref_audio_1.wav",
          source: "manual",
          order: 0,
          label: "Rain guide",
          durationSec: 8,
        },
      ],
    });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTextSeed: "seed prompt",
        promptTextCurrent: "operator edited prompt",
        promptUpdatedAt: "2026-03-25T00:19:00.000Z",
        updatedAt: "2026-03-25T00:19:00.000Z",
        referenceImages: [
          expect.objectContaining({
            id: "ref_img_1",
            source: "manual",
          }),
        ],
        referenceAudios: [
          expect.objectContaining({
            id: "ref_audio_1",
            source: "manual",
          }),
        ],
      }),
    );
    expect(result.promptTextCurrent).toBe("operator edited prompt");
    expect(result.referenceAudios).toHaveLength(1);
  });
});

function createProjectRepository() {
  return {
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
  };
}

function createVideoRepository(overrides: Record<string, unknown>) {
  return {
    insertBatch: vi.fn(),
    findBatchById: vi.fn(),
    findCurrentBatchByProjectId: vi.fn(),
    listSegmentsByBatchId: vi.fn(),
    insertSegment: vi.fn(),
    findSegmentById: vi.fn(),
    findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
    findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
    updateSegment: vi.fn(),
    ...overrides,
  };
}
