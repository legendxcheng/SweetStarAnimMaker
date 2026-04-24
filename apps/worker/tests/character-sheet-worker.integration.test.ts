import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildSpec2WorkerServices } from "../src/bootstrap/build-spec2-worker-services";

describe("character-sheet worker integration", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
    tempDirs.length = 0;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards batch task input into the configured prompt provider", async () => {
    const promptProvider = {
      generateCharacterPrompt: vi.fn().mockResolvedValue({
        promptText: "Silver pilot jacket",
        rawResponse: "Silver pilot jacket",
        provider: "gemini",
        model: "gemini-3.1-pro-preview",
      }),
    };
    const services = buildSpec2WorkerServices({
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "task_20260317_character_sheets",
          projectId: "proj_20260317_ab12cd",
          type: "character_sheets_generate",
          status: "pending",
          queueName: "character-sheets-generate",
          storageDir:
            "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_character_sheets",
          inputRelPath: "tasks/task_20260317_character_sheets/input.json",
          outputRelPath: "tasks/task_20260317_character_sheets/output.json",
          logRelPath: "tasks/task_20260317_character_sheets/log.txt",
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
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_20260317_ab12cd",
          currentCharacterSheetBatchId: "char_batch_task_20260317_character_sheets",
          currentStoryboardId: null,
          status: "character_sheets_generating",
          createdAt: "2026-03-17T10:00:00.000Z",
          updatedAt: "2026-03-17T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-17T10:00:00.000Z",
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
          taskId: "task_20260317_character_sheets",
          projectId: "proj_20260317_ab12cd",
          taskType: "character_sheets_generate",
          sourceMasterPlotId: "mp_20260317_ab12cd",
          mainCharacters: ["Rin"],
        }),
        writeTaskOutput: vi.fn(),
        appendTaskLog: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue("Describe {{characterName}} using {{masterPlot.logline}}"),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn().mockResolvedValue({
          id: "mp_20260317_ab12cd",
          title: "The Last Sky Choir",
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis:
            "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin"],
          coreConflict:
            "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
          sourceTaskId: "task_master_plot",
          updatedAt: "2026-03-17T12:00:00.000Z",
          approvedAt: "2026-03-17T12:05:00.000Z",
        }),
      },
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      storyboardProvider: {
        generateStoryboard: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn().mockResolvedValue([]),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn(),
        updateCharacter: vi.fn(),
      },
      characterSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi
          .fn()
          .mockResolvedValue("Describe {{characterName}} using {{masterPlot.logline}}"),
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
        resolveReferenceImagePaths: vi.fn().mockResolvedValue([]),
      },
      sceneSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listScenesByBatchId: vi.fn().mockResolvedValue([]),
        insertScene: vi.fn(),
        findSceneById: vi.fn(),
        updateScene: vi.fn(),
      },
      sceneSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeScenePromptFiles: vi.fn(),
        writeCurrentImage: vi.fn(),
        writeImageVersion: vi.fn(),
        readCurrentSceneSheet: vi.fn(),
      },
      characterSheetPromptProvider: promptProvider,
      characterSheetImageProvider: {
        generateCharacterSheetImage: vi.fn(),
      },
      taskQueue: {
        enqueue: vi.fn(),
      },
      taskIdGenerator: {
        generateTaskId: vi.fn().mockReturnValue("task_20260317_char_rin"),
      },
      clock: {
        now: vi.fn().mockReturnValue("2026-03-17T12:01:00.000Z"),
      },
    });

    await services.processCharacterSheetsGenerateTask.execute({
      taskId: "task_20260317_character_sheets",
    });

    expect(promptProvider.generateCharacterPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "proj_20260317_ab12cd",
        characterName: "Rin",
        promptText:
          "Describe Rin using A disgraced pilot chases a cosmic song to save her flooded home.",
      }),
    );
  });

  it("falls back to Grok when Gemini prompt generation is blocked for prohibited content", async () => {
    vi.stubEnv("VECTORENGINE_API_TOKEN", "test-token");
    vi.stubEnv("VECTORENGINE_BASE_URL", "https://api.vectorengine.ai");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () =>
          JSON.stringify({
            error: {
              code: "PROHIBITED_CONTENT",
              message:
                "request blocked by Google Gemini (PROHIBITED_CONTENT): content is prohibited under official usage policies.",
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "Silver pilot jacket",
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260317_character_sheets",
        projectId: "proj_20260317_ab12cd",
        type: "character_sheets_generate",
        status: "pending",
        queueName: "character-sheets-generate",
        storageDir:
          "projects/proj_20260317_ab12cd-my-story/tasks/task_20260317_character_sheets",
        inputRelPath: "tasks/task_20260317_character_sheets/input.json",
        outputRelPath: "tasks/task_20260317_character_sheets/output.json",
        logRelPath: "tasks/task_20260317_character_sheets/log.txt",
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
        currentMasterPlotId: "mp_20260317_ab12cd",
        currentCharacterSheetBatchId: "char_batch_task_20260317_character_sheets",
        currentStoryboardId: null,
        status: "character_sheets_generating",
        createdAt: "2026-03-17T10:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-17T10:00:00.000Z",
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
        taskId: "task_20260317_character_sheets",
        projectId: "proj_20260317_ab12cd",
        taskType: "character_sheets_generate",
        sourceMasterPlotId: "mp_20260317_ab12cd",
        mainCharacters: ["Rin"],
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
        id: "mp_20260317_ab12cd",
        title: "The Last Sky Choir",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis:
          "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin"],
        coreConflict:
          "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
        sourceTaskId: "task_master_plot",
        updatedAt: "2026-03-17T12:00:00.000Z",
        approvedAt: "2026-03-17T12:05:00.000Z",
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
      readPromptTemplate: vi
        .fn()
        .mockResolvedValue("Describe {{characterName}} using {{masterPlot.logline}}"),
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
      resolveReferenceImagePaths: vi.fn().mockResolvedValue([]),
    };
    const taskQueue = {
      enqueue: vi.fn(),
    };

    const services = buildSpec2WorkerServices({
      taskRepository,
      projectRepository,
      taskFileStorage,
      masterPlotStorage,
      storyboardStorage: {
        writeRawResponse: vi.fn(),
        writeStoryboardVersion: vi.fn(),
        readStoryboardVersion: vi.fn(),
        writeCurrentStoryboard: vi.fn(),
        readCurrentStoryboard: vi.fn(),
      },
      characterSheetRepository,
      characterSheetStorage,
      sceneSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listScenesByBatchId: vi.fn().mockResolvedValue([]),
        insertScene: vi.fn(),
        findSceneById: vi.fn(),
        updateScene: vi.fn(),
      },
      sceneSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeScenePromptFiles: vi.fn(),
        writeCurrentImage: vi.fn(),
        writeImageVersion: vi.fn(),
        readCurrentSceneSheet: vi.fn(),
      },
      taskQueue,
      taskIdGenerator: {
        generateTaskId: vi.fn().mockReturnValue("task_20260317_char_rin"),
      },
      clock: {
        now: vi.fn().mockReturnValue("2026-03-17T12:01:00.000Z"),
      },
    });

    await services.processCharacterSheetsGenerateTask.execute({
      taskId: "task_20260317_character_sheets",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.vectorengine.ai/v1beta/models/gemini-3.1-pro-preview:generateContent",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.vectorengine.ai/v1/chat/completions");
    expect(characterSheetRepository.insertCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        promptTextGenerated: "Silver pilot jacket",
        promptTextCurrent: "Silver pilot jacket",
      }),
    );
    expect(taskQueue.enqueue).toHaveBeenCalledWith({
      taskId: "task_20260317_char_rin",
      queueName: "character-sheet-generate",
      taskType: "character_sheet_generate",
    });
  });

  it("routes character sheet generation through Ark while leaving the rest of the image stack untouched", async () => {
    vi.stubEnv("SEEDANCE_API_KEY", "test-token");
    vi.stubEnv("SEEDANCE_API_BASE_URL", "https://ark.cn-beijing.volces.com");
    vi.stubEnv("VECTORENGINE_BASE_URL", "https://api.vectorengine.ai");
    vi.stubEnv("CHARACTER_SHEET_IMAGE_MODEL", "doubao-seedream-5-0-260128");
    vi.stubEnv("IMAGE_UPLOAD_PROVIDER_ORDER", "psda1,picgo");
    vi.stubEnv("PICGO_API_KEY", "test-picgo-key");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: "doubao-seedream-5-0-260128",
          created: 1776997419,
          data: [
            {
              url: "https://cdn.example/generated-character.png",
              size: "2048x2048",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: async () =>
          Uint8Array.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x08, 0x00,
          ]).buffer.slice(0),
      });
    vi.stubGlobal("fetch", fetchMock);

    const taskRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "task_20260322_char_rin",
        projectId: "proj_20260322_ab12cd",
        type: "character_sheet_generate",
        status: "pending",
        queueName: "character-sheet-generate",
        storageDir: "projects/proj_20260322_ab12cd-my-story/tasks/task_20260322_char_rin",
        inputRelPath: "tasks/task_20260322_char_rin/input.json",
        outputRelPath: "tasks/task_20260322_char_rin/output.json",
        logRelPath: "tasks/task_20260322_char_rin/log.txt",
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
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn().mockResolvedValue([
        {
          id: "char_task_20260322_character_sheets_rin_1",
          projectId: "proj_20260322_ab12cd",
          projectStorageDir: "projects/proj_20260322_ab12cd-my-story",
          batchId: "char_batch_task_20260322_character_sheets",
          sourceMasterPlotId: "mp_20260322_ab12cd",
          characterName: "Rin",
          promptTextGenerated: "silver pilot jacket",
          promptTextCurrent: "silver pilot jacket, storm glare, scar at the brow",
          imageAssetPath:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/current.png",
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          status: "generating",
          updatedAt: "2026-03-22T12:00:00.000Z",
          approvedAt: null,
          sourceTaskId: "task_20260322_char_rin",
          storageDir:
            "projects/proj_20260322_ab12cd-my-story/character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1",
          currentImageRelPath:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/current.png",
          currentMetadataRelPath:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/current.json",
          promptGeneratedRelPath:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/prompt.generated.txt",
          promptCurrentRelPath:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/prompt.current.txt",
          promptVariablesRelPath:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/prompt.variables.json",
          imagePromptRelPath:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/image-prompt.txt",
          versionsStorageDir:
            "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/versions",
        },
      ]),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn().mockResolvedValue({
        id: "char_task_20260322_character_sheets_rin_1",
        projectId: "proj_20260322_ab12cd",
        projectStorageDir: "projects/proj_20260322_ab12cd-my-story",
        batchId: "char_batch_task_20260322_character_sheets",
        sourceMasterPlotId: "mp_20260322_ab12cd",
        characterName: "Rin",
        promptTextGenerated: "silver pilot jacket",
        promptTextCurrent: "silver pilot jacket, storm glare, scar at the brow",
        imageAssetPath:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/current.png",
        imageWidth: null,
        imageHeight: null,
        provider: null,
        model: null,
        status: "generating",
        updatedAt: "2026-03-22T12:00:00.000Z",
        approvedAt: null,
        sourceTaskId: "task_20260322_char_rin",
        storageDir:
          "projects/proj_20260322_ab12cd-my-story/character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1",
        currentImageRelPath:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/current.png",
        currentMetadataRelPath:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/current.json",
        promptGeneratedRelPath:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/prompt.generated.txt",
        promptCurrentRelPath:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/prompt.current.txt",
        promptVariablesRelPath:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/prompt.variables.json",
        imagePromptRelPath:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/image-prompt.txt",
        versionsStorageDir:
          "character-sheets/batches/char_batch_task_20260322_character_sheets/characters/char_task_20260322_character_sheets_rin_1/versions",
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
      listReferenceImages: vi.fn(),
      saveReferenceImages: vi.fn(),
      deleteReferenceImage: vi.fn(),
      getReferenceImageContent: vi.fn(),
      getImageContent: vi.fn(),
      resolveReferenceImagePaths: vi.fn(),
    };
    const taskFileStorage = {
      createTaskArtifacts: vi.fn(),
      readTaskInput: vi.fn().mockResolvedValue({
        taskId: "task_20260322_char_rin",
        projectId: "proj_20260322_ab12cd",
        taskType: "character_sheet_generate",
        batchId: "char_batch_task_20260322_character_sheets",
        characterId: "char_task_20260322_character_sheets_rin_1",
        sourceMasterPlotId: "mp_20260322_ab12cd",
        characterName: "Rin",
        promptTextCurrent: "silver pilot jacket, storm glare, scar at the brow",
        imagePromptTemplateKey: "character_sheet.turnaround.generate",
        referenceImagePaths: ["E:/tmp/ref-1.png"],
      }),
      writeTaskOutput: vi.fn(),
      appendTaskLog: vi.fn(),
    };
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260322_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260322_ab12cd-my-story",
        visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
        currentMasterPlotId: "mp_20260322_ab12cd",
        currentCharacterSheetBatchId: "char_batch_task_20260322_character_sheets",
        currentStoryboardId: null,
        status: "character_sheets_generating",
        createdAt: "2026-03-22T11:59:00.000Z",
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

    const services = buildSpec2WorkerServices({
      taskRepository,
      projectRepository,
      taskFileStorage,
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
      characterSheetRepository,
      characterSheetStorage,
      sceneSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listScenesByBatchId: vi.fn().mockResolvedValue([]),
        insertScene: vi.fn(),
        findSceneById: vi.fn(),
        updateScene: vi.fn(),
      },
      sceneSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeScenePromptFiles: vi.fn(),
        writeCurrentImage: vi.fn(),
        writeImageVersion: vi.fn(),
        readCurrentSceneSheet: vi.fn(),
      },
      clock: {
        now: vi
          .fn()
          .mockReturnValueOnce("2026-03-22T12:01:00.000Z")
          .mockReturnValueOnce("2026-03-22T12:02:00.000Z"),
      },
    });

    await services.processCharacterSheetGenerateTask.execute({
      taskId: "task_20260322_char_rin",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://ark.cn-beijing.volces.com/api/v3/images/generations");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://cdn.example/generated-character.png");

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("doubao-seedream-5-0-260128");
    expect(request.size).toBe("2K");
    expect(request.output_format).toBe("png");
    expect(request.watermark).toBe(false);
    expect(request.prompt).toContain("Turnaround sheet for Rin");
    expect(characterSheetRepository.updateCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "ark-character-sheet-image",
        model: "doubao-seedream-5-0-260128",
        imageWidth: 2048,
        imageHeight: 2048,
      }),
    );
    expect(taskRepository.markSucceeded).toHaveBeenCalledWith({
      taskId: "task_20260322_char_rin",
      updatedAt: "2026-03-22T12:02:00.000Z",
      finishedAt: "2026-03-22T12:02:00.000Z",
    });
  });
});
