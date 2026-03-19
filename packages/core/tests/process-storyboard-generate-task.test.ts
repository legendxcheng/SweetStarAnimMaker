import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessStoryboardGenerateTaskUseCase,
} from "../src/index";

describe("process master plot generate task use case", () => {
  it("renders the prompt, persists the current master plot, and marks the task succeeded", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        type: "master_plot_generate",
        status: "pending",
        queueName: "master-plot-generate",
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
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: null,
        status: "master_plot_generating",
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-17T12:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        taskType: "master_plot_generate",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        promptTemplateKey: "master_plot.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue("Turn this premise into a master plot:\n{{premiseText}}"),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn(),
    };
    const masterPlotProvider = {
      generateMasterPlot: vi.fn().mockResolvedValue({
        rawResponse: '{"title":"The Last Sky Choir"}',
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        masterPlot: {
          title: "The Last Sky Choir",
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis:
            "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin", "Ivo"],
          coreConflict:
            "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
        },
      }),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotProvider,
      masterPlotStorage,
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
    expect(masterPlotStorage.writePromptSnapshot).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
      promptText:
        "Turn this premise into a master plot:\nA washed-up pilot discovers a singing comet above a drowned city.",
      promptVariables: {
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      },
    });
    expect(masterPlotProvider.generateMasterPlot).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptText:
        "Turn this premise into a master plot:\nA washed-up pilot discovers a singing comet above a drowned city.",
    });
    expect(masterPlotStorage.writeRawResponse).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_ab12cd",
      rawResponse: '{"title":"The Last Sky Choir"}',
    });
    expect(masterPlotStorage.writeCurrentMasterPlot).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      masterPlot: expect.objectContaining({
        id: "mp_20260317_ab12cd",
        title: "The Last Sky Choir",
        sourceTaskId: "task_20260317_ab12cd",
        approvedAt: null,
      }),
    });
    expect(projectRepository.updateCurrentMasterPlot).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      masterPlotId: "mp_20260317_ab12cd",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      status: "master_plot_in_review",
      updatedAt: "2026-03-17T12:02:00.000Z",
    });
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260317_ab12cd",
      }),
      output: {
        masterPlotId: "mp_20260317_ab12cd",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        promptTemplateKey: "master_plot.generate",
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      updatedAt: "2026-03-17T12:02:00.000Z",
      finishedAt: "2026-03-17T12:02:00.000Z",
    });
  });

  it("marks the task failed, logs the error, and returns the project to premise_ready", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        type: "master_plot_generate",
        status: "pending",
        queueName: "master-plot-generate",
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
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_previous",
        status: "master_plot_generating",
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-17T12:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260317_ab12cd",
        projectId: "proj_20260317_ab12cd",
        taskType: "master_plot_generate",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        promptTemplateKey: "master_plot.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotProvider: {
        generateMasterPlot: async () => {
          throw new Error("boom");
        },
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn().mockResolvedValue("{{premiseText}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
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

    expect(projectRepository.updateCurrentMasterPlot).not.toHaveBeenCalled();
    expect(taskFileStorage.writeTaskOutput).not.toHaveBeenCalled();
    expect(taskFileStorage.appendTaskLog).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260317_ab12cd",
      }),
      message: "master plot generation failed: boom",
    });
    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_20260317_ab12cd",
      errorMessage: "boom",
      updatedAt: "2026-03-17T12:02:00.000Z",
      finishedAt: "2026-03-17T12:02:00.000Z",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260317_ab12cd",
      status: "premise_ready",
      updatedAt: "2026-03-17T12:02:00.000Z",
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
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotProvider: {
        generateMasterPlot: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
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
          type: "master_plot_generate",
          status: "pending",
          queueName: "master-plot-generate",
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
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260317_ab12cd",
          projectId: "proj_20260317_ab12cd",
          taskType: "master_plot_generate",
          premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
          promptTemplateKey: "master_plot.generate",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotProvider: {
        generateMasterPlot: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn().mockResolvedValue("{{premiseText}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
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
});
