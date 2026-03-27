import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessCharacterSheetsGenerateTaskUseCase,
} from "../src/index";

describe("process character sheets generate task use case", () => {
  it("creates a batch, generates editable prompts, enqueues per-character image tasks, and marks the task succeeded", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260321_character_sheets",
        projectId: "proj_20260321_ab12cd",
        type: "character_sheets_generate",
        status: "pending",
        queueName: "character-sheets-generate",
        storageDir:
          "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_character_sheets",
        inputRelPath: "tasks/task_20260321_character_sheets/input.json",
        outputRelPath: "tasks/task_20260321_character_sheets/output.json",
        logRelPath: "tasks/task_20260321_character_sheets/log.txt",
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
        currentCharacterSheetBatchId: null,
        currentStoryboardId: null,
        status: "character_sheets_generating",
        createdAt: "2026-03-21T11:59:00.000Z",
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
        taskId: "task_20260321_character_sheets",
        projectId: "proj_20260321_ab12cd",
        taskType: "character_sheets_generate",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        mainCharacters: ["Rin", "Ivo"],
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
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
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn(),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn(),
      updateCharacter: vi.fn(),
    };
    const characterSheetStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue(
          "Build an appearance prompt for {{characterName}} in {{masterPlot.title}}.",
        ),
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readCurrentCharacterSheet: vi.fn(),
      listReferenceImages: vi.fn(),
      saveReferenceImages: vi.fn(),
      deleteReferenceImage: vi.fn(),
      getReferenceImageContent: vi.fn(),
      getImageContent: vi.fn(),
      resolveReferenceImagePaths: vi
        .fn()
        .mockResolvedValueOnce(["E:/tmp/ref-rin-1.png"])
        .mockResolvedValueOnce([]),
    };
    const promptProvider = {
      generateCharacterPrompt: vi
        .fn()
        .mockResolvedValueOnce({
          promptText: "silver pilot jacket, storm glare, scar at the brow",
          rawResponse: '{"prompt":"rin"}',
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
        })
        .mockResolvedValueOnce({
          promptText: "grease-stained coat, brass goggles, wary mechanic hands",
          rawResponse: '{"prompt":"ivo"}',
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
        }),
    };
    const taskQueue = { enqueue: vi.fn() };
    const useCase = createProcessCharacterSheetsGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotStorage,
      characterSheetRepository,
      characterSheetStorage,
      characterSheetPromptProvider: promptProvider,
      taskQueue,
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_20260321_char_rin")
          .mockReturnValueOnce("task_20260321_char_ivo"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260321_character_sheets" });

    expect(taskRepository.markRunning).toHaveBeenCalledWith({
      taskId: "task_20260321_character_sheets",
      updatedAt: "2026-03-21T12:01:00.000Z",
      startedAt: "2026-03-21T12:01:00.000Z",
    });
    expect(characterSheetRepository.insertBatch).toHaveBeenCalledTimes(1);
    expect(characterSheetRepository.insertCharacter).toHaveBeenCalledTimes(2);
    expect(characterSheetRepository.insertCharacter).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "char_task_20260321_character_sheets_rin_1",
      }),
    );
    expect(characterSheetRepository.insertCharacter).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "char_task_20260321_character_sheets_ivo_2",
      }),
    );
    expect(characterSheetStorage.writeGeneratedPrompt).toHaveBeenCalledTimes(2);
    expect(characterSheetStorage.resolveReferenceImagePaths).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
          character: expect.objectContaining({
          id: "char_task_20260321_character_sheets_rin_1",
          batchId: expect.any(String),
        }),
      }),
    );
    expect(characterSheetStorage.resolveReferenceImagePaths).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
          character: expect.objectContaining({
          id: "char_task_20260321_character_sheets_ivo_2",
          batchId: expect.any(String),
        }),
      }),
    );
    expect(projectRepository.updateCurrentCharacterSheetBatch).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      batchId: expect.any(String),
    });
    expect(taskQueue.enqueue).toHaveBeenCalledTimes(2);
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        input: expect.objectContaining({
          taskType: "character_sheet_generate",
          characterId: "char_task_20260321_character_sheets_rin_1",
          referenceImagePaths: ["E:/tmp/ref-rin-1.png"],
        }),
      }),
    );
    expect(taskFileStorage.createTaskArtifacts).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.not.objectContaining({
          referenceImagePaths: expect.anything(),
        }),
      }),
    );
    expect(taskFileStorage.writeTaskOutput).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_20260321_character_sheets" }),
      output: {
        batchId: expect.any(String),
        characterCount: 2,
      },
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260321_character_sheets",
      updatedAt: "2026-03-21T12:02:00.000Z",
      finishedAt: "2026-03-21T12:02:00.000Z",
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessCharacterSheetsGenerateTaskUseCase({
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
        getReferenceImageContent: vi.fn(),
        getImageContent: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
      },
      characterSheetPromptProvider: { generateCharacterPrompt: vi.fn() },
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: vi.fn() },
      clock: { now: vi.fn() },
    });

    await expect(
      useCase.execute({ taskId: "missing-task" }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("throws when the owning project does not exist", async () => {
    const useCase = createProcessCharacterSheetsGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260321_character_sheets",
          projectId: "proj_20260321_ab12cd",
          type: "character_sheets_generate",
          status: "pending",
          queueName: "character-sheets-generate",
          storageDir:
            "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_character_sheets",
          inputRelPath: "tasks/task_20260321_character_sheets/input.json",
          outputRelPath: "tasks/task_20260321_character_sheets/output.json",
          logRelPath: "tasks/task_20260321_character_sheets/log.txt",
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
          taskId: "task_20260321_character_sheets",
          projectId: "proj_20260321_ab12cd",
          taskType: "character_sheets_generate",
          sourceMasterPlotId: "mp_20260321_ab12cd",
          mainCharacters: ["Rin"],
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
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
        getReferenceImageContent: vi.fn(),
        getImageContent: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
      },
      characterSheetPromptProvider: { generateCharacterPrompt: vi.fn() },
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: { generateTaskId: vi.fn() },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await expect(
      useCase.execute({ taskId: "task_20260321_character_sheets" }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("starts multiple character prompt requests before earlier Gemini calls finish", async () => {
    let releaseFirstPrompt: (() => void) | null = null;
    const firstPromptGate = new Promise<void>((resolve) => {
      releaseFirstPrompt = resolve;
    });
    const promptProvider = {
      generateCharacterPrompt: vi
        .fn()
        .mockImplementationOnce(async () => {
          await firstPromptGate;
          return {
            promptText: "silver pilot jacket, storm glare, scar at the brow",
            rawResponse: '{"prompt":"rin"}',
            provider: "gemini",
            model: "gemini-3.1-pro-preview",
          };
        })
        .mockResolvedValueOnce({
          promptText: "grease-stained coat, brass goggles, wary mechanic hands",
          rawResponse: '{"prompt":"ivo"}',
          provider: "gemini",
          model: "gemini-3.1-pro-preview",
        }),
    };
    const useCase = createProcessCharacterSheetsGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260321_character_sheets",
          projectId: "proj_20260321_ab12cd",
          type: "character_sheets_generate",
          status: "pending",
          queueName: "character-sheets-generate",
          storageDir:
            "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_character_sheets",
          inputRelPath: "tasks/task_20260321_character_sheets/input.json",
          outputRelPath: "tasks/task_20260321_character_sheets/output.json",
          logRelPath: "tasks/task_20260321_character_sheets/log.txt",
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
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260321_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260321_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_20260321_ab12cd",
          currentCharacterSheetBatchId: null,
          currentStoryboardId: null,
          status: "character_sheets_generating",
          createdAt: "2026-03-21T11:59:00.000Z",
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
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260321_character_sheets",
          projectId: "proj_20260321_ab12cd",
          taskType: "character_sheets_generate",
          sourceMasterPlotId: "mp_20260321_ab12cd",
          mainCharacters: ["Rin", "Ivo"],
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
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
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue(
            "Build an appearance prompt for {{characterName}} in {{masterPlot.title}}.",
          ),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
        listReferenceImages: vi.fn(),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        getReferenceImageContent: vi.fn(),
        getImageContent: vi.fn(),
        resolveReferenceImagePaths: vi
          .fn()
          .mockResolvedValueOnce(["E:/tmp/ref-rin-1.png"])
          .mockResolvedValueOnce([]),
      },
      characterSheetPromptProvider: promptProvider,
      taskQueue: { enqueue: vi.fn() },
      taskIdGenerator: {
        generateTaskId: vi
          .fn()
          .mockReturnValueOnce("task_20260321_char_rin")
          .mockReturnValueOnce("task_20260321_char_ivo"),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    const execution = useCase.execute({ taskId: "task_20260321_character_sheets" });

    await vi.waitFor(() => {
      expect(promptProvider.generateCharacterPrompt).toHaveBeenCalled();
    });

    expect(promptProvider.generateCharacterPrompt).toHaveBeenCalledTimes(2);

    releaseFirstPrompt?.();
    await execution;
  });
});
