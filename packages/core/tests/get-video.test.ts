import { describe, expect, it, vi } from "vitest";

import { createGetVideoUseCase } from "../src/index";

describe("get video use case", () => {
  it("repairs empty prompts before returning a current video segment", async () => {
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
        status: "failed",
        promptTextSeed: "",
        promptTextCurrent: "",
        promptUpdatedAt: "",
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
      }),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };

    const useCase = createGetVideoUseCase({
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

    const result = await useCase.execute({
      projectId: "proj_1",
      videoId: "video_segment_1",
    });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_1",
        promptTextSeed:
          "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
        promptTextCurrent:
          "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
      }),
    );
    expect(result.promptTextSeed).toBe(
      "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
    );
    expect(result.promptTextCurrent).toBe(
      "Summary: Rin arrives at the flooded market.\nShots: S01: Rin steps into the flooded market and looks ahead.",
    );
  });
});
