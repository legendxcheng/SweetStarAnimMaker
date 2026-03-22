import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  TaskNotFoundError,
  createProcessCharacterSheetGenerateTaskUseCase,
} from "../src/index";

describe("process character sheet generate task use case", () => {
  it("renders the image prompt, persists current assets, and marks the character in review", async () => {
    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260321_char_rin",
        projectId: "proj_20260321_ab12cd",
        type: "character_sheet_generate",
        status: "pending",
        queueName: "character-sheet-generate",
        storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_char_rin",
        inputRelPath: "tasks/task_20260321_char_rin/input.json",
        outputRelPath: "tasks/task_20260321_char_rin/output.json",
        logRelPath: "tasks/task_20260321_char_rin/log.txt",
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
        currentCharacterSheetBatchId: "char_batch_task_20260321_character_sheets",
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
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260321_char_rin",
        projectId: "proj_20260321_ab12cd",
        taskType: "character_sheet_generate",
        batchId: "char_batch_task_20260321_character_sheets",
        characterId: "char_rin_1",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        characterName: "Rin",
        promptTextCurrent: "silver pilot jacket, storm glare, scar at the brow",
        imagePromptTemplateKey: "character_sheet.turnaround.generate",
        referenceImagePaths: ["E:/tmp/ref-1.png"],
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn().mockResolvedValue([
        {
          id: "char_rin_1",
          projectId: "proj_20260321_ab12cd",
          projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
          batchId: "char_batch_task_20260321_character_sheets",
          sourceMasterPlotId: "mp_20260321_ab12cd",
          characterName: "Rin",
          promptTextGenerated: "silver pilot jacket",
          promptTextCurrent: "silver pilot jacket, storm glare, scar at the brow",
          imageAssetPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/current.png",
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          status: "generating",
          updatedAt: "2026-03-21T12:00:00.000Z",
          approvedAt: null,
          sourceTaskId: "task_20260321_char_rin",
          storageDir:
            "projects/proj_20260321_ab12cd-my-story/character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1",
          currentImageRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/current.png",
          currentMetadataRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/current.json",
          promptGeneratedRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/prompt.generated.txt",
          promptCurrentRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/prompt.current.txt",
          promptVariablesRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/prompt.variables.json",
          imagePromptRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/image-prompt.txt",
          versionsStorageDir:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/versions",
        },
        {
          id: "char_ivo_2",
          projectId: "proj_20260321_ab12cd",
          projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
          batchId: "char_batch_task_20260321_character_sheets",
          sourceMasterPlotId: "mp_20260321_ab12cd",
          characterName: "Ivo",
          promptTextGenerated: "grease-stained coat",
          promptTextCurrent: "grease-stained coat",
          imageAssetPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/current.png",
          imageWidth: 1536,
          imageHeight: 1024,
          provider: "mock-image-provider",
          model: "turnaround-v1",
          status: "in_review",
          updatedAt: "2026-03-21T12:00:00.000Z",
          approvedAt: null,
          sourceTaskId: "task_20260321_char_ivo",
          storageDir:
            "projects/proj_20260321_ab12cd-my-story/character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2",
          currentImageRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/current.png",
          currentMetadataRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/current.json",
          promptGeneratedRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/prompt.generated.txt",
          promptCurrentRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/prompt.current.txt",
          promptVariablesRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/prompt.variables.json",
          imagePromptRelPath:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/image-prompt.txt",
          versionsStorageDir:
            "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_ivo_2/versions",
        },
      ]),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn().mockResolvedValue({
        id: "char_rin_1",
        projectId: "proj_20260321_ab12cd",
        projectStorageDir: "projects/proj_20260321_ab12cd-my-story",
        batchId: "char_batch_task_20260321_character_sheets",
        sourceMasterPlotId: "mp_20260321_ab12cd",
        characterName: "Rin",
        promptTextGenerated: "silver pilot jacket",
        promptTextCurrent: "silver pilot jacket, storm glare, scar at the brow",
        imageAssetPath:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/current.png",
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        status: "generating",
        updatedAt: "2026-03-21T12:00:00.000Z",
        approvedAt: null,
        sourceTaskId: "task_20260321_char_rin",
        storageDir:
          "projects/proj_20260321_ab12cd-my-story/character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1",
        currentImageRelPath:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/current.png",
        currentMetadataRelPath:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/current.json",
        promptGeneratedRelPath:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/prompt.generated.txt",
        promptCurrentRelPath:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/prompt.current.txt",
        promptVariablesRelPath:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/prompt.variables.json",
        imagePromptRelPath:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/image-prompt.txt",
        versionsStorageDir:
          "character-sheets/batches/char_batch_task_20260321_character_sheets/characters/char_rin_1/versions",
      }),
      updateCharacter: vi.fn(),
    };
    const characterSheetStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue("Turnaround sheet for {{characterName}}: {{promptTextCurrent}}"),
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readCurrentCharacterSheet: vi.fn(),
    };
    const imageProvider = {
      generateCharacterSheetImage: vi.fn().mockResolvedValue({
        imageBytes: new Uint8Array([1, 2, 3]),
        width: 1536,
        height: 1024,
        rawResponse: '{"image":"ok"}',
        provider: "mock-image-provider",
        model: "turnaround-v1",
      }),
    };
    const useCase = createProcessCharacterSheetGenerateTaskUseCase({
      taskRepository,
      projectRepository,
      taskFileStorage,
      characterSheetRepository,
      characterSheetStorage,
      characterSheetImageProvider: imageProvider,
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await useCase.execute({ taskId: "task_20260321_char_rin" });

    expect(imageProvider.generateCharacterSheetImage).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      characterId: "char_rin_1",
      promptText:
        "Turnaround sheet for Rin: silver pilot jacket, storm glare, scar at the brow",
      referenceImagePaths: ["E:/tmp/ref-1.png"],
    });
    expect(characterSheetStorage.writeCurrentImage).toHaveBeenCalledWith({
      character: expect.objectContaining({ id: "char_rin_1" }),
      imageBytes: new Uint8Array([1, 2, 3]),
      metadata: expect.objectContaining({
        width: 1536,
        height: 1024,
        provider: "mock-image-provider",
        model: "turnaround-v1",
      }),
    });
    expect(characterSheetRepository.updateCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "char_rin_1",
        status: "in_review",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "mock-image-provider",
        model: "turnaround-v1",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260321_ab12cd",
      status: "character_sheets_in_review",
      updatedAt: "2026-03-21T12:02:00.000Z",
    });
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260321_char_rin",
      updatedAt: "2026-03-21T12:02:00.000Z",
      finishedAt: "2026-03-21T12:02:00.000Z",
    });
  });

  it("throws when the task does not exist", async () => {
    const useCase = createProcessCharacterSheetGenerateTaskUseCase({
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
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn(),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
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
      },
      characterSheetImageProvider: { generateCharacterSheetImage: vi.fn() },
      clock: { now: vi.fn() },
    });

    await expect(
      useCase.execute({ taskId: "missing-task" }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("throws when the owning project does not exist", async () => {
    const useCase = createProcessCharacterSheetGenerateTaskUseCase({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260321_char_rin",
          projectId: "proj_20260321_ab12cd",
          type: "character_sheet_generate",
          status: "pending",
          queueName: "character-sheet-generate",
          storageDir: "projects/proj_20260321_ab12cd-my-story/tasks/task_20260321_char_rin",
          inputRelPath: "tasks/task_20260321_char_rin/input.json",
          outputRelPath: "tasks/task_20260321_char_rin/output.json",
          logRelPath: "tasks/task_20260321_char_rin/log.txt",
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
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      taskFileStorage: {
        createTaskArtifacts: vi.fn(),
        readTaskInput: vi.fn().mockResolvedValue({
          taskId: "task_20260321_char_rin",
          projectId: "proj_20260321_ab12cd",
          taskType: "character_sheet_generate",
          batchId: "char_batch_task_20260321_character_sheets",
          characterId: "char_rin_1",
          sourceMasterPlotId: "mp_20260321_ab12cd",
          characterName: "Rin",
          promptTextCurrent: "silver pilot jacket",
          imagePromptTemplateKey: "character_sheet.turnaround.generate",
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
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
      },
      characterSheetImageProvider: { generateCharacterSheetImage: vi.fn() },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-21T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-21T12:02:00.000Z"),
      },
    });

    await expect(useCase.execute({ taskId: "task_20260321_char_rin" })).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });
});
