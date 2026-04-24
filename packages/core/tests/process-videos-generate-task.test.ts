import { describe, expect, it, vi } from "vitest";

import { createProcessVideosGenerateTaskUseCase } from "../src/index";

describe("process videos generate task use case", () => {
  it("uses frame references when the task strategy is with_frame_refs", async () => {
    const harness = createHarness({
      taskInputOverrides: {
        videoReferenceStrategy: "with_frame_refs",
      },
    });

    await harness.useCase.execute({ taskId: "task_videos_1" });

    expect(harness.videoRepository.insertSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
            sourceShotId: "shot_1",
            order: 0,
          }),
          expect.objectContaining({
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/start-frame/current.png",
            sourceShotId: "shot_2",
            order: 1,
          }),
        ],
      }),
    );
    expect(harness.taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_segment_video_1" }),
      input: expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            id: "video_ref_image_segment_1_shot_1_start_frame",
            sourceShotId: "shot_1",
          }),
          expect.objectContaining({
            id: "video_ref_image_segment_1_shot_2_start_frame",
            sourceShotId: "shot_2",
          }),
        ],
      }),
    });
  });

  it("keeps auto aligned with frame references for now", async () => {
    const harness = createHarness({
      taskInputOverrides: {
        videoReferenceStrategy: "auto",
      },
    });

    await harness.useCase.execute({ taskId: "task_videos_1" });

    expect(harness.videoRepository.insertSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
          }),
          expect.objectContaining({
            assetPath:
              "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/start-frame/current.png",
          }),
        ],
      }),
    );
  });

  it("uses approved scene-sheet and character-sheet images when the task strategy is without_frame_refs", async () => {
    const harness = createHarness({
      taskInputOverrides: {
        videoReferenceStrategy: "without_frame_refs",
      },
    });

    await harness.useCase.execute({ taskId: "task_videos_1" });

    expect(harness.videoRepository.insertSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            id: "video_ref_image_segment_1_scene_scene_1",
            assetPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/current.png",
            sourceShotId: null,
            order: 0,
            label: "Scene scene_1",
          }),
          expect.objectContaining({
            id: "video_ref_image_segment_1_character_character_1",
            assetPath: "character-sheets/batches/char_batch_v1/characters/character_1/current.png",
            sourceShotId: null,
            order: 1,
            label: "Character Rin",
          }),
          expect.objectContaining({
            id: "video_ref_image_segment_1_character_character_2",
            assetPath: "character-sheets/batches/char_batch_v1/characters/character_2/current.png",
            sourceShotId: null,
            order: 2,
            label: "Character Contact",
          }),
        ],
      }),
    );
    expect(harness.taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_segment_video_1" }),
      input: expect.objectContaining({
        referenceImages: [
          expect.objectContaining({
            id: "video_ref_image_segment_1_scene_scene_1",
          }),
          expect.objectContaining({
            id: "video_ref_image_segment_1_character_character_1",
          }),
          expect.objectContaining({
            id: "video_ref_image_segment_1_character_character_2",
          }),
        ],
      }),
    });
  });

  it("sets the current video batch before enqueuing shot video tasks", async () => {
    const callOrder: string[] = [];
    const harness = createHarness({
      projectRepositoryOverrides: {
        updateCurrentVideoBatch: vi.fn().mockImplementation(() => {
          callOrder.push("updateCurrentVideoBatch");
        }),
      },
      taskQueueOverrides: {
        enqueue: vi.fn().mockImplementation(() => {
          callOrder.push("enqueue");
        }),
      },
    });

    await harness.useCase.execute({ taskId: "task_videos_1" });

    expect(callOrder).toEqual(["updateCurrentVideoBatch", "enqueue"]);
  });

  it("marks the task failed and restores the project status when batch orchestration errors", async () => {
    const harness = createHarness({
      videoRepositoryOverrides: {
        insertBatch: vi.fn().mockRejectedValue(new Error("batch insert failed")),
      },
    });

    await expect(harness.useCase.execute({ taskId: "task_videos_1" })).rejects.toThrow(
      "batch insert failed",
    );

    expect(harness.taskFileStorage.appendTaskLog).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_videos_1" }),
      message: "videos batch failed: batch insert failed",
    });
    expect(harness.taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_videos_1",
      errorMessage: "batch insert failed",
      updatedAt: "2026-03-25T00:13:00.000Z",
      finishedAt: "2026-03-25T00:13:00.000Z",
    });
    expect(harness.projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "images_approved",
      updatedAt: "2026-03-25T00:13:00.000Z",
    });
  });
});

