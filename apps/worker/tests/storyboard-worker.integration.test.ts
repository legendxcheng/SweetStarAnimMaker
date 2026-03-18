import { describe, expect, it, vi } from "vitest";

import { startWorker } from "../src/index";
import { buildSpec2WorkerServices } from "../src/bootstrap/build-spec2-worker-services";

describe("storyboard worker integration", () => {
  it("routes queued task ids into the process use case", async () => {
    const processStoryboardGenerateTask = {
      execute: vi.fn(),
    };
    const close = vi.fn();
    const workerFactory = vi.fn(({ processor }) => ({
      processor,
      close,
    }));

    const worker = await startWorker({
      services: {
        processStoryboardGenerateTask,
      },
      workerFactory,
    });

    const createdWorker = workerFactory.mock.results[0]?.value as {
      processor(job: { data: { taskId: string } }): Promise<void>;
    };

    await createdWorker.processor({
      data: {
        taskId: "task_20260317_ab12cd",
      },
    });

    expect(processStoryboardGenerateTask.execute).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
    });

    await worker.close();

    expect(close).toHaveBeenCalled();
  });

  it("forwards reject review context into the configured storyboard provider", async () => {
    const storyboardProvider = {
      generateStoryboard: vi.fn().mockResolvedValue({
        rawResponse: {},
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          summary: "Generated storyboard summary",
          scenes: [],
        },
      }),
    };
    const services = buildSpec2WorkerServices({
      taskRepository: {
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
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260317_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260317_ab12cd-my-story",
          scriptRelPath: "script/original.txt",
          scriptBytes: 120,
          status: "storyboard_generating",
          createdAt: "2026-03-17T10:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          scriptUpdatedAt: "2026-03-17T10:00:00.000Z",
        }),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      scriptStorage: {
        writeOriginalScript: vi.fn(),
        readOriginalScript: vi.fn().mockResolvedValue("Scene 1: A enters the room"),
        deleteOriginalScript: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          taskType: "storyboard_generate",
          scriptPath: "script/original.txt",
          scriptUpdatedAt: "2026-03-17T10:00:00.000Z",
          reviewContext: {
            reason: "Need a brighter ending.",
            rejectedVersionId: "sbv_20260317_prev",
          },
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
      },
      storyboardVersionRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findCurrentByProjectId: vi.fn(),
        getNextVersionNumber: vi.fn().mockResolvedValue(2),
      },
      storyboardProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
      },
    });

    await services.processStoryboardGenerateTask.execute({
      taskId: "task_20260317_ab12cd",
    });

    expect(storyboardProvider.generateStoryboard).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      script: "Scene 1: A enters the room",
      reviewContext: {
        reason: "Need a brighter ending.",
        rejectedVersionId: "sbv_20260317_prev",
      },
    });
  });
});
