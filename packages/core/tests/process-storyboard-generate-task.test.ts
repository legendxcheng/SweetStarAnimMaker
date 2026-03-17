import { describe, expect, it, vi } from "vitest";

import {
  TaskNotFoundError,
  createProcessStoryboardGenerateTaskUseCase,
} from "../src/index";

describe("process storyboard generate task use case", () => {
  it("marks the task running, writes output, and marks it succeeded", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        type: "storyboard_generate",
        status: "pending",
        queueName: "storyboard-generate",
        storageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
        inputRelPath: "tasks/task_20260317_ab12cd/input.json",
        outputRelPath: "tasks/task_20260317_ab12cd/output.json",
        logRelPath: "tasks/task_20260317_ab12cd/log.txt",
        errorMessage: null,
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        startedAt: null,
        finishedAt: null,
      }),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        taskType: "storyboard_generate",
        scriptPath: "script/original.txt",
        scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      taskFileStorage,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
      },
      handler: {
        run: vi.fn().mockResolvedValue({
          storyboardId: "storyboard_20260317_ab12cd",
          summary: "Generated placeholder storyboard",
        }),
      },
    });

    await useCase.execute({ taskId: "task_20260317_ab12cd" });

    expect(taskRepository.markRunning).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      updatedAt: "2026-03-17T12:01:00.000Z",
      startedAt: "2026-03-17T12:01:00.000Z",
    });
    expect(taskFileStorage.readTaskInput).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260317_ab12cd",
      }),
    });
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260317_ab12cd",
      }),
      output: {
        storyboardId: "storyboard_20260317_ab12cd",
        summary: "Generated placeholder storyboard",
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      updatedAt: "2026-03-17T12:02:00.000Z",
      finishedAt: "2026-03-17T12:02:00.000Z",
    });
  });

  it("marks the task failed when processing throws", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        type: "storyboard_generate",
        status: "pending",
        queueName: "storyboard-generate",
        storageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
        inputRelPath: "tasks/task_20260317_ab12cd/input.json",
        outputRelPath: "tasks/task_20260317_ab12cd/output.json",
        logRelPath: "tasks/task_20260317_ab12cd/log.txt",
        errorMessage: null,
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        startedAt: null,
        finishedAt: null,
      }),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          taskType: "storyboard_generate",
          scriptPath: "script/original.txt",
          scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
      },
      handler: {
        run: async () => {
          throw new Error("boom");
        },
      },
    });

    await expect(useCase.execute({ taskId: "task_20260317_ab12cd" })).rejects.toThrow(
      "boom",
    );

    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      errorMessage: "boom",
      updatedAt: "2026-03-17T12:02:00.000Z",
      finishedAt: "2026-03-17T12:02:00.000Z",
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
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
      clock: {
        now: vi.fn(),
      },
      handler: {
        run: vi.fn(),
      },
    });

    await expect(useCase.execute({ taskId: "missing-task" })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });
});
