import { describe, expect, it, vi } from "vitest";

import {
  CharacterSheetNotFoundError,
  createGetCharacterSheetUseCase,
} from "../src/index";

describe("get character sheet use case", () => {
  it("returns the current character sheet record", async () => {
    const useCase = createGetCharacterSheetUseCase({
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
          status: "character_sheets_in_review",
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
      characterSheetRepository: {
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
          promptTextCurrent: "silver pilot jacket",
          imageAssetPath: null,
          imageWidth: null,
          imageHeight: null,
          provider: null,
          model: null,
          status: "in_review",
          updatedAt: "2026-03-21T00:09:00.000Z",
          approvedAt: null,
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
      },
      characterSheetStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeBatchManifest: vi.fn(),
        writeGeneratedPrompt: vi.fn(),
        writeImageVersion: vi.fn(),
        writeCurrentImage: vi.fn(),
        readCurrentCharacterSheet: vi.fn(),
        listReferenceImages: vi.fn().mockResolvedValue([
          {
            id: "ref_1",
            fileName: "ref-001.png",
            originalFileName: "rin-face.png",
            mimeType: "image/png",
            sizeBytes: 1234,
            createdAt: "2026-03-22T12:00:00.000Z",
          },
        ]),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
        getReferenceImageContent: vi.fn(),
      },
    });

    const result = await useCase.execute({ projectId: "proj_1", characterId: "char_rin_1" });

    expect(result.characterName).toBe("Rin");
    expect(result.referenceImages).toEqual([
      {
        id: "ref_1",
        fileName: "ref-001.png",
        originalFileName: "rin-face.png",
        mimeType: "image/png",
        sizeBytes: 1234,
        createdAt: "2026-03-22T12:00:00.000Z",
      },
    ]);
  });

  it("throws when the character sheet does not exist", async () => {
    const useCase = createGetCharacterSheetUseCase({
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
          status: "character_sheets_in_review",
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
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn().mockResolvedValue(null),
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
    });

    await expect(
      useCase.execute({ projectId: "proj_1", characterId: "missing" }),
    ).rejects.toBeInstanceOf(CharacterSheetNotFoundError);
  });
});
