import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  ProjectValidationError,
  createCreateMasterPlotGenerateTaskUseCase,
} from "../src/index";

describe("create master plot generate task use case", () => {
  it("creates a pending task from the saved premise text and enqueues it", async () => {
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
        status: "premise_ready",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const premiseStorage = {
      readPremise: vi
        .fn()
        .mockResolvedValue("A washed-up pilot discovers a singing comet above a drowned city."),
      writePremise: vi.fn(),
      deletePremise: vi.fn(),
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

    const useCase = createCreateMasterPlotGenerateTaskUseCase({
      projectRepository,
      premiseStorage,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260322_master_plot",
      },
      clock: {
        now: () => "2026-03-22T10:01:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260322_master_plot",
        type: "master_plot_generate",
      }),
      input: {
        taskId: "task_20260322_master_plot",
        projectId: "proj_20260322_ab12cd",
        taskType: "master_plot_generate",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        promptTemplateKey: "master_plot.generate",
      },
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260322_master_plot",
      queueName: "master-plot-generate",
      taskType: "master_plot_generate",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "master_plot_generating",
      updatedAt: "2026-03-22T10:01:00.000Z",
    });
    expect(result.type).toBe("master_plot_generate");
  });

  it("throws when the project does not exist", async () => {
    const useCase = createCreateMasterPlotGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      premiseStorage: {
        readPremise: vi.fn(),
        writePremise: vi.fn(),
        deletePremise: vi.fn(),
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
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: () => "task_20260322_master_plot",
      },
      clock: {
        now: () => "2026-03-22T10:01:00.000Z",
      },
    });

    await expect(useCase.execute({ projectId: "missing-project" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it("throws when the project is not premise_ready", async () => {
    const useCase = createCreateMasterPlotGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260322_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260322_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "master_plot_existing",
          currentCharacterSheetBatchId: null,
          currentStoryboardId: null,
          status: "master_plot_in_review",
          createdAt: "2026-03-22T10:00:00.000Z",
          updatedAt: "2026-03-22T10:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      premiseStorage: {
        readPremise: vi.fn(),
        writePremise: vi.fn(),
        deletePremise: vi.fn(),
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
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: () => "task_20260322_master_plot",
      },
      clock: {
        now: () => "2026-03-22T10:01:00.000Z",
      },
    });

    await expect(useCase.execute({ projectId: "proj_20260322_ab12cd" })).rejects.toBeInstanceOf(
      ProjectValidationError,
    );
  });
});
