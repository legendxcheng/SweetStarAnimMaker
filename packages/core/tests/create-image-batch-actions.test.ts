import { describe, expect, it, vi } from "vitest";

import {
  createCreateImageBatchGenerateAllFramesTaskUseCase,
  createCreateImageBatchRegenerateAllPromptsTaskUseCase,
  createCreateImageBatchRegenerateFailedFramesTaskUseCase,
  createCreateImageBatchRegenerateFailedPromptsTaskUseCase,
} from "../src/index";

describe("create image batch action task use cases", () => {
  it("creates orchestration tasks for each backend-owned image batch action", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_1-my-story",
        currentImageBatchId: "image_batch_1",
        status: "images_in_review",
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
        .mockReturnValueOnce("task_image_batch_generate_all_frames_1")
        .mockReturnValueOnce("task_image_batch_regenerate_failed_frames_1")
        .mockReturnValueOnce("task_image_batch_regenerate_all_prompts_1")
        .mockReturnValueOnce("task_image_batch_regenerate_failed_prompts_1"),
    };
    const clock = { now: vi.fn().mockReturnValue("2026-03-30T03:00:00.000Z") };

    const generateAllFrames = createCreateImageBatchGenerateAllFramesTaskUseCase({
      projectRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator,
      clock,
    });
    const failedFrames = createCreateImageBatchRegenerateFailedFramesTaskUseCase({
      projectRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator,
      clock,
    });
    const allPrompts = createCreateImageBatchRegenerateAllPromptsTaskUseCase({
      projectRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator,
      clock,
    });
    const failedPrompts = createCreateImageBatchRegenerateFailedPromptsTaskUseCase({
      projectRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator,
      clock,
    });

    await expect(generateAllFrames.execute({ projectId: "proj_1" })).resolves.toEqual(
      expect.objectContaining({
        id: "task_image_batch_generate_all_frames_1",
        type: "image_batch_generate_all_frames",
      }),
    );
    await expect(failedFrames.execute({ projectId: "proj_1" })).resolves.toEqual(
      expect.objectContaining({
        id: "task_image_batch_regenerate_failed_frames_1",
        type: "image_batch_regenerate_failed_frames",
      }),
    );
    await expect(allPrompts.execute({ projectId: "proj_1" })).resolves.toEqual(
      expect.objectContaining({
        id: "task_image_batch_regenerate_all_prompts_1",
        type: "image_batch_regenerate_all_prompts",
      }),
    );
    await expect(failedPrompts.execute({ projectId: "proj_1" })).resolves.toEqual(
      expect.objectContaining({
        id: "task_image_batch_regenerate_failed_prompts_1",
        type: "image_batch_regenerate_failed_prompts",
      }),
    );

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(1, {
      task: expect.objectContaining({ id: "task_image_batch_generate_all_frames_1" }),
      input: {
        taskId: "task_image_batch_generate_all_frames_1",
        projectId: "proj_1",
        taskType: "image_batch_generate_all_frames",
        batchId: "image_batch_1",
      },
    });
    expect(taskQueue.enqueue).toHaveBeenNthCalledWith(1, {
      taskId: "task_image_batch_generate_all_frames_1",
      queueName: "image-batch-generate-all-frames",
      taskType: "image_batch_generate_all_frames",
    });
    expect(taskQueue.enqueue).toHaveBeenNthCalledWith(2, {
      taskId: "task_image_batch_regenerate_failed_frames_1",
      queueName: "image-batch-regenerate-failed-frames",
      taskType: "image_batch_regenerate_failed_frames",
    });
    expect(taskQueue.enqueue).toHaveBeenNthCalledWith(3, {
      taskId: "task_image_batch_regenerate_all_prompts_1",
      queueName: "image-batch-regenerate-all-prompts",
      taskType: "image_batch_regenerate_all_prompts",
    });
    expect(taskQueue.enqueue).toHaveBeenNthCalledWith(4, {
      taskId: "task_image_batch_regenerate_failed_prompts_1",
      queueName: "image-batch-regenerate-failed-prompts",
      taskType: "image_batch_regenerate_failed_prompts",
    });
  });
});
