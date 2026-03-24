import { describe, expect, it, vi } from "vitest";

import {
  CurrentImageBatchNotFoundError,
  ProjectNotFoundError,
  createRegenerateAllFramePromptsUseCase,
} from "../src/index";

describe("regenerate all frame prompts use case", () => {
  it("creates one frame prompt task per frame in the current image batch", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260324_ab12cd",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
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
      listFramesByBatchId: vi.fn().mockResolvedValue([
        {
          id: "frame_start_1",
          batchId: "image_batch_1",
          projectId: "proj_20260324_ab12cd",
          sourceShotScriptId: "shot_script_1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          frameType: "start_frame",
        },
        {
          id: "frame_end_1",
          batchId: "image_batch_1",
          projectId: "proj_20260324_ab12cd",
          sourceShotScriptId: "shot_script_1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          frameType: "end_frame",
        },
      ]),
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
        .mockReturnValueOnce("task_frame_prompt_1")
        .mockReturnValueOnce("task_frame_prompt_2"),
    };

    const useCase = createRegenerateAllFramePromptsUseCase({
      projectRepository,
      shotImageRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator,
      clock: { now: vi.fn().mockReturnValue("2026-03-24T10:30:00.000Z") },
    });

    await expect(
      useCase.execute({ projectId: "proj_20260324_ab12cd" }),
    ).resolves.toEqual({
      batchId: "image_batch_1",
      frameCount: 2,
      taskIds: ["task_frame_prompt_1", "task_frame_prompt_2"],
    });

    expect(shotImageRepository.listFramesByBatchId).toHaveBeenCalledWith("image_batch_1");
    expect(shotImageRepository.updateFrame).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "frame_start_1",
        planStatus: "pending",
        updatedAt: "2026-03-24T10:30:00.000Z",
      }),
    );
    expect(shotImageRepository.updateFrame).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "frame_end_1",
        planStatus: "pending",
        updatedAt: "2026-03-24T10:30:00.000Z",
      }),
    );
    expect(taskRepository.insert).toHaveBeenCalledTimes(2);
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_prompt_generate",
          frameId: "frame_start_1",
          batchId: "image_batch_1",
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_prompt_generate",
          frameId: "frame_end_1",
          batchId: "image_batch_1",
        }),
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(2);
  });

  it("throws when the project does not exist", async () => {
    const useCase = createRegenerateAllFramePromptsUseCase({
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

    await expect(useCase.execute({ projectId: "missing-project" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it("throws when the project has no current image batch", async () => {
    const useCase = createRegenerateAllFramePromptsUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260324_ab12cd",
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

    await expect(
      useCase.execute({ projectId: "proj_20260324_ab12cd" }),
    ).rejects.toBeInstanceOf(CurrentImageBatchNotFoundError);
  });
});
