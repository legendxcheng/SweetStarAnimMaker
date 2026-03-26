import { describe, expect, it, vi } from "vitest";

import { createUpdateVideoPromptUseCase } from "../src/index";

describe("update video prompt use case", () => {
  it("updates only the editable current prompt", async () => {
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn(),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn().mockResolvedValue({
        id: "video_segment_1",
        batchId: "video_batch_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        status: "in_review",
        promptTextSeed: "原始视频提示词",
        promptTextCurrent: "旧视频提示词",
        promptUpdatedAt: "2026-03-25T00:18:00.000Z",
        videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
        thumbnailAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/thumbnail.webp",
        durationSec: 8,
        provider: "vector-engine",
        model: "kling-v3",
        approvedAt: null,
        updatedAt: "2026-03-25T00:18:00.000Z",
        sourceTaskId: "task_segment_video_1",
        storageDir: "ignored",
        currentVideoRelPath: "ignored",
        currentMetadataRelPath: "ignored",
        thumbnailRelPath: "ignored",
        versionsStorageDir: "ignored",
      }),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };

    const useCase = createUpdateVideoPromptUseCase({
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
      videoRepository,
      clock: { now: () => "2026-03-25T00:19:00.000Z" },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      videoId: "video_segment_1",
      promptTextCurrent: "新的用户视频提示词",
    });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTextSeed: "原始视频提示词",
        promptTextCurrent: "新的用户视频提示词",
        promptUpdatedAt: "2026-03-25T00:19:00.000Z",
      }),
    );
    expect(result.promptTextCurrent).toBe("新的用户视频提示词");
    expect(result.promptTextSeed).toBe("原始视频提示词");
  });
});
