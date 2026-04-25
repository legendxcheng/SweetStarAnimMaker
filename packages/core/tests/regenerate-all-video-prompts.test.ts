import { describe, expect, it, vi } from "vitest";

import { createRegenerateAllVideoPromptsUseCase } from "../src/index";

describe("regenerate all video prompts use case", () => {
  it("rebuilds promptTextCurrent for every segment in the current video batch", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
        currentVideoBatchId: "video_batch_1",
        currentCharacterSheetBatchId: "char_batch_1",
        currentSceneSheetBatchId: "scene_batch_1",
        videoReferenceStrategy: "with_frame_refs",
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
    const segments = [
      {
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
        shotCode: "S01-SG01-SH01",
        segmentId: "segment_1",
        sceneId: "scene_1",
        segmentOrder: 1,
        shotOrder: 1,
        frameDependency: "start_frame_only" as const,
        status: "approved" as const,
        promptTextSeed: "seed 1",
        promptTextCurrent: "old 1",
        promptUpdatedAt: "2026-03-25T00:18:00.000Z",
        referenceImages: [
          {
            id: "ref_image_1",
            assetPath: "videos/batches/video_batch_1/segments/scene_1__segment_1/references/images/ref_image_1.png",
            source: "auto" as const,
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
        segmentName: "Turn",
        segmentSummary: "Rin turns toward the submerged crossing.",
        shotCount: 1,
        sourceShotIds: ["shot_2"],
        shotId: "shot_2",
        shotCode: "S01-SG02-SH01",
        segmentId: "segment_2",
        sceneId: "scene_1",
        segmentOrder: 2,
        shotOrder: 2,
        frameDependency: "start_and_end_frame" as const,
        status: "failed" as const,
        promptTextSeed: "seed 2",
        promptTextCurrent: "old 2",
        promptUpdatedAt: "2026-03-25T00:18:00.000Z",
        referenceImages: [
          {
            id: "ref_image_2",
            assetPath: "videos/batches/video_batch_1/segments/scene_1__segment_2/references/images/ref_image_2.png",
            source: "auto" as const,
            order: 0,
            sourceShotId: "shot_2",
            label: "Shot 2 start",
          },
        ],
        referenceAudios: [
          {
            id: "ref_audio_2",
            assetPath: "videos/batches/video_batch_1/segments/scene_1__segment_2/references/audios/ref_audio_2.wav",
            source: "manual" as const,
            order: 0,
            label: "Water guide",
            durationSec: 1.5,
          },
        ],
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
        shotCount: 2,
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
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "S01-SG01-SH01",
                  durationSec: 8,
                  frameDependency: "start_frame_only",
                  purpose: "Arrival",
                  visual: "Rin enters the flooded market.",
                  subject: "Rin",
                  action: "Rin steps into the market and looks forward.",
                  dialogue: null,
                  os: null,
                  audio: "雨声、脚步声。",
                  transitionHint: null,
                  continuityNotes: null,
                },
              ],
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
              shots: [
                {
                  id: "shot_2",
                  sceneId: "scene_1",
                  segmentId: "segment_2",
                  order: 1,
                  shotCode: "S01-SG02-SH01",
                  durationSec: 8,
                  frameDependency: "start_and_end_frame",
                  purpose: "Turn",
                  visual: "Rin turns toward the submerged crossing.",
                  subject: "Rin",
                  action: "Rin pivots and faces the flooded crossing.",
                  dialogue: null,
                  os: null,
                  audio: "水流声。",
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
            sceneId: "scene_1",
            segmentId: "segment_1",
            shotId: "shot_1",
            shotCode: "S01-SG01-SH01",
            startFrame: {
              imageAssetPath:
                "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
            },
            endFrame: null,
          },
          {
            sceneId: "scene_1",
            segmentId: "segment_2",
            shotId: "shot_2",
            shotCode: "S01-SG02-SH01",
            startFrame: {
              imageAssetPath:
                "images/batches/image_batch_1/shots/scene_1__segment_2__shot_2/start-frame/current.png",
            },
            endFrame: null,
          },
        ]),
        insertFrame: vi.fn(),
        insertShot: vi.fn(),
        findFrameById: vi.fn(),
        findShotById: vi.fn(),
        updateFrame: vi.fn(),
        updateShot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn().mockResolvedValue([
          {
            id: "character_1",
            characterName: "Rin",
            imageAssetPath: "character-sheets/batches/char_batch_1/characters/character_1/current.png",
            status: "approved",
          },
        ]),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      sceneSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listScenesByBatchId: vi.fn().mockResolvedValue([
          {
            id: "scene_sheet_market",
            sceneName: "Flooded Market",
            scenePurpose: "Arrival",
            promptTextCurrent: "Flooded Market with rain and neon reflections.",
            constraintsText: "Keep rain and neon reflections.",
            imageAssetPath: "scene-sheets/batches/scene_batch_1/scenes/scene_sheet_market/current.png",
            status: "approved",
          },
        ]),
        insertScene: vi.fn(),
        findSceneById: vi.fn(),
        updateScene: vi.fn(),
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
        generateVideoPrompt: vi
          .fn()
          .mockResolvedValueOnce({
            finalPrompt: "以<<<image_1>>>为首帧锚点，林进入积水市场，保留脚步与雨声。",
            dialoguePlan: "无明确台词。",
            audioPlan: "雨声、脚步声。",
            visualGuardrails: "保持单镜头推进。",
            rationale: "围绕到达动作组织提示词。",
            provider: "gemini",
            model: "gemini-3.1-pro-preview",
            selectedCharacterIds: ["character_1"],
            selectedSceneId: "scene_sheet_market",
          })
          .mockResolvedValueOnce({
            finalPrompt: "以<<<image_1>>>为首帧锚点，林转向被水淹没的路口，无对白，强调水流声。",
            dialoguePlan: "无明确台词。",
            audioPlan: "水流声。",
            visualGuardrails: "保持空间方向连续。",
            rationale: "围绕转身动作和环境声组织提示词。",
            provider: "gemini",
            model: "gemini-3.1-pro-preview",
            selectedCharacterIds: ["character_1"],
            selectedSceneId: "scene_sheet_market",
          }),
      },
      clock: { now: () => "2026-03-25T00:20:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(videoRepository.updateSegment).toHaveBeenCalledTimes(2);
    expect(videoRepository.updateSegment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "video_segment_1",
        status: "in_review",
        approvedAt: null,
      }),
    );
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]?.referenceImages.map((reference) => reference.assetPath)).toEqual([
      "scene-sheets/batches/scene_batch_1/scenes/scene_sheet_market/current.png",
      "character-sheets/batches/char_batch_1/characters/character_1/current.png",
      "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
    ]);
    expect(result.segments[1]?.referenceAudios[0]?.assetPath).toContain("ref_audio_2.wav");
    expect(result.currentBatch.approvedSegmentCount).toBe(0);
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "videos_in_review",
      updatedAt: "2026-03-25T00:20:00.000Z",
    });
    expect(result.segments[0]?.status).toBe("in_review");
    expect(result.segments[0]?.approvedAt).toBeNull();
    expect(result.segments[0]?.promptTextCurrent).toBe(
      "以<<<image_1>>>为首帧锚点，林进入积水市场，保留脚步与雨声。",
    );
    expect(result.segments[1]?.promptTextCurrent).toBe(
      "以<<<image_1>>>为首帧锚点，林转向被水淹没的路口，无对白，强调水流声。",
    );
  });
});
