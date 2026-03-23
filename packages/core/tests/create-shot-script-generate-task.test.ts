import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  ProjectValidationError,
  CurrentStoryboardNotFoundError,
  createCreateShotScriptGenerateTaskUseCase,
} from "../src/index";

describe("create shot script generate task use case", () => {
  it("creates a pending task from the approved current storyboard, snapshots input, and enqueues it", async () => {
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
        status: "storyboard_approved",
        createdAt: "2026-03-22T11:59:00.000Z",
        updatedAt: "2026-03-22T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-22T12:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
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
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
      writeCurrentStoryboard: vi.fn(),
      readCurrentStoryboard: vi.fn().mockResolvedValue({
        id: "storyboard_20260322_ab12cd",
        title: "The Last Sky Choir",
        episodeTitle: "Episode 1",
        sourceMasterPlotId: "mp_20260322_ab12cd",
        sourceTaskId: "task_storyboard",
        updatedAt: "2026-03-22T11:58:00.000Z",
        approvedAt: "2026-03-22T11:59:00.000Z",
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
      }),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn().mockResolvedValue({
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
        sourceTaskId: "task_master_plot",
        updatedAt: "2026-03-22T11:57:00.000Z",
        approvedAt: "2026-03-22T11:58:00.000Z",
      }),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn().mockResolvedValue([]),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
    };
    const characterSheetStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readCurrentCharacterSheet: vi.fn(),
      listReferenceImages: vi.fn(),
      saveReferenceImages: vi.fn(),
      deleteReferenceImage: vi.fn(),
      resolveReferenceImagePaths: vi.fn(),
      getReferenceImageContent: vi.fn(),
    };
    const useCase = createCreateShotScriptGenerateTaskUseCase({
      projectRepository,
      storyboardStorage,
      masterPlotStorage,
      characterSheetRepository,
      characterSheetStorage,
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: () => "task_20260322_shot_script",
      },
      clock: {
        now: () => "2026-03-22T12:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260322_ab12cd",
    });

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({
        id: "task_20260322_shot_script",
      }),
      input: expect.objectContaining({
        taskId: "task_20260322_shot_script",
        projectId: "proj_20260322_ab12cd",
        taskType: "shot_script_generate",
        sourceStoryboardId: "storyboard_20260322_ab12cd",
        storyboard: expect.objectContaining({
          id: "storyboard_20260322_ab12cd",
        }),
        sourceMasterPlotId: "mp_20260322_ab12cd",
        masterPlot: expect.objectContaining({
          title: "The Last Sky Choir",
        }),
        promptTemplateKey: "shot_script.generate",
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260322_ab12cd",
      status: "shot_script_generating",
      updatedAt: "2026-03-22T12:00:00.000Z",
    });
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260322_shot_script",
      queueName: "shot-script-generate",
      taskType: "shot_script_generate",
    });
    expect(result.type).toBe("shot_script_generate");
  });

  it("throws when the project does not exist", async () => {
    const useCase = createCreateShotScriptGenerateTaskUseCase({
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
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      characterSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
        listReferenceImages: vi.fn(),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
        getReferenceImageContent: vi.fn(),
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
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: () => "task_20260322_shot_script" },
      clock: { now: () => "2026-03-22T12:00:00.000Z" },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("throws when the approved current storyboard is missing", async () => {
    const useCase = createCreateShotScriptGenerateTaskUseCase({
      projectRepository: {
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
          currentStoryboardId: null,
          currentShotScriptId: null,
          status: "storyboard_approved",
          createdAt: "2026-03-22T11:59:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T12:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn().mockResolvedValue(null),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      characterSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
        listReferenceImages: vi.fn(),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
        getReferenceImageContent: vi.fn(),
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
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: () => "task_20260322_shot_script" },
      clock: { now: () => "2026-03-22T12:00:00.000Z" },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260322_ab12cd",
      }),
    ).rejects.toBeInstanceOf(CurrentStoryboardNotFoundError);
  });

  it("throws when the project is not yet storyboard_approved", async () => {
    const useCase = createCreateShotScriptGenerateTaskUseCase({
      projectRepository: {
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
          status: "storyboard_in_review",
          createdAt: "2026-03-22T11:59:00.000Z",
          updatedAt: "2026-03-22T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-22T12:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      characterSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
        listReferenceImages: vi.fn(),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
        getReferenceImageContent: vi.fn(),
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
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: () => "task_20260322_shot_script" },
      clock: { now: () => "2026-03-22T12:00:00.000Z" },
    });

    await expect(
      useCase.execute({ projectId: "proj_20260322_ab12cd" }),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });
});
