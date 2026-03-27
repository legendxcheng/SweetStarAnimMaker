import { describe, expect, it, vi } from "vitest";

import {
  CurrentImageBatchNotFoundError,
  ProjectNotFoundError,
  createRegenerateFailedFramePromptsUseCase,
} from "../src/index";

describe("regenerate failed frame prompts use case", () => {
  it("creates tasks only for frames whose prompt generation failed", async () => {
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
      listFramesByBatchId: vi.fn().mockResolvedValue([
        {
          id: "frame_failed_prompt",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          frameType: "start_frame",
          planStatus: "plan_failed",
          imageStatus: "pending",
        },
        {
          id: "frame_ok_prompt",
          batchId: "image_batch_1",
          projectId: "proj_1",
          sourceShotScriptId: "shot_script_1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          frameType: "end_frame",
          planStatus: "planned",
          imageStatus: "failed",
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
      generateTaskId: vi.fn().mockReturnValue("task_failed_prompt_1"),
    };

    const useCase = createRegenerateFailedFramePromptsUseCase({
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
      frameCount: 1,
      taskIds: ["task_failed_prompt_1"],
    });

    expect(shotImageRepository.updateFrame).toHaveBeenCalledTimes(1);
    expect(shotImageRepository.updateFrame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "frame_failed_prompt",
        planStatus: "pending",
        updatedAt: "2026-03-27T00:10:00.000Z",
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "frame_prompt_generate",
          frameId: "frame_failed_prompt",
        }),
      }),
    );
  });

  it("throws when the project does not exist", async () => {
    const useCase = createRegenerateFailedFramePromptsUseCase({
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
    const useCase = createRegenerateFailedFramePromptsUseCase({
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
