import { describe, expect, it, vi } from "vitest";

import { TaskNotFoundError, createGetTaskDetailUseCase } from "../src/index";

describe("get task detail use case", () => {
  it("returns the expected task detail dto", async () => {
    const useCase = createGetTaskDetailUseCase({
      repository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          type: "storyboard_generate",
          status: "succeeded",
          queueName: "storyboard-generate",
          storageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
          inputRelPath: "tasks/task_20260317_ab12cd/input.json",
          outputRelPath: "tasks/task_20260317_ab12cd/output.json",
          logRelPath: "tasks/task_20260317_ab12cd/log.txt",
          errorMessage: null,
          createdAt: "2026-03-17T12:00:00.000Z",
          updatedAt: "2026-03-17T12:03:00.000Z",
          startedAt: "2026-03-17T12:01:00.000Z",
          finishedAt: "2026-03-17T12:03:00.000Z",
        }),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      taskId: "task_20260317_ab12cd",
    });

    expect(result).toEqual({
      id: "task_20260317_ab12cd",
      projectId: "proj_20260317_ab12cd",
      type: "storyboard_generate",
      status: "succeeded",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:03:00.000Z",
      startedAt: "2026-03-17T12:01:00.000Z",
      finishedAt: "2026-03-17T12:03:00.000Z",
      errorMessage: null,
      files: {
        inputPath: "tasks/task_20260317_ab12cd/input.json",
        outputPath: "tasks/task_20260317_ab12cd/output.json",
        logPath: "tasks/task_20260317_ab12cd/log.txt",
      },
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createGetTaskDetailUseCase({
      repository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    await expect(
      useCase.execute({
        taskId: "missing-task",
      }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });
});
