import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessShotScriptGenerateTaskUseCase,
} from "../src/index";

describe("process shot script generate task use case", () => {
  it("renders the prompt, persists the current shot script, and marks the task succeeded", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260322_shot_script",
        projectId: "proj_20260322_ab12cd",
        type: "shot_script_generate",
        status: "pending",
        queueName: "shot-script-generate",
        storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_shot_script",
        inputRelPath: "tasks/task_20260322_shot_script/input.json",
        outputRelPath: "tasks/task_20260322_shot_script/output.json",
        logRelPath: "tasks/task_20260322_shot_script/log.txt",
        errorMessage: null,
        createdAt: "2026-03-22T12:00:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
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
        currentMasterPlotId: "mp_20260322_ab12cd",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_20260322_ab12cd",
        currentShotScriptId: null,
        status: "shot_script_generating",
        createdAt: "2026-03-22T12:00:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T12:00:00.000Z",
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
        taskId: "task_20260322_shot_script",
        projectId: "proj_20260322_ab12cd",
        taskType: "shot_script_generate",
        sourceStoryboardId: "storyboard_20260322_ab12cd",
        sourceMasterPlotId: "mp_20260322_ab12cd",
        storyboard: {
          id: "storyboard_20260322_ab12cd",
          title: "The Last Sky Choir",
          episodeTitle: "Episode 1",
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
                  durationSec: 4,
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
        masterPlot: {
          id: "mp_20260322_ab12cd",
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
        promptTemplateKey: "shot_script.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const shotScriptStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue(
          "Convert storyboard into shot script:\n{{storyboard.title}}\n{{storyboard.scenes.0.segments.0.visual}}",
        ),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeShotScriptVersion: vi.fn(),
      readShotScriptVersion: vi.fn(),
      writeCurrentShotScript: vi.fn(),
      readCurrentShotScript: vi.fn(),
    };
    const shotScriptProvider = {
      generateShotScript: vi.fn().mockResolvedValue({
        rawResponse: '{"id":"shot_script_20260322_ab12cd"}',
        shotScript: {
          id: "shot_script_20260322_ab12cd",
          title: "Episode 1 Shot Script",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          sourceTaskId: "task_20260322_shot_script",
          updatedAt: "2026-03-22T12:02:00.000Z",
          approvedAt: null,
          shots: [
            {
              id: "shot_1",
              sceneId: "scene_1",
              segmentId: "segment_1",
              order: 1,
              shotCode: "S01-SG01",
              shotPurpose: "Establish the flooded market",
              subjectCharacters: ["Rin"],
              environment: "Flooded dawn market",
              framing: "medium wide shot",
              cameraAngle: "eye level",
              composition: "Rin framed by hanging lanterns",
              actionMoment: "Rin pauses at the waterline",
              emotionTone: "uneasy anticipation",
              continuityNotes: "Keep soaked satchel on left shoulder",
              imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
              negativePrompt: null,
              motionHint: null,
              durationSec: 4,
            },
          ],
        },
      }),
    };
    const useCase = createProcessShotScriptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptProvider,
      shotScriptStorage,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-22T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-22T12:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260322_shot_script" });

    expect(taskRepository.markRunning).toHaveBeenCalledWith({
      taskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:01:00.000Z",
      startedAt: "2026-03-22T12:01:00.000Z",
    });
    expect(shotScriptStorage.writePromptSnapshot).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_shot_script",
      promptText:
        "Convert storyboard into shot script:\nThe Last Sky Choir\nRain shakes across the cockpit glass.",
      promptVariables: expect.objectContaining({
        storyboard: expect.objectContaining({
          id: "storyboard_20260322_ab12cd",
        }),
      }),
    });
    expect(shotScriptProvider.generateShotScript).toHaveBeenCalledWith({
      promptText:
        "Convert storyboard into shot script:\nThe Last Sky Choir\nRain shakes across the cockpit glass.",
      variables: expect.objectContaining({
        storyboard: expect.objectContaining({
          id: "storyboard_20260322_ab12cd",
        }),
      }),
    });
    expect(shotScriptStorage.writeRawResponse).toHaveBeenCalledWith({
      taskStorageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_shot_script",
      rawResponse: '{"id":"shot_script_20260322_ab12cd"}',
    });
    expect(shotScriptStorage.writeCurrentShotScript).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260322_ab12cd-my-story",
      shotScript: expect.objectContaining({
        id: "shot_script_20260322_ab12cd",
        sourceTaskId: "task_20260322_shot_script",
      }),
    });
    expect(projectRepository.updateCurrentShotScript).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      shotScriptId: "shot_script_20260322_ab12cd",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "shot_script_in_review",
      updatedAt: "2026-03-22T12:02:00.000Z",
    });
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260322_shot_script",
      }),
      output: {
        shotScriptId: "shot_script_20260322_ab12cd",
        shotCount: 1,
        totalDurationSec: 4,
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260322_shot_script",
      updatedAt: "2026-03-22T12:02:00.000Z",
      finishedAt: "2026-03-22T12:02:00.000Z",
    });
  });

  it("marks the task failed, logs the error, and returns the project to storyboard_approved", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260322_shot_script",
        projectId: "proj_20260322_ab12cd",
        type: "shot_script_generate",
        status: "pending",
        queueName: "shot-script-generate",
        storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_shot_script",
        inputRelPath: "tasks/task_20260322_shot_script/input.json",
        outputRelPath: "tasks/task_20260322_shot_script/output.json",
        logRelPath: "tasks/task_20260322_shot_script/log.txt",
        errorMessage: null,
        createdAt: "2026-03-22T12:00:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
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
        currentMasterPlotId: "mp_20260322_ab12cd",
        currentCharacterSheetBatchId: "char_batch_v1",
        currentStoryboardId: "storyboard_20260322_ab12cd",
        currentShotScriptId: "shot_script_previous",
        status: "shot_script_generating",
        createdAt: "2026-03-22T12:00:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T12:00:00.000Z",
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
        taskId: "task_20260322_shot_script",
        projectId: "proj_20260322_ab12cd",
        taskType: "shot_script_generate",
        sourceStoryboardId: "storyboard_20260322_ab12cd",
        storyboard: {
          id: "storyboard_20260322_ab12cd",
          title: "The Last Sky Choir",
          episodeTitle: "Episode 1",
          scenes: [],
        },
        promptTemplateKey: "shot_script.generate",
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const useCase = createProcessShotScriptGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      shotScriptProvider: {
        generateShotScript: async () => {
          throw new Error("boom");
        },
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn().mockResolvedValue("{{storyboard.title}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-22T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-22T12:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260322_shot_script" })).rejects.toThrow(
      "boom",
    );

    expect(projectRepository.updateCurrentShotScript).not.toHaveBeenCalled();
    expect(taskFileStorage.writeTaskOutput).not.toHaveBeenCalled();
    expect(taskFileStorage.appendTaskLog).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260322_shot_script",
      }),
      message: "shot script generation failed: boom",
    });
    expect(taskRepository.markFailed).toHaveBeenCalledWith({
      taskId: "task_20260322_shot_script",
      errorMessage: "boom",
      updatedAt: "2026-03-22T12:02:00.000Z",
      finishedAt: "2026-03-22T12:02:00.000Z",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "storyboard_approved",
      updatedAt: "2026-03-22T12:02:00.000Z",
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessShotScriptGenerateTaskUseCase({
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
      shotScriptProvider: {
        generateShotScript: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
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
    const useCase = createProcessShotScriptGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260322_shot_script",
          projectId: "proj_20260322_ab12cd",
          type: "shot_script_generate",
          status: "pending",
          queueName: "shot-script-generate",
          storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_shot_script",
          inputRelPath: "tasks/task_20260322_shot_script/input.json",
          outputRelPath: "tasks/task_20260322_shot_script/output.json",
          logRelPath: "tasks/task_20260322_shot_script/log.txt",
          errorMessage: null,
          createdAt: "2026-03-22T12:00:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
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
          taskId: "task_20260322_shot_script",
          projectId: "proj_20260322_ab12cd",
          taskType: "shot_script_generate",
          sourceStoryboardId: "storyboard_20260322_ab12cd",
          storyboard: {
            id: "storyboard_20260322_ab12cd",
            title: "The Last Sky Choir",
            episodeTitle: "Episode 1",
            scenes: [],
          },
          promptTemplateKey: "shot_script.generate",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      shotScriptProvider: {
        generateShotScript: vi.fn(),
      },
      shotScriptStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn().mockResolvedValue("{{storyboard.title}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeShotScriptVersion: vi.fn(),
        readShotScriptVersion: vi.fn(),
        writeCurrentShotScript: vi.fn(),
        readCurrentShotScript: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-22T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-22T12:02:00.000Z"),
      },
    });

    await expect(
      useCase.execute({ taskId: "task_20260322_shot_script" }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
