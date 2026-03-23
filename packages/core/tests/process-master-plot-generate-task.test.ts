import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessMasterPlotGenerateTaskUseCase,
} from "../src/index";

describe("process master plot generate task use case", () => {
  it("renders the prompt, persists the current master plot, and marks the task succeeded", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260322_master_plot",
        projectId: "proj_20260322_ab12cd",
        type: "master_plot_generate",
        status: "pending",
        queueName: "master-plot-generate",
        storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_master_plot",
        inputRelPath: "tasks/task_20260322_master_plot/input.json",
        outputRelPath: "tasks/task_20260322_master_plot/output.json",
        logRelPath: "tasks/task_20260322_master_plot/log.txt",
        errorMessage: null,
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
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
        id: "proj_20260322_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: null,
        currentCharacterSheetBatchId: null,
        currentStoryboardId: null,
        status: "master_plot_generating",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
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
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260322_master_plot",
        projectId: "proj_20260322_ab12cd",
        taskType: "master_plot_generate",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        promptTemplateKey: "master_plot.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn().mockResolvedValue("Prompt:\n{{premiseText}}"),
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
          coreConflict: "Rin must choose between escape and saving the city.",
          emotionalArc: "She moves from bitterness to hope.",
          endingBeat: "The city rises on a final chorus of light.",
          targetDurationSec: 120,
        },
      }),
    };

    const useCase = createProcessMasterPlotGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotProvider,
      masterPlotStorage,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-22T10:01:00.000Z")
          .mockReturnValueOnce("2026-03-22T10:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260322_master_plot" });

    expect(masterPlotStorage.writePromptSnapshot).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_master_plot",
      promptText:
        "Prompt:\nA washed-up pilot discovers a singing comet above a drowned city.",
      promptVariables: {
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      },
    });
    expect(masterPlotProvider.generateMasterPlot).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptText:
        "Prompt:\nA washed-up pilot discovers a singing comet above a drowned city.",
    });
    expect(masterPlotStorage.writeCurrentMasterPlot).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260322_ab12cd-my-story",
      masterPlot: expect.objectContaining({
        id: "master_plot_20260322_master_plot",
        sourceTaskId: "task_20260322_master_plot",
      }),
    });
    expect(projectRepository.updateCurrentMasterPlot).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      masterPlotId: "master_plot_20260322_master_plot",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "master_plot_in_review",
      updatedAt: "2026-03-22T10:02:00.000Z",
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260322_master_plot",
      updatedAt: "2026-03-22T10:02:00.000Z",
      finishedAt: "2026-03-22T10:02:00.000Z",
    });
  });

  it("marks the task failed and resets the project back to premise_ready", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260322_master_plot",
        projectId: "proj_20260322_ab12cd",
        type: "master_plot_generate",
        status: "pending",
        queueName: "master-plot-generate",
        storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_master_plot",
        inputRelPath: "tasks/task_20260322_master_plot/input.json",
        outputRelPath: "tasks/task_20260322_master_plot/output.json",
        logRelPath: "tasks/task_20260322_master_plot/log.txt",
        errorMessage: null,
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
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
        id: "proj_20260322_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: null,
        currentCharacterSheetBatchId: null,
        currentStoryboardId: null,
        status: "master_plot_generating",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
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
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260322_master_plot",
        projectId: "proj_20260322_ab12cd",
        taskType: "master_plot_generate",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        promptTemplateKey: "master_plot.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const useCase = createProcessMasterPlotGenerateTaskUseCase({
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
          .mockReturnValueOnce("2026-03-22T10:01:00.000Z")
          .mockReturnValueOnce("2026-03-22T10:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260322_master_plot" })).rejects.toThrow(
      "boom",
    );

    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "premise_ready",
      updatedAt: "2026-03-22T10:02:00.000Z",
    });
    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_20260322_master_plot",
      errorMessage: "boom",
      updatedAt: "2026-03-22T10:02:00.000Z",
      finishedAt: "2026-03-22T10:02:00.000Z",
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessMasterPlotGenerateTaskUseCase({
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
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
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
    const useCase = createProcessMasterPlotGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260322_master_plot",
          projectId: "proj_20260322_ab12cd",
          type: "master_plot_generate",
          status: "pending",
          queueName: "master-plot-generate",
          storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_master_plot",
          inputRelPath: "tasks/task_20260322_master_plot/input.json",
          outputRelPath: "tasks/task_20260322_master_plot/output.json",
          logRelPath: "tasks/task_20260322_master_plot/log.txt",
          errorMessage: null,
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T10:00:00.000Z",
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
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260322_master_plot",
          projectId: "proj_20260322_ab12cd",
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
        now: vi.fn().mockReturnValueOnce("2026-03-22T10:01:00.000Z"),
      },
    });

    await expect(
      useCase.execute({ taskId: "task_20260322_master_plot" }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
