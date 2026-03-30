import { describe, expect, it, vi } from "vitest";

import {
  CurrentImageBatchNotFoundError,
  ProjectNotFoundError,
  createRegenerateUnfinishedFramePromptsUseCase,
} from "../src/index";

describe("regenerate unfinished frame prompts use case", () => {
  it("creates tasks only for frames whose prompts are still unfinished", async () => {
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
      listShotsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "shot_ref_1",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          shotId: "shot_1",
          shotCode: "S01-SG01-SH01",
          sceneId: "scene_1",
          segmentId: "segment_1",
          frameDependency: "start_and_end_frame",
          referenceStatus: "pending",
          updatedAt: "2026-03-29T00:09:00.000Z",
          startFrame: {
            id: "frame_pending",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 1,
            frameType: "start_frame",
            planStatus: "pending",
            imageStatus: "pending",
            promptTextSeed: "",
            promptTextCurrent: "",
            updatedAt: "2026-03-29T00:09:00.000Z",
          },
          endFrame: {
            id: "frame_done",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_1",
            sceneId: "scene_1",
            order: 2,
            frameType: "end_frame",
            planStatus: "planned",
            imageStatus: "pending",
            promptTextSeed: "尾帧 Prompt",
            promptTextCurrent: "尾帧 Prompt",
            updatedAt: "2026-03-29T00:09:00.000Z",
          },
        },
        {
          id: "shot_ref_2",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          shotId: "shot_2",
          shotCode: "S01-SG02-SH01",
          sceneId: "scene_1",
          segmentId: "segment_2",
          frameDependency: "start_frame_only",
          referenceStatus: "pending",
          updatedAt: "2026-03-29T00:09:30.000Z",
          startFrame: {
            id: "frame_failed",
            batchId: "image_batch_1",
            projectId: "proj_1",
            sourceShotScriptId: "shot_script_1",
            segmentId: "segment_2",
            sceneId: "scene_1",
            order: 1,
            frameType: "start_frame",
            planStatus: "plan_failed",
            imageStatus: "pending",
            promptTextSeed: "",
            promptTextCurrent: "",
            updatedAt: "2026-03-29T00:09:30.000Z",
          },
          endFrame: null,
        },
      ]),
      listFramesByBatchId: vi.fn(),
      insertFrame: vi.fn(),
      findFrameById: vi.fn(),
      updateFrame: vi.fn(),
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
        .mockReturnValueOnce("task_unfinished_prompt_1")
        .mockReturnValueOnce("task_unfinished_prompt_2"),
    };

    const useCase = createRegenerateUnfinishedFramePromptsUseCase({
      projectRepository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator,
      clock: { now: vi.fn().mockReturnValue("2026-03-29T00:10:00.000Z") },
    });

    await expect(useCase.execute({ projectId: "proj_1" })).resolves.toEqual({
      batchId: "image_batch_1",
      frameCount: 2,
      taskIds: ["task_unfinished_prompt_1", "task_unfinished_prompt_2"],
    });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledTimes(2);
    expect(shotImageRepository.updateFrame).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "frame_pending",
        planStatus: "pending",
        updatedAt: "2026-03-29T00:10:00.000Z",
      }),
    );
    expect(shotImageRepository.updateFrame).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "frame_failed",
        planStatus: "pending",
        updatedAt: "2026-03-29T00:10:00.000Z",
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledTimes(2);
  });

  it("throws when the project does not exist", async () => {
    const useCase = createRegenerateUnfinishedFramePromptsUseCase({
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
        listShotsByBatchId: vi.fn(),
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
    const useCase = createRegenerateUnfinishedFramePromptsUseCase({
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
        listShotsByBatchId: vi.fn(),
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
