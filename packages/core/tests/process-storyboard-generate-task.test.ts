import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessStoryboardGenerateTaskUseCase,
} from "../src/index";

describe("process storyboard generate task use case", () => {
  it("persists raw response and storyboard version metadata before marking the task succeeded", async () => {
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
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
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
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
      }),
      updateScriptMetadata: vi.fn(),
      updateCurrentStoryboardVersion: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
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
    const scriptStorage = {
      readOriginalScript: vi.fn().mockResolvedValue("Scene 1: A enters the room"),
      writeOriginalScript: vi.fn(),
      deleteOriginalScript: vi.fn(),
    };
    const storyboardVersionRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      findCurrentByProjectId: vi.fn(),
      getNextVersionNumber: vi.fn().mockReturnValue(1),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      scriptStorage,
      storyboardProvider: {
        generateStoryboard: vi.fn().mockResolvedValue({
          rawResponse: {
            candidates: [{ content: { parts: [{ text: "{}" }] } }],
          },
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
          storyboard: {
            summary: "Generated storyboard summary",
            scenes: [
              {
                id: "scene_1",
                sceneIndex: 1,
                description: "A enters the room",
                camera: "medium shot",
                characters: ["A"],
                prompt: "medium shot, character A entering a dim room",
              },
            ],
          },
        }),
      },
      storyboardStorage,
      storyboardVersionRepository,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
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
    expect(scriptStorage.readOriginalScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260317_ab12cd-my-story",
    });
    expect(storyboardStorage.writeRawResponse).toHaveBeenCalledWith({
      version: expect.objectContaining({
        id: "sbv_20260317_ab12cd",
        fileRelPath: "storyboards/versions/v1-ai.json",
        rawResponseRelPath: "storyboards/raw/task_20260317_ab12cd-gemini-response.json",
      }),
      rawResponse: {
        candidates: [{ content: { parts: [{ text: "{}" }] } }],
      },
    });
    expect(storyboardStorage.writeStoryboardVersion).toHaveBeenCalledWith({
      version: expect.objectContaining({
        id: "sbv_20260317_ab12cd",
      }),
      storyboard: expect.objectContaining({
        summary: "Generated storyboard summary",
      }),
    });
    expect(storyboardVersionRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sbv_20260317_ab12cd",
        projectStorageDir: "projects/proj_20260317_ab12cd-my-story",
      }),
    );
    expect(projectRepository.updateCurrentStoryboardVersion).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      storyboardVersionId: "sbv_20260317_ab12cd",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      status: "storyboard_in_review",
      updatedAt: "2026-03-17T12:02:00.000Z",
    });
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260317_ab12cd",
      }),
      output: {
        storyboardVersionId: "sbv_20260317_ab12cd",
        versionNumber: 1,
        kind: "ai",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        filePath: "storyboards/versions/v1-ai.json",
        rawResponsePath: "storyboards/raw/task_20260317_ab12cd-gemini-response.json",
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      updatedAt: "2026-03-17T12:02:00.000Z",
      finishedAt: "2026-03-17T12:02:00.000Z",
    });
  });

  it("marks the task failed and leaves the current storyboard pointer unchanged when generation fails", async () => {
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
      findLatestByProjectId: vi.fn(),
      delete: vi.fn(),
      markRunning: vi.fn(),
      markSucceeded: vi.fn(),
      markFailed: vi.fn(),
    };
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
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
      }),
      updateScriptMetadata: vi.fn(),
      updateCurrentStoryboardVersion: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
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
      projectRepository,
      taskFileStorage,
      scriptStorage: {
        readOriginalScript: vi.fn().mockResolvedValue("Scene 1"),
        writeOriginalScript: vi.fn(),
        deleteOriginalScript: vi.fn(),
      },
      storyboardProvider: {
        generateStoryboard: async () => {
          throw new Error("boom");
        },
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
        getNextVersionNumber: vi.fn().mockReturnValue(1),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260317_ab12cd" })).rejects.toThrow(
      "boom",
    );

    expect(projectRepository.updateCurrentStoryboardVersion).not.toHaveBeenCalled();
    expect(projectRepository.updateStatus).not.toHaveBeenCalled();
    expect(taskFileStorage.writeTaskOutput).not.toHaveBeenCalled();
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
        findLatestByProjectId: vi.fn(),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      scriptStorage: {
        readOriginalScript: vi.fn(),
        writeOriginalScript: vi.fn(),
        deleteOriginalScript: vi.fn(),
      },
      storyboardProvider: {
        generateStoryboard: vi.fn(),
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
        getNextVersionNumber: vi.fn(),
      },
      clock: {
        now: vi.fn(),
      },
    });

    await expect(useCase.execute({ taskId: "missing-task" })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it("throws when the owning project does not exist", async () => {
    const useCase = createProcessStoryboardGenerateTaskUseCase({
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
        findById: vi.fn().mockResolvedValue(null),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
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
      scriptStorage: {
        readOriginalScript: vi.fn(),
        writeOriginalScript: vi.fn(),
        deleteOriginalScript: vi.fn(),
      },
      storyboardProvider: {
        generateStoryboard: vi.fn(),
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
        getNextVersionNumber: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260317_ab12cd" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it("passes reject review context into storyboard generation", async () => {
    const storyboardProvider = {
      generateStoryboard: vi.fn().mockResolvedValue({
        rawResponse: {
          candidates: [{ content: { parts: [{ text: "{}" }] } }],
        },
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          summary: "Generated storyboard summary",
          scenes: [],
        },
      }),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
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
          scriptBytes: 7,
          status: "storyboard_generating",
          createdAt: "2026-03-17T12:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
        }),
        updateScriptMetadata: vi.fn(),
        updateCurrentStoryboardVersion: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          taskType: "storyboard_generate",
          scriptPath: "script/original.txt",
          scriptUpdatedAt: "2026-03-17T12:00:00.000Z",
          reviewContext: {
            reason: "Need a brighter ending.",
            rejectedVersionId: "sbv_20260317_prev",
          },
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      scriptStorage: {
        readOriginalScript: vi.fn().mockResolvedValue("Scene 1: A enters the room"),
        writeOriginalScript: vi.fn(),
        deleteOriginalScript: vi.fn(),
      },
      storyboardProvider,
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
      },
      storyboardVersionRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findCurrentByProjectId: vi.fn(),
        getNextVersionNumber: vi.fn().mockReturnValue(2),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-17T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-17T12:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260317_ab12cd" });

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
