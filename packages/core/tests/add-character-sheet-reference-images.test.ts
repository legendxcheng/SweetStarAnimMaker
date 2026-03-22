import { describe, expect, it, vi } from "vitest";

import {
  CharacterSheetNotFoundError,
  createAddCharacterSheetReferenceImagesUseCase,
} from "../src/index";

describe("add character sheet reference images use case", () => {
  it("stores uploaded image files for a character and returns updated detail", async () => {
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
        promptTextCurrent: "silver pilot jacket",
        referenceImages: [],
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
    const characterSheetStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeBatchManifest: vi.fn(),
      writeGeneratedPrompt: vi.fn(),
      writeImageVersion: vi.fn(),
      writeCurrentImage: vi.fn(),
      readCurrentCharacterSheet: vi.fn(),
      listReferenceImages: vi.fn(),
      saveReferenceImages: vi.fn().mockResolvedValue([
        {
          id: "ref_001",
          fileName: "ref-001.png",
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ]),
      deleteReferenceImage: vi.fn(),
      resolveReferenceImagePaths: vi.fn(),
      getReferenceImageContent: vi.fn(),
    };
    const useCase = createAddCharacterSheetReferenceImagesUseCase({
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
      characterSheetStorage,
      clock: {
        now: vi.fn().mockReturnValue("2026-03-22T12:00:00.000Z"),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_1",
      characterId: "char_rin_1",
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
        },
      ],
    });

    expect(characterSheetStorage.saveReferenceImages).toHaveBeenCalledWith({
      character: expect.objectContaining({ id: "char_rin_1" }),
      files: [
        {
          originalFileName: "rin-face.png",
          mimeType: "image/png",
          sizeBytes: 3,
          contentBytes: new Uint8Array([1, 2, 3]),
          createdAt: "2026-03-22T12:00:00.000Z",
        },
      ],
    });
    expect(result.referenceImages).toEqual([
      expect.objectContaining({
        id: "ref_001",
        fileName: "ref-001.png",
      }),
    ]);
  });

  it("rejects when the character does not belong to the project", async () => {
    const useCase = createAddCharacterSheetReferenceImagesUseCase({
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
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn(),
        listCharactersByBatchId: vi.fn(),
        insertCharacter: vi.fn(),
        findCharacterById: vi.fn().mockResolvedValue({
          id: "char_rin_1",
          projectId: "proj_other",
          projectStorageDir: "projects/proj_other-story",
          batchId: "char_batch_v1",
          sourceMasterPlotId: "mp_1",
          characterName: "Rin",
          promptTextGenerated: "silver pilot jacket",
          promptTextCurrent: "silver pilot jacket",
          referenceImages: [],
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
      clock: { now: vi.fn() },
    });

    await expect(
      useCase.execute({
        projectId: "proj_1",
        characterId: "char_rin_1",
        files: [
          {
            originalFileName: "rin-face.png",
            mimeType: "image/png",
            sizeBytes: 3,
            contentBytes: new Uint8Array([1, 2, 3]),
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CharacterSheetNotFoundError);
  });
});
