import { describe, expect, it, vi } from "vitest";

import {
  CurrentShotScriptNotFoundError,
  ProjectNotFoundError,
  ProjectValidationError,
  createCreateImagesGenerateTaskUseCase,
} from "../src/index";

describe("create images generate task use case", () => {
  it("creates a pending images batch task from the approved current shot script and enqueues it", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: null,
        status: "shot_script_approved",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:10:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
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
        updatedAt: "2026-03-24T00:09:00.000Z",
        approvedAt: "2026-03-24T00:10:00.000Z",
        segmentCount: 2,
        shotCount: 5,
        totalDurationSec: 24,
        segments: [],
      }),
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
    const taskQueue = {
      enqueue: vi.fn(),
    };

    const useCase = createCreateImagesGenerateTaskUseCase({
      projectRepository,
      shotScriptStorage,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260324_images",
      },
      clock: {
        now: () => "2026-03-24T00:11:00.000Z",
      },
    });

    const result = await useCase.execute({ projectId: "proj_20260324_ab12cd" });

    expect(taskRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        type: "images_generate",
        status: "pending",
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_20260324_images" }),
      input: {
        taskId: "task_20260324_images",
        projectId: "proj_20260324_ab12cd",
        taskType: "images_generate",
        sourceShotScriptId: "shot_script_v1",
      },
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260324_images",
      queueName: "images-generate",
      taskType: "images_generate",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
      status: "images_generating",
      updatedAt: "2026-03-24T00:11:00.000Z",
    });
    expect(result.type).toBe("images_generate");
  });

  it("throws when the project does not exist", async () => {
    const useCase = createCreateImagesGenerateTaskUseCase({
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
      taskIdGenerator: { generateTaskId: () => "task_20260324_images" },
      clock: { now: () => "2026-03-24T00:11:00.000Z" },
    });

    await expect(useCase.execute({ projectId: "missing-project" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it("creates a pending images batch task from the current in-review shot script and enqueues it", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260324_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260324_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "master_plot_v1",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_v1",
        currentShotScriptId: "shot_script_v1",
        currentImageBatchId: null,
        status: "shot_script_in_review",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:10:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
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
        updatedAt: "2026-03-24T00:09:00.000Z",
        approvedAt: null,
        segmentCount: 2,
        shotCount: 5,
        totalDurationSec: 24,
        segments: [],
      }),
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
    const taskQueue = {
      enqueue: vi.fn(),
    };

    const useCase = createCreateImagesGenerateTaskUseCase({
      projectRepository,
      shotScriptStorage,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260324_images_in_review",
      },
      clock: {
        now: () => "2026-03-24T00:11:00.000Z",
      },
    });

    const result = await useCase.execute({ projectId: "proj_20260324_ab12cd" });

    expect(taskRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task_20260324_images_in_review",
        projectId: "proj_20260324_ab12cd",
        type: "images_generate",
        status: "pending",
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260324_images_in_review",
      queueName: "images-generate",
      taskType: "images_generate",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260324_ab12cd",
      status: "images_generating",
      updatedAt: "2026-03-24T00:11:00.000Z",
    });
    expect(result.type).toBe("images_generate");
  });

  it("throws when the project is not ready for images", async () => {
    const useCase = createCreateImagesGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260324_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260324_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "master_plot_v1",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_v1",
          currentShotScriptId: "shot_script_v1",
          currentImageBatchId: null,
          status: "storyboard_approved",
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:10:00.000Z",
          premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
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
      taskIdGenerator: { generateTaskId: () => "task_20260324_images" },
      clock: { now: () => "2026-03-24T00:11:00.000Z" },
    });

    await expect(
      useCase.execute({ projectId: "proj_20260324_ab12cd" }),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("throws when the current shot script is missing", async () => {
    const useCase = createCreateImagesGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260324_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260324_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "master_plot_v1",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: "storyboard_v1",
          currentShotScriptId: null,
          currentImageBatchId: null,
          status: "shot_script_approved",
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:10:00.000Z",
          premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
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
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn().mockResolvedValue(null),
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
      taskIdGenerator: { generateTaskId: () => "task_20260324_images" },
      clock: { now: () => "2026-03-24T00:11:00.000Z" },
    });

    await expect(
      useCase.execute({ projectId: "proj_20260324_ab12cd" }),
    ).rejects.toBeInstanceOf(CurrentShotScriptNotFoundError);
  });
});
