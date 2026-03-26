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
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      videoStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeCurrentVideo: vi.fn(),
        writeVideoVersion: vi.fn(),
        resolveProjectAssetPath: vi.fn(),
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
            promptTextSeed: "seed prompt 1",
            promptTextCurrent: "seed prompt 1",
            promptUpdatedAt: "2026-03-25T01:00:00.000Z",
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
            promptTextSeed: "seed prompt 2",
            promptTextCurrent: "current prompt 2",
            promptUpdatedAt: "2026-03-25T01:02:00.000Z",
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
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      videoStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeCurrentVideo: vi.fn(),
        writeVideoVersion: vi.fn(),
        resolveProjectAssetPath: vi.fn(),
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
            promptTextSeed: "seed prompt 1",
            promptTextCurrent: "current prompt 1",
            promptUpdatedAt: "2026-03-25T01:01:00.000Z",
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

  it("repairs empty video prompts from the current shot script before returning segments", async () => {
    const repairedSegment = {
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_1",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      status: "failed" as const,
      promptTextSeed: "",
      promptTextCurrent: "",
      promptUpdatedAt: "",
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: null,
      provider: null,
      model: null,
      updatedAt: "2026-03-25T01:00:00.000Z",
      approvedAt: null,
      sourceTaskId: null,
      projectStorageDir: "projects/proj_1-my-story",
      storageDir: "ignored",
      currentVideoRelPath: "ignored",
      currentMetadataRelPath: "ignored",
      thumbnailRelPath: "ignored",
      versionsStorageDir: "ignored",
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "video_batch_1",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentCount: 1,
        updatedAt: "2026-03-25T01:00:00.000Z",
      }),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([repairedSegment]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };
    const useCase = createListVideosUseCase({
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
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue({
          id: "shot_script_1",
          title: "Episode 1",
          sourceStoryboardId: "storyboard_1",
          sourceTaskId: "task_shot_script_1",
          updatedAt: "2026-03-25T00:17:00.000Z",
          approvedAt: "2026-03-25T00:18:00.000Z",
          segmentCount: 1,
          shotCount: 1,
          totalDurationSec: 8,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "Arrival",
              summary: "Rin arrives at the flooded market.",
              durationSec: 8,
              status: "approved",
              lastGeneratedAt: "2026-03-25T00:17:00.000Z",
              approvedAt: "2026-03-25T00:18:00.000Z",
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "S01",
                  durationSec: 8,
                  purpose: "Arrival",
                  visual: "Rin enters the market.",
                  subject: "Rin",
                  action: "Rin steps into the flooded market and looks ahead.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: null,
                },
              ],
            },
          ],
        }),
      },
      videoStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue("Summary: {{segment_summary}}\nShots: {{shots_summary}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeCurrentVideo: vi.fn(),
        writeVideoVersion: vi.fn(),
        resolveProjectAssetPath: vi.fn(),
      },
      videoRepository,
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_1",
        promptTextSeed:
          "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
        promptTextCurrent:
          "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
      }),
    );
    expect(result.segments[0]).toEqual(
      expect.objectContaining({
        promptTextSeed:
          "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
        promptTextCurrent:
          "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
      }),
    );
  });
});
