import { describe, expect, it, vi } from "vitest";

import { createRegenerateCharacterSheetUseCase } from "../src/index";

describe("regenerate character sheet use case", () => {
  it("reuses the current prompt text without Gemini and enqueues a character image task", async () => {
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
    const taskQueue = { enqueue: vi.fn() };
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn(),
      insertCharacter: vi.fn(),
      findCharacterById: vi.fn().mockResolvedValue({
        id: "char_rin_1",
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        batchId: "char_batch_v1",
        sourceMasterPlotId: "mp_1",
        characterName: "Rin",
        promptTextGenerated: "silver pilot jacket",
        promptTextCurrent: "short black hair, aviator jacket, guarded expression",
        imageAssetPath: "current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "mock-image-provider",
        model: "turnaround-v1",
        status: "approved",
        updatedAt: "2026-03-21T00:09:00.000Z",
        approvedAt: "2026-03-21T00:10:00.000Z",
        sourceTaskId: "task_char_rin",
        storageDir: "ignored",
        currentImageRelPath: "ignored",
        currentMetadataRelPath: "ignored",
        promptGeneratedRelPath: "ignored",
        promptCurrentRelPath: "ignored",
        promptVariablesRelPath: "ignored",
        imagePromptRelPath: "ignored",
        versionsStorageDir: "ignored",
      }),
      updateCharacter: vi.fn(),
    };
    const useCase = createRegenerateCharacterSheetUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_1",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_1-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 88,
          currentMasterPlotId: "mp_1",
          currentCharacterSheetBatchId: "char_batch_v1",
          currentStoryboardId: null,
          status: "character_sheets_approved",
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
          premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      characterSheetRepository,
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
        resolveReferenceImagePaths: vi.fn().mockResolvedValue(["E:/tmp/ref-1.png"]),
        getReferenceImageContent: vi.fn(),
      },
      taskRepository,
      taskFileStorage,
      taskQueue,
      taskIdGenerator: { generateTaskId: () => "task_20260321_char_rin_regen" },
      clock: { now: () => "2026-03-21T00:12:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_1", characterId: "char_rin_1" });

    expect(taskFileStorage.createTaskArtifacts).toHaveBeenCalledWith({
      task: expect.objectContaining({ id: "task_20260321_char_rin_regen" }),
      input: expect.objectContaining({
        taskType: "character_sheet_generate",
        characterId: "char_rin_1",
        promptTextCurrent: "short black hair, aviator jacket, guarded expression",
        referenceImagePaths: ["E:/tmp/ref-1.png"],
      }),
    });
    expect(characterSheetRepository.updateCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "char_rin_1",
        status: "generating",
        approvedAt: null,
      }),
    );
    expect(result.type).toBe("character_sheet_generate");
  });
});
