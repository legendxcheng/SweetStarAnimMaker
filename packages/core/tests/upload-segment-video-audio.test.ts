import { describe, expect, it, vi } from "vitest";

import {
  createSegmentVideoRecord,
  createUploadSegmentVideoAudioUseCase,
} from "../src/index";

describe("upload segment video audio use case", () => {
  it("stores uploaded audio and appends a manual segment audio reference", async () => {
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
      updatedAt: "2026-03-25T00:18:00.000Z",
    });
    const videoRepository = createVideoRepository({
      findSegmentById: vi.fn().mockResolvedValue(segment),
      updateSegment: vi.fn(),
    });
    const videoStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writePromptPlan: vi.fn(),
      writeRawResponse: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeCurrentVideo: vi.fn(),
      writeVideoVersion: vi.fn(),
      persistSegmentReferenceAudio: vi
        .fn()
        .mockResolvedValue(
          "videos/batches/video_batch_1/segments/scene_1__segment_1/references/audios/ref_audio_2.mp3",
        ),
      resolveProjectAssetPath: vi.fn(),
    };
    const useCase = createUploadSegmentVideoAudioUseCase({
      projectRepository: createProjectRepository(),
      videoRepository,
      videoStorage,
      clock: { now: () => "2026-03-25T00:19:00.000Z" },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      videoId: "video_segment_1",
      fileName: "footsteps.MP3",
      content: Uint8Array.from([1, 2, 3]),
      label: "Footsteps",
      durationSec: 4,
    });

    expect(videoStorage.persistSegmentReferenceAudio).toHaveBeenCalledWith({
      projectStorageDir: "projects/proj_1-my-story",
      batchId: "video_batch_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      audioId: "ref_audio_2",
      fileExtension: ".mp3",
      content: Uint8Array.from([1, 2, 3]),
    });
    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: "2026-03-25T00:19:00.000Z",
        referenceAudios: [
          expect.objectContaining({ id: "ref_audio_1", order: 0 }),
          {
            id: "ref_audio_2",
            assetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/references/audios/ref_audio_2.mp3",
            source: "manual",
            order: 1,
            label: "Footsteps",
            durationSec: 4,
          },
        ],
      }),
    );
    expect(result.referenceAudios.at(-1)).toEqual(
      expect.objectContaining({
        id: "ref_audio_2",
        label: "Footsteps",
      }),
    );
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
