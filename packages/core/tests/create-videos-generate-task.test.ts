import { describe, expect, it, vi } from "vitest";

import {
  CurrentImageBatchNotFoundError,
  ProjectValidationError,
  createCreateVideosGenerateTaskUseCase,
} from "../src/index";

describe("create videos generate task use case", () => {
  it("creates a pending videos batch task from the approved current image batch and shot script", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260325_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260325_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: null,
        currentCharacterSheetBatchId: null,
        currentSceneSheetBatchId: null,
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: "image_batch_v1",
        currentVideoBatchId: null,
        videoReferenceStrategy: "without_frame_refs",
        status: "images_approved",
        createdAt: "2026-03-25T00:00:00.000Z",
        updatedAt: "2026-03-25T00:10:00.000Z",
        premiseUpdatedAt: "2026-03-25T00:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "image_batch_v1",
        projectId: "proj_20260325_ab12cd",
        projectStorageDir: "projects/proj_20260325_ab12cd-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentCount: 1,
        totalFrameCount: 2,
        storageDir: "projects/proj_20260325_ab12cd-my-story/images/batches/image_batch_v1",
        manifestRelPath: "images/batches/image_batch_v1/manifest.json",
        createdAt: "2026-03-25T00:05:00.000Z",
        updatedAt: "2026-03-25T00:06:00.000Z",
      }),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn().mockResolvedValue([
        { id: "frame_start_1", imageStatus: "approved" },
        { id: "frame_end_1", imageStatus: "approved" },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn(),
      updateFrame: vi.fn(),
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
      readCurrentShotScript: vi.fn().mockResolvedValue({
        id: "shot_script_v1",
        title: "Episode 1 Shot Script",
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
            summary: "Rin reaches the flooded market.",
            durationSec: 8,
            status: "approved",
            lastGeneratedAt: "2026-03-25T00:09:00.000Z",
            approvedAt: "2026-03-25T00:10:00.000Z",
            shots: [],
          },
        ],
      }),
    };
    const storyboardStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
      writeCurrentStoryboard: vi.fn(),
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_v1",
        title: "Episode 1",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "master_plot_v1",
        sourceTaskId: "task_storyboard",
        updatedAt: "2026-03-25T00:08:00.000Z",
        approvedAt: "2026-03-25T00:08:30.000Z",
        scenes: [],
      }),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn(),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
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
    const taskQueue = { enqueue: vi.fn() };

    const useCase = createCreateVideosGenerateTaskUseCase({
      projectRepository,
      shotImageRepository,
      shotScriptStorage,
      storyboardStorage,
      masterPlotStorage: storyboardStorage,
      characterSheetRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: { generateTaskId: () => "task_20260325_videos" },
      clock: { now: () => "2026-03-25T00:11:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_20260325_ab12cd" });

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_20260325_videos" }),
      input: expect.objectContaining({
        taskId: "task_20260325_videos",
        projectId: "proj_20260325_ab12cd",
        taskType: "videos_generate",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        videoReferenceStrategy: "without_frame_refs",
        promptTemplateKey: "segment_video.generate",
      }),
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260325_videos",
      queueName: "videos-generate",
      taskType: "videos_generate",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260325_ab12cd",
      status: "videos_generating",
      updatedAt: "2026-03-25T00:11:00.000Z",
    });
    expect(result.type).toBe("videos_generate");
  });

  it("requires images_approved before creating a videos task", async () => {
    const useCase = createCreateVideosGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          storageDir: "projects/proj_1-my-story",
          currentShotScriptId: "shot_script_v1",
          currentImageBatchId: "image_batch_v1",
          currentVideoBatchId: null,
          status: "images_in_review",
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
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        findCurrentBatchByProjectId: vi.fn(),
        listFramesByBatchId: vi.fn(),
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
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
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: () => "task_videos" },
      clock: { now: () => "2026-03-25T00:11:00.000Z" },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).rejects.toBeInstanceOf(
      ProjectValidationError,
    );
  });

  it("throws when the current approved image batch is missing", async () => {
    const useCase = createCreateVideosGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          storageDir: "projects/proj_1-my-story",
          currentShotScriptId: "shot_script_v1",
          currentImageBatchId: "image_batch_missing",
          currentVideoBatchId: null,
          status: "images_approved",
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
      shotImageRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn().mockResolvedValue(null),
        findCurrentBatchByProjectId: vi.fn(),
        listFramesByBatchId: vi.fn(),
        insertFrame: vi.fn(),
        findFrameById: vi.fn(),
        updateFrame: vi.fn(),
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
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: () => "task_videos" },
      clock: { now: () => "2026-03-25T00:11:00.000Z" },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).rejects.toBeInstanceOf(
      CurrentImageBatchNotFoundError,
    );
  });
});
