import { describe, expect, it, vi } from "vitest";

import { createListVideosUseCase } from "../src/index";

describe("list videos use case", () => {
  it("hides placeholder asset paths for segments that have never produced a video", async () => {
    const useCase = createListVideosUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
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
        findBatchById: vi.fn().mockResolvedValue({
          id: "video_batch_1",
          sourceImageBatchId: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          segmentCount: 2,
          updatedAt: "2026-03-25T01:00:00.000Z",
        }),
        findCurrentBatchByProjectId: vi.fn(),
        listSegmentsByBatchId: vi.fn().mockResolvedValue([
          {
            id: "video_segment_1",
            projectId: "proj_1",
            batchId: "video_batch_1",
            sourceImageBatchId: "image_batch_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            status: "generating",
            videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
            thumbnailAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/thumbnail.webp",
            durationSec: null,
            provider: null,
            model: null,
            updatedAt: "2026-03-25T01:00:00.000Z",
            approvedAt: null,
            sourceTaskId: null,
          },
          {
            id: "video_segment_2",
            projectId: "proj_1",
            batchId: "video_batch_1",
            sourceImageBatchId: "image_batch_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_2",
            sceneId: "scene_1",
            order: 2,
            status: "approved",
            videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_2/current.mp4",
            thumbnailAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_2/thumbnail.webp",
            durationSec: 8,
            provider: "openai",
            model: "sora-2-all",
            updatedAt: "2026-03-25T01:02:00.000Z",
            approvedAt: "2026-03-25T01:02:00.000Z",
            sourceTaskId: "task_segment_video_2",
          },
        ]),
        insertSegment: vi.fn(),
        findSegmentById: vi.fn(),
        findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
        findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
        updateSegment: vi.fn(),
      },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(result.segments[0]).toEqual(
      expect.objectContaining({
        status: "generating",
        videoAssetPath: null,
        thumbnailAssetPath: null,
      }),
    );
    expect(result.segments[1]).toEqual(
      expect.objectContaining({
        status: "approved",
        videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_2/current.mp4",
        thumbnailAssetPath:
          "videos/batches/video_batch_1/segments/scene_1__segment_2/thumbnail.webp",
      }),
    );
  });

  it("keeps the last successful asset visible while a segment is regenerating", async () => {
    const useCase = createListVideosUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
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
        findBatchById: vi.fn().mockResolvedValue({
          id: "video_batch_1",
          sourceImageBatchId: "image_batch_1",
          sourceShotScriptId: "shot_script_1",
          segmentCount: 1,
          updatedAt: "2026-03-25T01:00:00.000Z",
        }),
        findCurrentBatchByProjectId: vi.fn(),
        listSegmentsByBatchId: vi.fn().mockResolvedValue([
          {
            id: "video_segment_1",
            projectId: "proj_1",
            batchId: "video_batch_1",
            sourceImageBatchId: "image_batch_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            status: "generating",
            videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
            thumbnailAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/thumbnail.webp",
            durationSec: 8,
            provider: "openai",
            model: "sora-2-all",
            updatedAt: "2026-03-25T01:01:00.000Z",
            approvedAt: null,
            sourceTaskId: "task_segment_video_1_previous",
          },
        ]),
        insertSegment: vi.fn(),
        findSegmentById: vi.fn(),
        findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
        findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
        updateSegment: vi.fn(),
      },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(result.segments[0]).toEqual(
      expect.objectContaining({
        status: "generating",
        sourceTaskId: "task_segment_video_1_previous",
        videoAssetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
        thumbnailAssetPath:
          "videos/batches/video_batch_1/segments/scene_1__segment_1/thumbnail.webp",
      }),
    );
  });
});