function createHarness(input?: {
  taskInputOverrides?: Partial<{
    videoReferenceStrategy: "auto" | "with_frame_refs" | "without_frame_refs";
  }>;
  projectRepositoryOverrides?: Record<string, unknown>;
  taskQueueOverrides?: Record<string, unknown>;
  videoRepositoryOverrides?: Record<string, unknown>;
}) {
  const taskRepository = {
    insert: vi.fn(),
    findById: vi.fn().mockResolvedValue({
      id: "task_videos_1",
      projectId: "proj_1",
      type: "videos_generate",
      queueName: "videos-generate",
      storageDir: "projects/proj_1-my-story/tasks/task_videos_1",
      inputRelPath: "tasks/task_videos_1/input.json",
      outputRelPath: "tasks/task_videos_1/output.json",
      logRelPath: "tasks/task_videos_1/log.txt",
    }),
    findLatestByProjectId: vi.fn(),
    delete: vi.fn(),
    markRunning: vi.fn(),
    markSucceeded: vi.fn(),
    markFailed: vi.fn(),
  };
  const projectRepository = {
    insert: vi.fn(),
    findById: vi.fn().mockResolvedValue({
      id: "proj_1",
      storageDir: "projects/proj_1-my-story",
      currentCharacterSheetBatchId: "char_batch_v1",
      currentSceneSheetBatchId: "scene_batch_v1",
      currentVideoBatchId: null,
    }),
    listAll: vi.fn(),
    updatePremiseMetadata: vi.fn(),
    updateCurrentMasterPlot: vi.fn(),
    updateCurrentCharacterSheetBatch: vi.fn(),
    updateCurrentSceneSheetBatch: vi.fn(),
    updateCurrentStoryboard: vi.fn(),
    updateCurrentShotScript: vi.fn(),
    updateCurrentImageBatch: vi.fn(),
    updateCurrentVideoBatch: vi.fn(),
    updateStatus: vi.fn(),
    ...(input?.projectRepositoryOverrides ?? {}),
  };
  const taskFileStorage = {
    createTaskArtifacts: vi.fn(),
    readTaskInput: vi.fn().mockResolvedValue({
      taskId: "task_videos_1",
      projectId: "proj_1",
      taskType: "videos_generate",
      videoReferenceStrategy: "with_frame_refs",
      sourceImageBatchId: "image_batch_v1",
      imageBatch: {
        id: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        shotCount: 2,
        totalRequiredFrameCount: 3,
        approvedShotCount: 2,
        updatedAt: "2026-03-25T00:10:00.000Z",
      },
      sourceShotScriptId: "shot_script_v1",
      shotScript: {
        id: "shot_script_v1",
        title: "Episode 1",
        sourceStoryboardId: "storyboard_v1",
        sourceTaskId: "task_shot_script",
        updatedAt: "2026-03-25T00:09:00.000Z",
        approvedAt: "2026-03-25T00:10:00.000Z",
        segmentCount: 1,
        shotCount: 2,
        totalDurationSec: 8,
        segments: [
          {
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            name: "Arrival",
            summary: "Rin arrives and follows the contact through the market.",
            durationSec: 8,
            status: "approved",
            lastGeneratedAt: "2026-03-25T00:09:00.000Z",
            approvedAt: "2026-03-25T00:10:00.000Z",
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
                visual: "Rin enters the flooded market.",
                subject: "Rin",
                action: "Rin steps into the flooded market and scans ahead.",
                dialogue: null,
                os: null,
                audio: null,
                transitionHint: null,
                continuityNotes: "Keep her satchel visible.",
              },
              {
                id: "shot_2",
                sceneId: "scene_1",
                segmentId: "segment_1",
                order: 2,
                shotCode: "SC01-SG01-SH02",
                durationSec: 5,
                frameDependency: "start_and_end_frame",
                purpose: "Follow",
                visual: "Rin follows the contact through the brighter aisle.",
                subject: "Rin",
                action: "Rin turns and follows the contact deeper into the market.",
                dialogue: null,
                os: null,
                audio: null,
                transitionHint: null,
                continuityNotes: "Keep water flow left to right.",
              },
            ],
          },
        ],
      },
      promptTemplateKey: "segment_video.generate",
      ...(input?.taskInputOverrides ?? {}),
    }),
    writeTaskOutput: vi.fn(),
    appendTaskLog: vi.fn(),
  };
  const shotImageRepository = {
    insertBatch: vi.fn(),
    findBatchById: vi.fn(),
    findCurrentBatchByProjectId: vi.fn(),
    listFramesByBatchId: vi.fn(),
    listShotsByBatchId: vi.fn().mockResolvedValue([
      {
        id: "shot_ref_1",
        batchId: "image_batch_v1",
        projectId: "proj_1",
        sourceShotScriptId: "shot_script_v1",
        shotId: "shot_1",
        shotCode: "SC01-SG01-SH01",
        sceneId: "scene_1",
        segmentId: "segment_1",
        segmentOrder: 1,
        shotOrder: 1,
        durationSec: 3,
        frameDependency: "start_frame_only",
        referenceStatus: "approved",
        updatedAt: "2026-03-25T00:10:00.000Z",
        startFrame: {
          id: "frame_start_1",
          frameType: "start_frame",
          imageStatus: "approved",
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: null,
      },
      {
        id: "shot_ref_2",
        batchId: "image_batch_v1",
        projectId: "proj_1",
        sourceShotScriptId: "shot_script_v1",
        shotId: "shot_2",
        shotCode: "SC01-SG01-SH02",
        sceneId: "scene_1",
        segmentId: "segment_1",
        segmentOrder: 1,
        shotOrder: 2,
        durationSec: 5,
        frameDependency: "start_and_end_frame",
        referenceStatus: "approved",
        updatedAt: "2026-03-25T00:10:00.000Z",
        startFrame: {
          id: "frame_start_2",
          frameType: "start_frame",
          imageStatus: "approved",
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/start-frame/current.png",
          imageWidth: 1024,
          imageHeight: 1024,
        },
        endFrame: {
          id: "frame_end_2",
          frameType: "end_frame",
          imageStatus: "approved",
          imageAssetPath:
            "images/batches/image_batch_v1/shots/scene_1__segment_1__shot_2/start-frame/current.png",
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
  };
  const characterSheetRepository = {
    insertBatch: vi.fn(),
    findBatchById: vi.fn(),
    listCharactersByBatchId: vi.fn().mockResolvedValue([
      {
        id: "character_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: "char_batch_v1",
        sourceMasterPlotId: "master_plot_v1",
        characterName: "Rin",
        promptTextGenerated: "Generated Rin prompt",
        promptTextCurrent: "Current Rin prompt",
        referenceImages: [],
        imageAssetPath: "character-sheets/batches/char_batch_v1/characters/character_1/current.png",
        imageWidth: 1024,
        imageHeight: 1024,
        provider: "ark-character-sheet-image",
        model: "seedream",
        status: "approved",
        updatedAt: "2026-03-25T00:08:00.000Z",
        approvedAt: "2026-03-25T00:08:30.000Z",
        sourceTaskId: "task_character_1",
        storageDir: "projects/proj_1-my-story/character-sheets/batches/char_batch_v1/characters/character_1",
        currentImageRelPath: "character-sheets/batches/char_batch_v1/characters/character_1/current.png",
        currentMetadataRelPath: "character-sheets/batches/char_batch_v1/characters/character_1/current.json",
        promptGeneratedRelPath: "character-sheets/batches/char_batch_v1/characters/character_1/prompt.generated.txt",
        promptCurrentRelPath: "character-sheets/batches/char_batch_v1/characters/character_1/prompt.current.txt",
        promptVariablesRelPath: "character-sheets/batches/char_batch_v1/characters/character_1/prompt.variables.json",
        imagePromptRelPath: "character-sheets/batches/char_batch_v1/characters/character_1/image-prompt.txt",
        versionsStorageDir: "projects/proj_1-my-story/character-sheets/batches/char_batch_v1/characters/character_1/versions",
      },
      {
        id: "character_2",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: "char_batch_v1",
        sourceMasterPlotId: "master_plot_v1",
        characterName: "Contact",
        promptTextGenerated: "Generated Contact prompt",
        promptTextCurrent: "Current Contact prompt",
        referenceImages: [],
        imageAssetPath: "character-sheets/batches/char_batch_v1/characters/character_2/current.png",
        imageWidth: 1024,
        imageHeight: 1024,
        provider: "ark-character-sheet-image",
        model: "seedream",
        status: "approved",
        updatedAt: "2026-03-25T00:08:00.000Z",
        approvedAt: "2026-03-25T00:08:30.000Z",
        sourceTaskId: "task_character_2",
        storageDir: "projects/proj_1-my-story/character-sheets/batches/char_batch_v1/characters/character_2",
        currentImageRelPath: "character-sheets/batches/char_batch_v1/characters/character_2/current.png",
        currentMetadataRelPath: "character-sheets/batches/char_batch_v1/characters/character_2/current.json",
        promptGeneratedRelPath: "character-sheets/batches/char_batch_v1/characters/character_2/prompt.generated.txt",
        promptCurrentRelPath: "character-sheets/batches/char_batch_v1/characters/character_2/prompt.current.txt",
        promptVariablesRelPath: "character-sheets/batches/char_batch_v1/characters/character_2/prompt.variables.json",
        imagePromptRelPath: "character-sheets/batches/char_batch_v1/characters/character_2/image-prompt.txt",
        versionsStorageDir: "projects/proj_1-my-story/character-sheets/batches/char_batch_v1/characters/character_2/versions",
      },
    ]),
    insertCharacter: vi.fn(),
    findCharacterById: vi.fn(),
    updateCharacter: vi.fn(),
  };
  const sceneSheetRepository = {
    insertBatch: vi.fn(),
    findBatchById: vi.fn(),
    listScenesByBatchId: vi.fn().mockResolvedValue([
      {
        id: "scene_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: "scene_batch_v1",
        sourceMasterPlotId: "master_plot_v1",
        sourceCharacterSheetBatchId: "char_batch_v1",
        sceneName: "Flooded Market",
        scenePurpose: "Arrival",
        promptTextGenerated: "Generated scene prompt",
        promptTextCurrent: "Current scene prompt",
        constraintsText: "Keep rain and neon reflections.",
        imageAssetPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/current.png",
        imageWidth: 1536,
        imageHeight: 864,
        provider: "turnaround-image",
        model: "scene-model",
        status: "approved",
        updatedAt: "2026-03-25T00:07:00.000Z",
        approvedAt: "2026-03-25T00:07:30.000Z",
        sourceTaskId: "task_scene_1",
        storageDir: "projects/proj_1-my-story/scene-sheets/batches/scene_batch_v1/scenes/scene_1",
        currentImageRelPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/current.png",
        currentMetadataRelPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/current.json",
        promptGeneratedRelPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/prompt.generated.txt",
        promptCurrentRelPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/prompt.current.txt",
        promptVariablesRelPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/prompt.variables.json",
        imagePromptRelPath: "scene-sheets/batches/scene_batch_v1/scenes/scene_1/image-prompt.txt",
        versionsStorageDir: "projects/proj_1-my-story/scene-sheets/batches/scene_batch_v1/scenes/scene_1/versions",
      },
    ]),
    insertScene: vi.fn(),
    findSceneById: vi.fn(),
    updateScene: vi.fn(),
  };
  const videoRepository = {
    insertBatch: vi.fn(),
    findBatchById: vi.fn(),
    findCurrentBatchByProjectId: vi.fn(),
    listSegmentsByBatchId: vi.fn(),
    insertSegment: vi.fn(),
    findSegmentById: vi.fn(),
    findCurrentSegmentByProjectIdAndSegmentId: vi.fn(),
    findCurrentSegmentByProjectIdAndSceneIdAndSegmentId: vi.fn(),
    updateSegment: vi.fn(),
    ...(input?.videoRepositoryOverrides ?? {}),
  };
  const videoStorage = {
    initializePromptTemplate: vi.fn(),
    readPromptTemplate: vi
      .fn()
      .mockResolvedValue("Segment summary: {{segment_summary}}\nShot summary: {{shot_summary}}"),
    writePromptSnapshot: vi.fn(),
    writePromptPlan: vi.fn(),
    writeRawResponse: vi.fn(),
    writeBatchManifest: vi.fn(),
    writeCurrentVideo: vi.fn(),
    writeVideoVersion: vi.fn(),
    resolveProjectAssetPath: vi.fn(),
  };
  const taskQueue = {
    enqueue: vi.fn(),
    ...(input?.taskQueueOverrides ?? {}),
  };
  const videoPromptProvider = {
    generateVideoPrompt: vi.fn().mockRejectedValue(new Error("should not be called")),
  };

  const useCase = createProcessVideosGenerateTaskUseCase({
    taskRepository,
    projectRepository,
    taskFileStorage,
    shotImageRepository,
    characterSheetRepository,
    sceneSheetRepository,
    videoRepository,
    videoStorage,
    videoPromptProvider,
    taskQueue,
    taskIdGenerator: { generateTaskId: () => "task_segment_video_1" },
    clock: {
      now: vi
        .fn()
        .mockReturnValueOnce("2026-03-25T00:12:00.000Z")
        .mockReturnValueOnce("2026-03-25T00:13:00.000Z"),
    },
  });

  return {
    useCase,
    taskRepository,
    projectRepository,
    taskFileStorage,
    shotImageRepository,
    characterSheetRepository,
    sceneSheetRepository,
    videoRepository,
    videoStorage,
    taskQueue,
  };
}
