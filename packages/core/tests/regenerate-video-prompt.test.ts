import { describe, expect, it, vi } from "vitest";

import { createRegenerateVideoPromptUseCase, SegmentVideoNotFoundError } from "../src/index";

describe("regenerate video prompt use case", () => {
  it("rebuilds the saved video prompt from the current segment script context", async () => {
    const projectRepository = {
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
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        { id: "video_segment_1", status: "approved" },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn().mockResolvedValue({
        id: "video_segment_1",
        batchId: "video_batch_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentName: "Arrival",
        segmentSummary: "Rin arrives at the flooded market.",
        shotCount: 1,
        sourceShotIds: ["shot_1"],
        shotId: "shot_1",
        shotCode: "S01-SG01",
        segmentId: "segment_1",
        sceneId: "scene_1",
        segmentOrder: 1,
        shotOrder: 1,
        frameDependency: "start_frame_only",
        status: "approved",
        promptTextSeed: "原始视频提示词",
        promptTextCurrent: "旧视频提示词",
        promptUpdatedAt: "2026-03-25T00:18:00.000Z",
        referenceImages: [
          {
            id: "ref_image_1",
            assetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_image_1.png",
            source: "auto",
            order: 0,
            sourceShotId: "shot_1",
            label: "Shot 1 start",
          },
        ],
        referenceAudios: [],
        videoAssetPath: null,
        thumbnailAssetPath: null,
        durationSec: null,
        provider: null,
        model: null,
        approvedAt: "2026-03-25T00:18:30.000Z",
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

    const useCase = createRegenerateVideoPromptUseCase({
      projectRepository,
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
                  shotCode: "S01-SG01",
                  durationSec: 8,
                  frameDependency: "start_frame_only",
                  purpose: "Arrival",
                  visual: "Rin crosses the flooded market.",
                  subject: "Rin",
                  action: "She advances toward the camera.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: "Keep her satchel visible.",
                },
              ],
            },
          ],
        }),
      },
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listFramesByBatchId: vi.fn(),
        listShotsByBatchId: vi.fn().mockRejectedValue(new Error("should not read shot references")),
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
      },
      videoRepository,
      videoStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writePromptPlan: vi.fn(),
        writeRawResponse: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeCurrentVideo: vi.fn(),
        writeVideoVersion: vi.fn(),
        resolveProjectAssetPath: vi.fn(),
      },
      videoPromptProvider: {
        generateVideoPrompt: vi.fn().mockResolvedValue({
          finalPrompt:
            "以<<<image_1>>>为首帧锚点，林抵达积水市场后先停步，再抬头观察，口型清晰说出“有人先到了”，保留雨声和摊布拍打声。",
          dialoguePlan: "说话主体：林；台词：有人先到了。",
          audioPlan: "雨声和摊布拍打声。",
          visualGuardrails: "保持林的挎包和服装稳定。",
          rationale: "把对白、环境声和连续性要求并入 Omni 提示词。",
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
        }),
      },
      clock: { now: () => "2026-03-25T00:20:00.000Z" },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      videoId: "video_segment_1",
    });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "in_review",
        approvedAt: null,
        promptTextSeed: "原始视频提示词",
        promptTextCurrent:
          "以<<<image_1>>>为首帧锚点，林抵达积水市场后先停步，再抬头观察，口型清晰说出“有人先到了”，保留雨声和摊布拍打声。",
        promptUpdatedAt: "2026-03-25T00:20:00.000Z",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_in_review",
      updatedAt: "2026-03-25T00:20:00.000Z",
    });
    expect(result.referenceImages[0]?.assetPath).toContain("ref_image_1.png");
    expect(result.status).toBe("in_review");
    expect(result.approvedAt).toBeNull();
    expect(result.promptTextCurrent).toContain("有人先到了");
  });

  it("rejects a historical batch segment id even when it belongs to the same project", async () => {
    const projectRepository = {
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
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn().mockResolvedValue([
        { id: "video_segment_old", status: "approved" },
      ]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn().mockResolvedValue({
        id: "video_segment_old",
        batchId: "video_batch_old",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        segmentName: "Arrival",
        segmentSummary: "Rin arrives at the flooded market.",
        shotCount: 1,
        sourceShotIds: ["shot_1"],
        shotId: "shot_1",
        shotCode: "S01-SG01",
        segmentId: "segment_1",
        sceneId: "scene_1",
        segmentOrder: 1,
        shotOrder: 1,
        frameDependency: "start_frame_only",
        status: "approved",
        promptTextSeed: "历史视频提示词",
        promptTextCurrent: "历史视频提示词",
        promptUpdatedAt: "2026-03-20T00:18:00.000Z",
        referenceImages: [],
        referenceAudios: [],
        videoAssetPath: null,
        thumbnailAssetPath: null,
        durationSec: null,
        provider: null,
        model: null,
        approvedAt: "2026-03-20T00:18:30.000Z",
        updatedAt: "2026-03-20T00:18:00.000Z",
        sourceTaskId: "task_segment_video_old",
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

    const useCase = createRegenerateVideoPromptUseCase({
      projectRepository,
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
                  shotCode: "S01-SG01",
                  durationSec: 8,
                  frameDependency: "start_frame_only",
                  purpose: "Arrival",
                  visual: "Rin crosses the flooded market.",
                  subject: "Rin",
                  action: "She advances toward the camera.",
                  dialogue: null,
                  os: null,
                  audio: null,
                  transitionHint: null,
                  continuityNotes: "Keep her satchel visible.",
                },
              ],
            },
          ],
        }),
      },
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listFramesByBatchId: vi.fn(),
        listShotsByBatchId: vi.fn(),
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
      },
      videoRepository,
      videoStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writePromptPlan: vi.fn(),
        writeRawResponse: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeCurrentVideo: vi.fn(),
        writeVideoVersion: vi.fn(),
        resolveProjectAssetPath: vi.fn(),
      },
      videoPromptProvider: {
        generateVideoPrompt: vi.fn().mockResolvedValue({
          finalPrompt: "历史批次不应该被重新生成",
          dialoguePlan: null,
          audioPlan: null,
          visualGuardrails: null,
          rationale: null,
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
        }),
      },
      clock: { now: () => "2026-03-25T00:20:00.000Z" },
    });

    await expect(
      useCase.execute({
        projectId: "proj_1",
        videoId: "video_segment_old",
      }),
    ).rejects.toThrowError(SegmentVideoNotFoundError);
    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(videoRepository.listSegmentsByBatchId).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
  });
});
