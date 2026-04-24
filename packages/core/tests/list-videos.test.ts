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
        generateVideoPrompt: vi.fn(),
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
            sceneId: "scene_1",
            segmentId: "segment_1",
            segmentOrder: 1,
            segmentName: "Arrival",
            segmentSummary: "Rin enters the flooded market and scans the crowd.",
            shotCount: 2,
            sourceShotIds: ["shot_1", "shot_2"],
            status: "generating",
            promptTextSeed: "seed prompt 1",
            promptTextCurrent: "seed prompt 1",
            promptUpdatedAt: "2026-03-25T01:00:00.000Z",
            referenceImages: [
              {
                id: "ref_image_1",
                assetPath:
                  "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_image_1.webp",
                source: "auto",
                order: 0,
                sourceShotId: "shot_1",
                label: "Shot 1 start",
              },
            ],
            referenceAudios: [],
            videoAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
            thumbnailAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/thumbnail.webp",
            durationSec: 8,
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
            sceneId: "scene_1",
            segmentId: "segment_2",
            segmentOrder: 2,
            segmentName: "Departure",
            segmentSummary: "Rin follows the contact into the brighter alley.",
            shotCount: 1,
            sourceShotIds: ["shot_3"],
            status: "approved",
            promptTextSeed: "seed prompt 2",
            promptTextCurrent: "current prompt 2",
            promptUpdatedAt: "2026-03-25T01:02:00.000Z",
            referenceImages: [
              {
                id: "ref_image_2",
                assetPath:
                  "videos/batches/video_batch_1/segments/scene_1__segment_2/references/images/ref_image_2.webp",
                source: "auto",
                order: 0,
                sourceShotId: "shot_3",
                label: "Shot 3 start",
              },
            ],
            referenceAudios: [
              {
                id: "ref_audio_1",
                assetPath:
                  "videos/batches/video_batch_1/segments/scene_1__segment_2/references/audios/ref_audio_1.wav",
                source: "manual",
                order: 0,
                label: "Dialogue guide",
                durationSec: 2.5,
              },
            ],
            videoAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_2/current.mp4",
            thumbnailAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_2/thumbnail.webp",
            durationSec: 5,
            provider: "seedance",
            model: "seedance-2.0-pro",
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

    expect(result.currentBatch).toEqual(
      expect.objectContaining({
        segmentCount: 2,
        approvedSegmentCount: 1,
      }),
    );
    expect(result.segments[0]).toEqual(
      expect.objectContaining({
        segmentName: "Arrival",
        segmentSummary: "Rin enters the flooded market and scans the crowd.",
        shotCount: 2,
        sourceShotIds: ["shot_1", "shot_2"],
        referenceImages: [
          expect.objectContaining({
            sourceShotId: "shot_1",
            source: "auto",
          }),
        ],
        referenceAudios: [],
        status: "in_review",
        videoAssetPath: null,
        thumbnailAssetPath: null,
      }),
    );
    expect(result.segments[1]).toEqual(
      expect.objectContaining({
        segmentName: "Departure",
        sourceShotIds: ["shot_3"],
        referenceAudios: [
          expect.objectContaining({
            source: "manual",
            durationSec: 2.5,
          }),
        ],
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
        generateVideoPrompt: vi.fn(),
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
            sceneId: "scene_1",
            segmentId: "segment_1",
            segmentOrder: 1,
            segmentName: "Arrival",
            segmentSummary: "Rin enters the flooded market and scans the crowd.",
            shotCount: 2,
            sourceShotIds: ["shot_1", "shot_2"],
            status: "generating",
            promptTextSeed: "seed prompt 1",
            promptTextCurrent: "current prompt 1",
            promptUpdatedAt: "2026-03-25T01:01:00.000Z",
            referenceImages: [
              {
                id: "ref_image_1",
                assetPath:
                  "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_image_1.webp",
                source: "auto",
                order: 0,
                sourceShotId: "shot_1",
                label: "Shot 1 start",
              },
            ],
            referenceAudios: [],
            videoAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/current.mp4",
            thumbnailAssetPath:
              "videos/batches/video_batch_1/segments/scene_1__segment_1/thumbnail.webp",
            durationSec: 8,
            provider: "seedance",
            model: "seedance-2.0-pro",
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

  it("surfaces prompt-ready stale generating segments as in_review", async () => {
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
        generateVideoPrompt: vi.fn(),
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
            sceneId: "scene_1",
            segmentId: "segment_1",
            segmentOrder: 1,
            segmentName: "Arrival",
            segmentSummary: "Rin enters the flooded market and scans the crowd.",
            shotCount: 2,
            sourceShotIds: ["shot_1", "shot_2"],
            status: "generating",
            promptTextSeed: "seed prompt 1",
            promptTextCurrent: "current prompt 1",
            promptUpdatedAt: "2026-03-25T01:00:00.000Z",
            referenceImages: [],
            referenceAudios: [],
            videoAssetPath: null,
            thumbnailAssetPath: null,
            durationSec: null,
            provider: null,
            model: null,
            updatedAt: "2026-03-25T01:00:00.000Z",
            approvedAt: null,
            sourceTaskId: null,
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

    expect(result.currentBatch).toEqual(
      expect.objectContaining({
        segmentCount: 1,
        approvedSegmentCount: 0,
      }),
    );
    expect(result.segments[0]).toEqual(
      expect.objectContaining({
        id: "video_segment_1",
        status: "in_review",
        sourceTaskId: null,
        videoAssetPath: null,
        thumbnailAssetPath: null,
      }),
    );
  });

  it("repairs empty video prompts from the current shot script before returning segments", async () => {
    const repairedShot = {
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_1",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentName: "Arrival",
      segmentSummary: "Rin arrives at the flooded market.",
      shotCount: 2,
      sourceShotIds: ["shot_1", "shot_2"],
      referenceImages: [
        {
          id: "ref_image_1",
          assetPath:
            "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_image_1.webp",
          source: "auto" as const,
          order: 0,
          sourceShotId: "shot_1",
          label: "Shot 1 start",
        },
      ],
      referenceAudios: [],
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      shotOrder: 1,
      frameDependency: "start_frame_only" as const,
      status: "failed" as const,
      promptTextSeed: "",
      promptTextCurrent: "",
      promptUpdatedAt: "",
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: 3,
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
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "shot_ref_1",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          shotId: "shot_1",
          storageDir: "ignored",
          manifestRelPath: "ignored",
          updatedAt: "2026-03-25T00:18:00.000Z",
          startFrame: {
            id: "frame_start_1",
            promptTextSeed: "seed",
            promptTextCurrent: "current",
            imageAssetPath: "images/start.png",
            imageWidth: 1024,
            imageHeight: 576,
            provider: null,
            model: null,
            updatedAt: "2026-03-25T00:18:00.000Z",
            currentImageRelPath: "ignored",
            currentMetadataRelPath: "ignored",
            promptSeedRelPath: "ignored",
            promptCurrentRelPath: "ignored",
            planningRelPath: "ignored",
            versionsStorageDir: "ignored",
            promptVersionsStorageDir: "ignored",
          },
          endFrame: null,
        },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn(),
      updateFrame: vi.fn(),
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
      listSegmentsByBatchId: vi.fn().mockResolvedValue([repairedShot]),
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
          shotCount: 2,
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
                  shotCode: "SC01-SG01-SH01",
                  durationSec: 3,
                  frameDependency: "start_frame_only",
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
                {
                  id: "shot_2",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 2,
                  shotCode: "SC01-SG01-SH02",
                  durationSec: 5,
                  frameDependency: "start_and_end_frame",
                  purpose: "Discovery",
                  visual: "Rin spots the route forward.",
                  subject: "Rin",
                  action: "Rin points toward the brighter alley beyond the stalls.",
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
      shotImageRepository,
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
            "以<<<image_1>>>为首帧锚点，林进入积水市场并短暂停步，口型不可见，无对白，保留雨声与脚步踩水声。",
          dialoguePlan: "无明确台词。",
          audioPlan: "雨声与脚步踩水声。",
          visualGuardrails: "保持林的外观与服装稳定。",
          rationale: "修复缺失提示词时仍保留环境声与动作。",
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
        }),
      },
      videoRepository,
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_1",
        promptTextSeed:
          "以<<<image_1>>>为首帧锚点，林进入积水市场并短暂停步，口型不可见，无对白，保留雨声与脚步踩水声。",
        promptTextCurrent:
          "以<<<image_1>>>为首帧锚点，林进入积水市场并短暂停步，口型不可见，无对白，保留雨声与脚步踩水声。",
      }),
    );
    expect(shotImageRepository.listShotsByBatchId).toHaveBeenCalledWith("image_batch_1");
    expect(result.segments[0]).toEqual(
      expect.objectContaining({
        promptTextSeed:
          "以<<<image_1>>>为首帧锚点，林进入积水市场并短暂停步，口型不可见，无对白，保留雨声与脚步踩水声。",
        promptTextCurrent:
          "以<<<image_1>>>为首帧锚点，林进入积水市场并短暂停步，口型不可见，无对白，保留雨声与脚步踩水声。",
      }),
    );
  });

  it("returns the original segments when prompt repair is blocked by the provider", async () => {
    const blockedShot = {
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_1",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentName: "Arrival",
      segmentSummary: "Rin arrives at the flooded market.",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      referenceImages: [
        {
          id: "ref_image_1",
          assetPath:
            "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_image_1.webp",
          source: "auto" as const,
          order: 0,
          sourceShotId: "shot_1",
          label: "Shot 1 start",
        },
      ],
      referenceAudios: [],
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      shotOrder: 1,
      frameDependency: "start_frame_only" as const,
      status: "failed" as const,
      promptTextSeed: "",
      promptTextCurrent: "",
      promptUpdatedAt: "",
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: 3,
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
      listSegmentsByBatchId: vi.fn().mockResolvedValue([blockedShot]),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn(),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };
    const videoPromptProvider = {
      generateVideoPrompt: vi
        .fn()
        .mockRejectedValue(
          new Error(
            "Gemini video prompt provider request failed with status 500; code=request_body_blocked; message=request blocked by Google Gemini (PROHIBITED_CONTENT)",
          ),
        ),
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
          totalDurationSec: 3,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "Arrival",
              summary: "Rin arrives at the flooded market.",
              durationSec: 3,
              status: "approved",
              lastGeneratedAt: "2026-03-25T00:17:00.000Z",
              approvedAt: "2026-03-25T00:18:00.000Z",
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "SC01-SG01-SH01",
                  durationSec: 3,
                  frameDependency: "start_frame_only",
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
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listFramesByBatchId: vi.fn(),
        listShotsByBatchId: vi.fn().mockResolvedValue([
          {
            id: "shot_ref_1",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            sceneId: "scene_1",
            segmentId: "segment_1",
            shotId: "shot_1",
            storageDir: "ignored",
            manifestRelPath: "ignored",
            updatedAt: "2026-03-25T00:18:00.000Z",
            startFrame: {
              id: "frame_start_1",
              promptTextSeed: "seed",
              promptTextCurrent: "current",
              imageAssetPath: "images/start.png",
              imageWidth: 1024,
              imageHeight: 576,
              provider: null,
              model: null,
              updatedAt: "2026-03-25T00:18:00.000Z",
              currentImageRelPath: "ignored",
              currentMetadataRelPath: "ignored",
              promptSeedRelPath: "ignored",
              promptCurrentRelPath: "ignored",
              planningRelPath: "ignored",
              versionsStorageDir: "ignored",
              promptVersionsStorageDir: "ignored",
            },
            endFrame: null,
          },
        ]),
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
      },
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
      videoPromptProvider,
      videoRepository,
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(videoPromptProvider.generateVideoPrompt).toHaveBeenCalledTimes(1);
    expect(videoRepository.updateSegment).not.toHaveBeenCalled();
    expect(result.segments).toEqual([
      expect.objectContaining({
        id: "video_segment_1",
        projectId: "proj_1",
        batchId: "video_batch_1",
        sourceImageBatchId: "image_batch_1",
        sourceShotScriptId: "shot_script_1",
        sceneId: "scene_1",
        segmentId: "segment_1",
        segmentOrder: 1,
        segmentName: "Arrival",
        segmentSummary: "Rin arrives at the flooded market.",
        shotCount: 1,
        sourceShotIds: ["shot_1"],
        status: "failed",
        promptTextSeed: "",
        promptTextCurrent: "",
        promptUpdatedAt: "",
        referenceImages: blockedShot.referenceImages,
        referenceAudios: [],
        videoAssetPath: null,
        thumbnailAssetPath: null,
        durationSec: 3,
        provider: null,
        model: null,
        updatedAt: "2026-03-25T01:00:00.000Z",
        approvedAt: null,
        sourceTaskId: null,
      }),
    ]);
    expect(result.segments[0]).not.toHaveProperty("projectStorageDir");
    expect(result.segments[0]).not.toHaveProperty("shotId");
    expect(result.segments[0]).not.toHaveProperty("shotCode");
    expect(result.segments[0]).not.toHaveProperty("shotOrder");
    expect(result.segments[0]).not.toHaveProperty("frameDependency");
    expect(result.segments[0]).not.toHaveProperty("storageDir");
    expect(result.segments[0]).not.toHaveProperty("currentVideoRelPath");
    expect(result.segments[0]).not.toHaveProperty("currentMetadataRelPath");
    expect(result.segments[0]).not.toHaveProperty("thumbnailRelPath");
    expect(result.segments[0]).not.toHaveProperty("versionsStorageDir");
  });
});
