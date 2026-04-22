import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessStoryboardGenerateTaskUseCase,
} from "../src/index";

describe("process storyboard generate task use case", () => {
  it("renders the prompt, persists the current storyboard, and marks the task succeeded", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260321_storyboard",
        projectId: "proj_20260321_ab12cd",
        type: "storyboard_generate",
        status: "pending",
        queueName: "storyboard-generate",
        storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
        inputRelPath: "tasks/task_20260321_storyboard/input.json",
        outputRelPath: "tasks/task_20260321_storyboard/output.json",
        logRelPath: "tasks/task_20260321_storyboard/log.txt",
        errorMessage: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
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
        id: "proj_20260321_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_20260321_ab12cd",
        currentStoryboardId: null,
        status: "storyboard_generating",
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-21T12:00:00.000Z",
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
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue(
          "Turn this master plot into storyboard scenes:\n{{masterPlot.logline}}\n{{masterPlot.synopsis}}",
        ),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn(),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
      writeCurrentStoryboard: vi.fn(),
      readCurrentStoryboard: vi.fn(),
    };
    const storyboardProvider = {
      generateStoryboard: vi.fn().mockResolvedValue({
        rawResponse: '{"id":"storyboard_20260321_ab12cd"}',
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
        storyboard: {
          id: "storyboard_20260321_ab12cd",
          title: "The Last Sky Choir",
          episodeTitle: "Episode 1",
          sourceMasterPlotId: "mp_20260321_ab12cd",
          sourceTaskId: "task_20260321_storyboard",
          updatedAt: "2026-03-21T12:02:00.000Z",
          approvedAt: null,
          scenes: [
            {
              id: "scene_1",
              order: 1,
              name: "Rin Hears The Sky",
              dramaticPurpose: "Trigger the inciting beat.",
              segments: [
                {
                  id: "segment_1",
                  order: 1,
                  durationSec: 6,
                  visual: "Rain shakes across the cockpit glass.",
                  characterAction: "Rin looks up.",
                  dialogue: "",
                  voiceOver: "That sound again.",
                  audio: "",
                  purpose: "Start the mystery.",
                },
              ],
            },
          ],
        },
      }),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      storyboardProvider,
      masterPlotStorage,
      storyboardStorage,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260321_storyboard" });

    expect(taskRepository.markRunning).toHaveBeenCalledWith({
      taskId: "task_20260321_storyboard",
      updatedAt: "2026-03-21T12:01:00.000Z",
      startedAt: "2026-03-21T12:01:00.000Z",
    });
    expect(masterPlotStorage.writePromptSnapshot).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
      promptText:
        "Turn this master plot into storyboard scenes:\nA disgraced pilot chases a cosmic song to save her flooded home.\nA fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
      promptVariables: {
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
      },
    });
    expect(storyboardProvider.generateStoryboard).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
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
      promptText:
        "Turn this master plot into storyboard scenes:\nA disgraced pilot chases a cosmic song to save her flooded home.\nA fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
    });
    expect(masterPlotStorage.writeRawResponse).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
      rawResponse: '{"id":"storyboard_20260321_ab12cd"}',
    });
    expect(storyboardStorage.writeCurrentStoryboard).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260321_ab12cd-my-story",
      storyboard: expect.objectContaining({
        id: "storyboard_20260321_ab12cd",
        sourceTaskId: "task_20260321_storyboard",
      }),
    });
    expect(projectRepository.updateCurrentStoryboard).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      storyboardId: "storyboard_20260321_ab12cd",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      status: "storyboard_in_review",
      updatedAt: "2026-03-21T12:02:00.000Z",
    });
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260321_storyboard",
      }),
      output: {
        storyboardId: "storyboard_20260321_ab12cd",
        sceneCount: 1,
        segmentCount: 1,
        totalDurationSec: 6,
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260321_storyboard",
      updatedAt: "2026-03-21T12:02:00.000Z",
      finishedAt: "2026-03-21T12:02:00.000Z",
    });
  });

  it("marks the task failed, logs the error, and returns the project to scene_sheets_approved", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260321_storyboard",
        projectId: "proj_20260321_ab12cd",
        type: "storyboard_generate",
        status: "pending",
        queueName: "storyboard-generate",
        storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
        inputRelPath: "tasks/task_20260321_storyboard/input.json",
        outputRelPath: "tasks/task_20260321_storyboard/output.json",
        logRelPath: "tasks/task_20260321_storyboard/log.txt",
        errorMessage: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
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
        id: "proj_20260321_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_20260321_ab12cd",
        currentStoryboardId: "storyboard_previous",
        status: "storyboard_generating",
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-21T12:00:00.000Z",
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
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      storyboardProvider: {
        generateStoryboard: async () => {
          throw new Error("boom");
        },
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn().mockResolvedValue("{{masterPlot.logline}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260321_storyboard" })).rejects.toThrow(
      "boom",
    );

    expect(projectRepository.updateCurrentStoryboard).not.toHaveBeenCalled();
    expect(taskFileStorage.writeTaskOutput).not.toHaveBeenCalled();
    expect(taskFileStorage.appendTaskLog).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260321_storyboard",
      }),
      message: "storyboard generation failed: boom",
    });
    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_20260321_storyboard",
      errorMessage: "boom",
      updatedAt: "2026-03-21T12:02:00.000Z",
      finishedAt: "2026-03-21T12:02:00.000Z",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      status: "scene_sheets_approved",
      updatedAt: "2026-03-21T12:02:00.000Z",
    });
  });

  it("restores the previous current storyboard when regeneration fails after clearing the project pointer", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260321_storyboard",
        projectId: "proj_20260321_ab12cd",
        type: "storyboard_generate",
        status: "pending",
        queueName: "storyboard-generate",
        storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
        inputRelPath: "tasks/task_20260321_storyboard/input.json",
        outputRelPath: "tasks/task_20260321_storyboard/output.json",
        logRelPath: "tasks/task_20260321_storyboard/log.txt",
        errorMessage: null,
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
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
        id: "proj_20260321_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260321_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_20260321_ab12cd",
        currentStoryboardId: null,
        status: "storyboard_generating",
        createdAt: "2026-03-21T12:00:00.000Z",
        updatedAt: "2026-03-21T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-21T12:00:00.000Z",
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
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
      writeCurrentStoryboard: vi.fn(),
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_previous",
        title: "Previous Storyboard",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        sourceTaskId: "task_previous",
        updatedAt: "2026-03-21T11:59:00.000Z",
        approvedAt: null,
        scenes: [
          {
            id: "scene_1",
            order: 1,
            name: "Opening",
            dramaticPurpose: "Keep previous in-review storyboard visible.",
            segments: [
              {
                id: "segment_1",
                order: 1,
                durationSec: 12,
                visual: "Rain shakes across the cockpit glass.",
                characterAction: "Rin looks up.",
                dialogue: "",
                voiceOver: "That sound again.",
                audio: "",
                purpose: "Start the mystery.",
              },
            ],
          },
        ],
      }),
    };
    const useCase = createProcessStoryboardGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      storyboardProvider: {
        generateStoryboard: async () => {
          throw new Error("boom");
        },
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn().mockResolvedValue("{{masterPlot.logline}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      storyboardStorage,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260321_storyboard" })).rejects.toThrow(
      "boom",
    );

    expect(projectRepository.updateCurrentStoryboard).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      storyboardId: "storyboard_previous",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      status: "storyboard_in_review",
      updatedAt: "2026-03-21T12:02:00.000Z",
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
      storyboardProvider: {
        generateStoryboard: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
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
          id: "task_20260321_storyboard",
          projectId: "proj_20260321_ab12cd",
          type: "storyboard_generate",
          status: "pending",
          queueName: "storyboard-generate",
          storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_storyboard",
          inputRelPath: "tasks/task_20260321_storyboard/input.json",
          outputRelPath: "tasks/task_20260321_storyboard/output.json",
          logRelPath: "tasks/task_20260321_storyboard/log.txt",
          errorMessage: null,
          createdAt: "2026-03-21T12:00:00.000Z",
          updatedAt: "2026-03-21T12:00:00.000Z",
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
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      storyboardProvider: {
        generateStoryboard: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn().mockResolvedValue("{{masterPlot.logline}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await expect(
      useCase.execute({ taskId: "task_20260321_storyboard" }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
