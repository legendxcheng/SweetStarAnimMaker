import { describe, expect, it, vi } from "vitest";

import {
  CurrentMasterPlotNotFoundError,
  ProjectNotFoundError,
  createCreateStoryboardGenerateTaskUseCase,
} from "../src/index";

describe("create storyboard generate task use case", () => {
  it("creates a pending task from the approved current master plot, snapshots input, and enqueues it", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260321_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_20260321_ab12cd",
        currentStoryboardId: null,
        status: "master_plot_approved",
        createdAt: "2026-03-21T11:59:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-21T12:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
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
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn().mockResolvedValue({
        id: "mp_20260321_ab12cd",
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
        sourceTaskId: "task_master_plot",
        updatedAt: "2026-03-21T11:58:00.000Z",
        approvedAt: "2026-03-21T11:59:00.000Z",
      }),
    };
    const useCase = createCreateStoryboardGenerateTaskUseCase({
      projectRepository,
      masterPlotStorage,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260321_storyboard",
      },
      clock: {
        now: () => "2026-03-21T12:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260321_ab12cd",
    });

    expect(taskRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task_20260321_storyboard",
        projectId: "proj_20260321_ab12cd",
        type: "storyboard_generate",
        status: "pending",
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260321_storyboard",
      }),
      input: {
        taskId: "task_20260321_storyboard",
        projectId: "proj_20260321_ab12cd",
        taskType: "storyboard_generate",
        sourceMasterPlotId: "mp_20260321_ab12cd",
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
        promptTemplateKey: "storyboard.generate",
        model: "gemini-3.1-pro-preview",
      },
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      status: "storyboard_generating",
      updatedAt: "2026-03-21T12:00:00.000Z",
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260321_storyboard",
      queueName: "storyboard-generate",
      taskType: "storyboard_generate",
    });
    expect(result.type).toBe("storyboard_generate");
  });

  it("throws when the project does not exist", async () => {
    const useCase = createCreateStoryboardGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue(null),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
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
        generateTaskId: () => "task_20260321_storyboard",
      },
      clock: {
        now: () => "2026-03-21T12:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("throws when the approved current master plot is missing", async () => {
    const useCase = createCreateStoryboardGenerateTaskUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260321_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260321_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: null,
          currentStoryboardId: null,
          status: "master_plot_approved",
          createdAt: "2026-03-21T11:59:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-21T12:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn().mockResolvedValue(null),
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
        generateTaskId: () => "task_20260321_storyboard",
      },
      clock: {
        now: () => "2026-03-21T12:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260321_ab12cd",
      }),
    ).rejects.toBeInstanceOf(CurrentMasterPlotNotFoundError);
  });

  it("marks the task failed when enqueueing fails", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn(),
      findLatestByProjectId: vi.fn(),
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
          id: "proj_20260321_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260321_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_20260321_ab12cd",
          currentStoryboardId: null,
          status: "master_plot_approved",
          createdAt: "2026-03-21T11:59:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-21T12:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn().mockResolvedValue({
          id: "mp_20260321_ab12cd",
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
          sourceTaskId: "task_master_plot",
          updatedAt: "2026-03-21T11:58:00.000Z",
          approvedAt: "2026-03-21T11:59:00.000Z",
        }),
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
        generateTaskId: () => "task_20260321_storyboard",
      },
      clock: {
        now: () => "2026-03-21T12:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260321_ab12cd",
      }),
    ).rejects.toThrow("redis down");

    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_20260321_storyboard",
      errorMessage: "redis down",
      updatedAt: "2026-03-21T12:00:00.000Z",
      finishedAt: "2026-03-21T12:00:00.000Z",
    });
  });
});
