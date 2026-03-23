import { describe, expect, it, vi } from "vitest";

import { createListCharacterSheetsUseCase } from "../src/index";

describe("list character sheets use case", () => {
  it("returns the current batch summary and its characters", async () => {
    const useCase = createListCharacterSheetsUseCase({
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
        updateCurrentShotScript: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      characterSheetRepository: {
        insertBatch: vi.fn(),
        findBatchById: vi.fn().mockResolvedValue({
          id: "char_batch_v1",
          projectId: "proj_1",
          projectStorageDir: "projects/proj_1-my-story",
          sourceMasterPlotId: "mp_1",
          characterCount: 2,
          storageDir: "projects/proj_1-my-story/character-sheets/batches/char_batch_v1",
          manifestRelPath: "character-sheets/batches/char_batch_v1/manifest.json",
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:10:00.000Z",
        }),
        listCharactersByBatchId: vi.fn().mockResolvedValue([
          {
            id: "char_rin_1",
            projectId: "proj_1",
            projectStorageDir: "projects/proj_1-my-story",
            batchId: "char_batch_v1",
            sourceMasterPlotId: "mp_1",
            characterName: "Rin",
            promptTextGenerated: "silver pilot jacket",
            promptTextCurrent: "silver pilot jacket",
            imageAssetPath: "character-sheets/batches/char_batch_v1/characters/char_rin_1/current.png",
            imageWidth: 1536,
            imageHeight: 1024,
            provider: "mock-image-provider",
            model: "turnaround-v1",
            status: "approved",
            updatedAt: "2026-03-21T00:10:00.000Z",
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
          },
          {
            id: "char_ivo_2",
            projectId: "proj_1",
            projectStorageDir: "projects/proj_1-my-story",
            batchId: "char_batch_v1",
            sourceMasterPlotId: "mp_1",
            characterName: "Ivo",
            promptTextGenerated: "grease-stained coat",
            promptTextCurrent: "grease-stained coat",
            imageAssetPath: null,
            imageWidth: null,
            imageHeight: null,
            provider: null,
            model: null,
            status: "in_review",
            updatedAt: "2026-03-21T00:09:00.000Z",
            approvedAt: null,
            sourceTaskId: "task_char_ivo",
            storageDir: "ignored",
            currentImageRelPath: "ignored",
            currentMetadataRelPath: "ignored",
            promptGeneratedRelPath: "ignored",
            promptCurrentRelPath: "ignored",
            promptVariablesRelPath: "ignored",
            imagePromptRelPath: "ignored",
            versionsStorageDir: "ignored",
          },
        ]),
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
        listReferenceImages: vi
          .fn()
          .mockResolvedValueOnce([
            {
              id: "ref_1",
              fileName: "ref-001.png",
              originalFileName: "rin-face.png",
              mimeType: "image/png",
              sizeBytes: 1234,
              createdAt: "2026-03-22T12:00:00.000Z",
            },
          ])
          .mockResolvedValueOnce([]),
        saveReferenceImages: vi.fn(),
        deleteReferenceImage: vi.fn(),
        resolveReferenceImagePaths: vi.fn(),
        getReferenceImageContent: vi.fn(),
      },
    });

    const result = await useCase.execute({ projectId: "proj_1" });

    expect(result.currentBatch.approvedCharacterCount).toBe(1);
    expect(result.characters).toHaveLength(2);
    expect(result.characters[0]?.referenceImages[0]?.fileName).toBe("ref-001.png");
    expect(result.characters[1]?.referenceImages).toEqual([]);
  });
});
