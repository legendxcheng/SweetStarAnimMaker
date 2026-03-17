import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  createCreateStoryboardGenerateTaskUseCase,
} from "../src/index";

describe("create storyboard generate task use case", () => {
  it("creates a pending task, writes input artifacts, and enqueues it", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260317_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        scriptRelPath: "script/original.txt",
        scriptBytes: 7,
        status: "script_ready",
        createdAt: "2026-03-17T11:59:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
      }),
      updateScriptMetadata: vi.fn(),
      updateCurrentStoryboardVersion: vi.fn(),
    };
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
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
    const useCase = createCreateStoryboardGenerateTaskUseCase({
      projectRepository,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T12:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260317_ab12cd",
    });

    expect(taskRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        status: "pending",
        storageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
        inputRelPath: "tasks/task_20260317_ab12cd/input.json",
        outputRelPath: "tasks/task_20260317_ab12cd/output.json",
        logRelPath: "tasks/task_20260317_ab12cd/log.txt",
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260317_ab12cd",
      }),
      input: {
        taskId: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        taskType: "storyboard_generate",
        scriptPath: "script/original.txt",
        scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
      },
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      queueName: "storyboard-generate",
      taskType: "storyboard_generate",
    });
    expect(result).toEqual({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "storyboard_generate",
      status: "pending",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260317_ab12cd/input.json",
        outputPath: "tasks/task_20260317_ab12cd/output.json",
        logPath: "tasks/task_20260317_ab12cd/log.txt",
      },
    });
  });

  it("throws when the project does not exist", async () => {
    const useCase = createCreateStoryboardGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
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
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: () => "task_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T12:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("removes the partial task row when artifact creation fails", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(() => {
        throw new Error("disk full");
      }),
      readTaskInput: vi.fn(),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const useCase = createCreateStoryboardGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260317_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260317_ab12cd-my-story",
          scriptRelPath: "script/original.txt",
          scriptBytes: 7,
          status: "script_ready",
          createdAt: "2026-03-17T11:59:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
        }),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
      },
      taskRepository,
      taskFileStorage,
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: () => "task_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T12:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260317_ab12cd",
      }),
    ).rejects.toThrow("disk full");

    expect(taskRepository.delete).toHaveBeenCalledWith("task_20260317_ab12cd");
  });

  it("marks the task failed when enqueueing fails", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskQueue = {
      enqueue: vi.fn(() => {
        throw new Error("redis down");
      }),
    };
    const useCase = createCreateStoryboardGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260317_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260317_ab12cd-my-story",
          scriptRelPath: "script/original.txt",
          scriptBytes: 7,
          status: "script_ready",
          createdAt: "2026-03-17T11:59:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
        }),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
      },
      taskRepository,
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T12:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260317_ab12cd",
      }),
    ).rejects.toThrow("redis down");

    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      errorMessage: "redis down",
      updatedAt: "2026-03-17T12:00:00.000Z",
      finishedAt: "2026-03-17T12:00:00.000Z",
    });
  });
});
