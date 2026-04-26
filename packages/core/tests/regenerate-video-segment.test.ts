import { describe, expect, it, vi } from "vitest";

import { createRegenerateVideoSegmentUseCase } from "../src/index";

describe("regenerate video segment use case", () => {
  it("drops frame references from the current segment when project video reference strategy excludes frame refs", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1",
        status: "videos_in_review",
        currentVideoBatchId: "video_batch_1",
        videoReferenceStrategy: "without_frame_refs",
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
    const currentSegment = {
      id: "video_segment_1",
      batchId: "video_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1",
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      segmentName: "Arrival",
      segmentSummary: "Rin arrives.",
      shotCount: 1,
      sourceShotIds: ["shot_1"],
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      shotId: "shot_1",
      shotCode: "S01_01_001",
      shotOrder: 1,
      frameDependency: "start_and_end_frame" as const,
      status: "in_review" as const,
      promptTextSeed: "seed prompt",
      promptTextCurrent: "current prompt",
      promptUpdatedAt: "2026-03-25T00:00:00.000Z",
      referenceImages: [
        {
          id: "scene_ref",
          assetPath: "scene-sheets/scene/current.png",
          source: "auto" as const,
          order: 0,
          sourceShotId: null,
          label: "Scene City",
        },
        {
          id: "character_ref",
          assetPath: "character-sheets/character/current.png",
          source: "auto" as const,
          order: 1,
          sourceShotId: null,
          label: "Character Rin",
        },
        {
          id: "start_ref",
          assetPath: "images/shot/start-frame/current.png",
          source: "auto" as const,
          order: 2,
          sourceShotId: "shot_1",
          label: "S01_01_001 start",
          frameRole: "first_frame" as const,
        },
        {
          id: "end_ref",
          assetPath: "images/shot/end-frame/current.png",
          source: "auto" as const,
          order: 3,
          sourceShotId: "shot_1",
          label: "S01_01_001 end",
          frameRole: "last_frame" as const,
        },
      ],
      referenceAudios: [],
      videoAssetPath: null,
      thumbnailAssetPath: null,
      durationSec: 15,
      provider: null,
      model: null,
      approvedAt: null,
      updatedAt: "2026-03-25T00:00:00.000Z",
      sourceTaskId: null,
      storageDir: "ignored",
      currentVideoRelPath: "ignored",
      currentMetadataRelPath: "ignored",
      thumbnailRelPath: "ignored",
      versionsStorageDir: "ignored",
    };
    const videoRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listSegmentsByBatchId: vi.fn(),
      insertSegment: vi.fn(),
      findSegmentById: vi.fn().mockResolvedValue(currentSegment),
      findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
      findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    };
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn(),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };

    const useCase = createRegenerateVideoSegmentUseCase({
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
          updatedAt: "2026-03-25T00:00:00.000Z",
          approvedAt: "2026-03-25T00:00:00.000Z",
          segmentCount: 1,
          shotCount: 1,
          totalDurationSec: 15,
          segments: [
            {
              segmentId: "segment_1",
              sceneId: "scene_1",
              order: 1,
              name: "Arrival",
              summary: "Rin arrives.",
              durationSec: 15,
              status: "approved",
              lastGeneratedAt: "2026-03-25T00:00:00.000Z",
              approvedAt: "2026-03-25T00:00:00.000Z",
              shots: [
                {
                  id: "shot_1",
                  sceneId: "scene_1",
                  segmentId: "segment_1",
                  order: 1,
                  shotCode: "S01_01_001",
                  durationSec: 15,
                  frameDependency: "start_and_end_frame",
                  purpose: "Arrival",
                  visual: "Rin arrives.",
                  subject: "Rin",
                  action: "Rin runs.",
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
            sceneId: "scene_1",
            segmentId: "segment_1",
            shotId: "shot_1",
            frameDependency: "start_and_end_frame",
            startFrame: {
              id: "frame_start",
              imageAssetPath: "images/shot/start-frame/current.png",
              imageWidth: 1024,
              imageHeight: 1024,
            },
            endFrame: {
              id: "frame_end",
              imageAssetPath: "images/shot/end-frame/current.png",
              imageWidth: 1024,
              imageHeight: 1024,
            },
          },
        ]),
        insertFrame: vi.fn(),
        insertShot: vi.fn(),
        findFrameById: vi.fn(),
        findShotById: vi.fn(),
        updateFrame: vi.fn(),
        updateShot: vi.fn(),
      },
      videoRepository,
      taskRepository,
      taskFileStorage,
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: () => "task_regenerate_segment" },
      clock: { now: () => "2026-03-25T00:10:00.000Z" },
    });

    await useCase.execute({ projectId: "proj_1", videoId: "video_segment_1" });

    expect(videoRepository.updateSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video_segment_1",
        referenceImages: [
          expect.objectContaining({ id: "scene_ref", order: 0 }),
          expect.objectContaining({ id: "character_ref", order: 1 }),
        ],
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_regenerate_segment" }),
      input: expect.not.objectContaining({
        referenceImages: expect.arrayContaining([
          expect.objectContaining({ frameRole: "first_frame" }),
          expect.objectContaining({ frameRole: "last_frame" }),
        ]),
      }),
    });
  });
});
