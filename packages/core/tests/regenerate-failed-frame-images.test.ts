import { describe, expect, it, vi } from "vitest";

import {
  CurrentImageBatchNotFoundError,
  ProjectNotFoundError,
  createRegenerateFailedFrameImagesUseCase,
} from "../src/index";

describe("regenerate failed frame images use case", () => {
  it("creates tasks for unfinished image frames after prompt planning succeeded without touching completed frames", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        storageDir: "projects/proj_1-my-story",
        currentImageBatchId: "image_batch_1",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "shot_failed_frame",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          shotId: "shot_1",
          shotCode: "S01-SG01-SH01",
          frameDependency: "start_frame_only",
          referenceStatus: "failed",
          startFrame: {
            id: "frame_failed_image",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            frameType: "start_frame",
            planStatus: "planned",
            imageStatus: "failed",
            selectedCharacterIds: ["char_rin_1"],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "雨夜市场入口。",
            promptTextCurrent: "雨夜市场入口。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2026-03-27T00:00:00.000Z",
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            approvedAt: "2026-03-26T23:59:00.000Z",
            updatedAt: "2026-03-27T00:00:00.000Z",
            sourceTaskId: "task_old_failed_frame",
          },
          endFrame: null,
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
        {
          id: "shot_failed_prompt",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          shotId: "shot_2",
          shotCode: "S01-SG01-SH02",
          frameDependency: "start_frame_only",
          referenceStatus: "pending",
          startFrame: {
            id: "frame_failed_prompt",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 2,
            frameType: "start_frame",
            planStatus: "plan_failed",
            imageStatus: "pending",
            selectedCharacterIds: [],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "",
            promptTextCurrent: "",
            negativePromptTextCurrent: null,
            promptUpdatedAt: null,
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            approvedAt: null,
            updatedAt: "2026-03-27T00:00:00.000Z",
            sourceTaskId: "task_old_failed_prompt",
          },
          endFrame: null,
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
        {
          id: "shot_pending_image",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          shotId: "shot_3",
          shotCode: "S01-SG01-SH03",
          frameDependency: "start_frame_only",
          referenceStatus: "pending",
          startFrame: {
            id: "frame_pending_image",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 3,
            frameType: "start_frame",
            planStatus: "planned",
            imageStatus: "pending",
            selectedCharacterIds: ["char_rin_1"],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "雨夜市场入口。",
            promptTextCurrent: "雨夜市场入口。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2026-03-27T00:00:00.000Z",
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            approvedAt: null,
            updatedAt: "2026-03-27T00:00:00.000Z",
            sourceTaskId: null,
          },
          endFrame: null,
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
        {
          id: "shot_generating_image",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          shotId: "shot_4",
          shotCode: "S01-SG01-SH04",
          frameDependency: "start_frame_only",
          referenceStatus: "pending",
          startFrame: {
            id: "frame_generating_image",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 4,
            frameType: "start_frame",
            planStatus: "planned",
            imageStatus: "generating",
            selectedCharacterIds: ["char_rin_1"],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "雨夜市场入口。",
            promptTextCurrent: "雨夜市场入口。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2026-03-27T00:00:00.000Z",
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            approvedAt: null,
            updatedAt: "2026-03-27T00:00:00.000Z",
            sourceTaskId: "task_generating_frame",
          },
          endFrame: null,
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
        {
          id: "shot_completed_image",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          shotId: "shot_5",
          shotCode: "S01-SG01-SH05",
          frameDependency: "start_frame_only",
          referenceStatus: "in_review",
          startFrame: {
            id: "frame_completed_image",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 5,
            frameType: "start_frame",
            planStatus: "planned",
            imageStatus: "in_review",
            selectedCharacterIds: ["char_rin_1"],
            matchedReferenceImagePaths: [],
            unmatchedCharacterIds: [],
            promptTextSeed: "雨夜市场入口。",
            promptTextCurrent: "雨夜市场入口。",
            negativePromptTextCurrent: null,
            promptUpdatedAt: "2026-03-27T00:00:00.000Z",
            imageAssetPath: "images/frame_completed_image.png",
            imageWidth: 1536,
            imageHeight: 1024,
            provider: "turnaround-image",
            model: "doubao-seedream-5-0-260128",
            approvedAt: null,
            updatedAt: "2026-03-27T00:00:00.000Z",
            sourceTaskId: "task_completed_frame",
          },
          endFrame: null,
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
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
    const taskIdGenerator = {
      generateTaskId: vi
        .fn()
        .mockReturnValueOnce("task_failed_frame_1")
        .mockReturnValueOnce("task_pending_frame_1"),
    };

    const useCase = createRegenerateFailedFrameImagesUseCase({
      projectRepository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator,
      clock: { now: vi.fn().mockReturnValue("2026-03-27T00:10:00.000Z") },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).resolves.toEqual({
      batchId: "image_batch_1",
      frameCount: 2,
      taskIds: ["task_failed_frame_1", "task_pending_frame_1"],
    });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledTimes(2);
    expect(shotImageRepository.updateFrame).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "frame_failed_image",
        imageStatus: "generating",
        approvedAt: null,
        updatedAt: "2026-03-27T00:10:00.000Z",
        sourceTaskId: "task_failed_frame_1",
      }),
    );
    expect(shotImageRepository.updateFrame).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "frame_pending_image",
        imageStatus: "generating",
        approvedAt: null,
        updatedAt: "2026-03-27T00:10:00.000Z",
        sourceTaskId: "task_pending_frame_1",
      }),
    );
    expect(shotImageRepository.updateShot).not.toHaveBeenCalled();
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_image_generate",
          frameId: "frame_failed_image",
          batchId: "image_batch_1",
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_image_generate",
          frameId: "frame_pending_image",
          batchId: "image_batch_1",
        }),
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "images_generating",
      updatedAt: "2026-03-27T00:10:00.000Z",
    });
  });

  it("throws when the project does not exist", async () => {
    const useCase = createRegenerateFailedFrameImagesUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
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
      taskIdGenerator: { generateTaskId: vi.fn() },
      clock: { now: vi.fn() },
    });

    await expect(useCase.execute({ projectId: "missing" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it("throws when the project has no current image batch", async () => {
    const useCase = createRegenerateFailedFrameImagesUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          currentImageBatchId: null,
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
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
      taskIdGenerator: { generateTaskId: vi.fn() },
      clock: { now: vi.fn() },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).rejects.toBeInstanceOf(
      CurrentImageBatchNotFoundError,
    );
  });
});
