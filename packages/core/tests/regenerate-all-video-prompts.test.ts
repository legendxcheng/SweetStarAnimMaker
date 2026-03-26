import { describe, expect, it, vi } from "vitest";

import { createRegenerateAllVideoPromptsUseCase } from "../src/index";

describe("regenerate all video prompts use case", () => {
  it("rebuilds promptTextCurrent for every segment in the current video batch", async () => {
    const segments = [
      {
        id: "video_segment_1",
        batchId: "video_batch_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        status: "in_review" as const,
        promptTextSeed: "seed 1",
        promptTextCurrent: "old 1",
        promptUpdatedAt: "2026-03-25T00:18:00.000Z",
        videoAssetPath: null,
        thumbnailAssetPath: null,
        durationSec: null,
        provider: null,
        model: null,
        approvedAt: null,
        updatedAt: "2026-03-25T00:18:00.000Z",
        sourceTaskId: null,
        storageDir: "ignored",
        currentVideoRelPath: "ignored",
        currentMetadataRelPath: "ignored",
        thumbnailRelPath: "ignored",
        versionsStorageDir: "ignored",
      },
      {
        id: "video_segment_2",
        batchId: "video_batch_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentId: "segment_2",
        sceneId: "scene_1",
        order: 2,
        status: "failed" as const,
        promptTextSeed: "seed 2",
        promptTextCurrent: "old 2",
        promptUpdatedAt: "2026-03-25T00:18:00.000Z",
        videoAssetPath: null,
        thumbnailAssetPath: null,
        durationSec: null,
        provider: null,
        model: null,
        approvedAt: null,
        updatedAt: "2026-03-25T00:18:00.000Z",
        sourceTaskId: null,
        storageDir: "ignored",
        currentVideoRelPath: "ignored",
        currentMetadataRelPath: "ignored",
        thumbnailRelPath: "ignored",
        versionsStorageDir: "ignored",
      },
    ];
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "video_batch_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentCount: 2,
        storageDir: "ignored",
        manifestRelPath: "ignored",
        createdAt: "2026-03-25T00:10:00.000Z",
        updatedAt: "2026-03-25T00:18:00.000Z",
      }),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue(segments),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };

    const useCase = createRegenerateAllVideoPromptsUseCase({
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
          segmentCount: 2,
          shotCount: 2,
          totalDurationSec: 16,
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
              shots: [],
            },
            {
              segmentId: "segment_2",
              sceneId: "scene_1",
              order: 2,
              name: "Turn",
              summary: "Rin turns toward the submerged crossing.",
              durationSec: 8,
              status: "approved",
              lastGeneratedAt: "2026-03-25T00:17:30.000Z",
              approvedAt: "2026-03-25T00:18:00.000Z",
              shots: [],
            },
          ],
        }),
      },
      videoRepository,
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
      clock: { now: () => "2026-03-25T00:20:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(videoRepository.updateSegment).toHaveBeenCalledTimes(2);
    expect(result.shots).toHaveLength(2);
    expect(result.shots[0]?.promptTextCurrent).toBe(
      "Summary: Rin arrives at the flooded market.\nShots: ",
    );
    expect(result.shots[1]?.promptTextCurrent).toBe(
      "Summary: Rin turns toward the submerged crossing.\nShots: ",
    );
  });
});
