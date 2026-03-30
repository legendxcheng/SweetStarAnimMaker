import { describe, expect, it, vi } from "vitest";

import {
  createProcessImageBatchGenerateAllFramesTaskUseCase,
  createProcessImageBatchRegenerateAllPromptsTaskUseCase,
  createProcessImageBatchRegenerateFailedFramesTaskUseCase,
  createProcessImageBatchRegenerateFailedPromptsTaskUseCase,
} from "../src/index";

describe("process image batch action task use cases", () => {
  it("generates all frames in stable shot order and skips end frames without a start image", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_image_batch_generate_all_frames_1",
        projectId: "proj_1",
        type: "image_batch_generate_all_frames",
        status: "pending",
        queueName: "image-batch-generate-all-frames",
        storageDir: "projects/proj_1-my-story/tasks/task_image_batch_generate_all_frames_1",
        inputRelPath: "tasks/task_image_batch_generate_all_frames_1/input.json",
        outputRelPath: "tasks/task_image_batch_generate_all_frames_1/output.json",
        logRelPath: "tasks/task_image_batch_generate_all_frames_1/log.txt",
        errorMessage: null,
        createdAt: "2026-03-30T03:00:00.000Z",
        updatedAt: "2026-03-30T03:00:00.000Z",
        startedAt: null,
        finishedAt: null,
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
        currentImageBatchId: "image_batch_1",
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
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_image_batch_generate_all_frames_1",
        projectId: "proj_1",
        taskType: "image_batch_generate_all_frames",
        batchId: "image_batch_1",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotImageRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn().mockResolvedValue({
        id: "image_batch_1",
        projectId: "proj_1",
      }),
      findCurrentBatchByProjectId: vi.fn(),
      listFramesByBatchId: vi.fn(),
      listShotsByBatchId: vi.fn().mockResolvedValue([
        {
          id: "shot_2",
          batchId: "image_batch_1",
          shotId: "shot_2",
          shotCode: "S02",
          segmentOrder: 1,
          shotOrder: 2,
          frameDependency: "start_and_end_frame",
          startFrame: { id: "frame_2_start", imageAssetPath: null },
          endFrame: { id: "frame_2_end" },
        },
        {
          id: "shot_1",
          batchId: "image_batch_1",
          shotId: "shot_1",
          shotCode: "S01",
          segmentOrder: 1,
          shotOrder: 1,
          frameDependency: "start_and_end_frame",
          startFrame: { id: "frame_1_start", imageAssetPath: "images/frame_1_start.png" },
          endFrame: { id: "frame_1_end" },
        },
      ]),
      insertFrame: vi.fn(),
      findFrameById: vi.fn(),
      updateFrame: vi.fn(),
      updateShot: vi.fn(),
      findShotById: vi.fn(),
    };
    const generateFrameImage = {
      execute: vi.fn().mockResolvedValue({
        id: "child-task",
        type: "frame_image_generate",
      }),
    };

    const useCase = createProcessImageBatchGenerateAllFramesTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotImageRepository,
      generateFrameImage,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-30T03:01:00.000Z")
          .mockReturnValueOnce("2026-03-30T03:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_image_batch_generate_all_frames_1" });

    expect(generateFrameImage.execute).toHaveBeenNthCalledWith(1, {
      projectId: "proj_1",
      frameId: "frame_1_start",
    });
    expect(generateFrameImage.execute).toHaveBeenNthCalledWith(2, {
      projectId: "proj_1",
      frameId: "frame_1_end",
    });
    expect(generateFrameImage.execute).toHaveBeenNthCalledWith(3, {
      projectId: "proj_1",
      frameId: "frame_2_start",
    });
    expect(generateFrameImage.execute).toHaveBeenCalledTimes(3);
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_image_batch_generate_all_frames_1" }),
      output: expect.objectContaining({
        batchId: "image_batch_1",
        scannedShotCount: 2,
        createdTaskCount: 3,
        skippedCount: 1,
        skippedReasons: {
          missing_start_frame_image_for_end_frame: 1,
        },
      }),
    });
  });

  it("delegates prompt and failed-image batch processors to backend use cases and records their summaries", async () => {
    const baseTaskRepository = {
      insert: vi.fn(),
      findById: vi
        .fn()
        .mockResolvedValueOnce({
          id: "task_all_prompts",
          projectId: "proj_1",
          type: "image_batch_regenerate_all_prompts",
          status: "pending",
          queueName: "image-batch-regenerate-all-prompts",
          storageDir: "tasks/task_all_prompts",
          inputRelPath: "tasks/task_all_prompts/input.json",
          outputRelPath: "tasks/task_all_prompts/output.json",
          logRelPath: "tasks/task_all_prompts/log.txt",
          errorMessage: null,
          createdAt: "2026-03-30T03:00:00.000Z",
          updatedAt: "2026-03-30T03:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        })
        .mockResolvedValueOnce({
          id: "task_failed_prompts",
          projectId: "proj_1",
          type: "image_batch_regenerate_failed_prompts",
          status: "pending",
          queueName: "image-batch-regenerate-failed-prompts",
          storageDir: "tasks/task_failed_prompts",
          inputRelPath: "tasks/task_failed_prompts/input.json",
          outputRelPath: "tasks/task_failed_prompts/output.json",
          logRelPath: "tasks/task_failed_prompts/log.txt",
          errorMessage: null,
          createdAt: "2026-03-30T03:00:00.000Z",
          updatedAt: "2026-03-30T03:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        })
        .mockResolvedValueOnce({
          id: "task_failed_frames",
          projectId: "proj_1",
          type: "image_batch_regenerate_failed_frames",
          status: "pending",
          queueName: "image-batch-regenerate-failed-frames",
          storageDir: "tasks/task_failed_frames",
          inputRelPath: "tasks/task_failed_frames/input.json",
          outputRelPath: "tasks/task_failed_frames/output.json",
          logRelPath: "tasks/task_failed_frames/log.txt",
          errorMessage: null,
          createdAt: "2026-03-30T03:00:00.000Z",
          updatedAt: "2026-03-30T03:00:00.000Z",
          startedAt: null,
          finishedAt: null,
        }),
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi
        .fn()
        .mockResolvedValueOnce({
          taskId: "task_all_prompts",
          projectId: "proj_1",
          taskType: "image_batch_regenerate_all_prompts",
          batchId: "image_batch_1",
        })
        .mockResolvedValueOnce({
          taskId: "task_failed_prompts",
          projectId: "proj_1",
          taskType: "image_batch_regenerate_failed_prompts",
          batchId: "image_batch_1",
        })
        .mockResolvedValueOnce({
          taskId: "task_failed_frames",
          projectId: "proj_1",
          taskType: "image_batch_regenerate_failed_frames",
          batchId: "image_batch_1",
        }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_1",
        currentImageBatchId: "image_batch_1",
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
    const regenerateAllFramePrompts = {
      execute: vi.fn().mockResolvedValue({
        batchId: "image_batch_1",
        frameCount: 12,
        taskIds: ["task_frame_prompt_1"],
      }),
    };
    const regenerateFailedFramePrompts = {
      execute: vi.fn().mockResolvedValue({
        batchId: "image_batch_1",
        frameCount: 2,
        taskIds: ["task_failed_prompt_1"],
      }),
    };
    const regenerateFailedFrameImages = {
      execute: vi.fn().mockResolvedValue({
        batchId: "image_batch_1",
        frameCount: 3,
        taskIds: ["task_failed_frame_1"],
      }),
    };
    const clock = {
      now: vi
        .fn()
        .mockReturnValueOnce("2026-03-30T03:01:00.000Z")
        .mockReturnValueOnce("2026-03-30T03:02:00.000Z")
        .mockReturnValueOnce("2026-03-30T03:03:00.000Z")
        .mockReturnValueOnce("2026-03-30T03:04:00.000Z")
        .mockReturnValueOnce("2026-03-30T03:05:00.000Z")
        .mockReturnValueOnce("2026-03-30T03:06:00.000Z"),
    };

    const allPrompts = createProcessImageBatchRegenerateAllPromptsTaskUseCase({
      taskRepository: baseTaskRepository,
      projectRepository,
      taskFileStorage,
      regenerateAllFramePrompts,
      clock,
    });
    const failedPrompts = createProcessImageBatchRegenerateFailedPromptsTaskUseCase({
      taskRepository: baseTaskRepository,
      projectRepository,
      taskFileStorage,
      regenerateFailedFramePrompts,
      clock,
    });
    const failedFrames = createProcessImageBatchRegenerateFailedFramesTaskUseCase({
      taskRepository: baseTaskRepository,
      projectRepository,
      taskFileStorage,
      regenerateFailedFrameImages,
      clock,
    });

    await allPrompts.execute({ taskId: "task_all_prompts" });
    await failedPrompts.execute({ taskId: "task_failed_prompts" });
    await failedFrames.execute({ taskId: "task_failed_frames" });

    expect(regenerateAllFramePrompts.execute).toHaveBeenCalledWith({ projectId: "proj_1" });
    expect(regenerateFailedFramePrompts.execute).toHaveBeenCalledWith({ projectId: "proj_1" });
    expect(regenerateFailedFrameImages.execute).toHaveBeenCalledWith({ projectId: "proj_1" });
    expect(taskFileStorage.writeTaskOutput).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        output: expect.objectContaining({
          batchId: "image_batch_1",
          createdTaskCount: 12,
        }),
      }),
    );
  });
});
