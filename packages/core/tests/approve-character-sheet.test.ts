import { describe, expect, it, vi } from "vitest";

import { createApproveCharacterSheetUseCase } from "../src/index";

describe("approve character sheet use case", () => {
  it("approves the character and moves the project to character_sheets_approved when all are approved", async () => {
    const characterSheetRepository = {
      insertBatch: vi.fn(),
      findBatchById: vi.fn(),
      listCharactersByBatchId: vi.fn().mockResolvedValue([
        { id: "char_rin_1", status: "approved" },
        { id: "char_ivo_2", status: "approved" },
      ]),
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
        imageAssetPath: "current.png",
        imageWidth: 1536,
        imageHeight: 1024,
        provider: "mock-image-provider",
        model: "turnaround-v1",
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
    };
    const projectRepository = {
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
    };
    const useCase = createApproveCharacterSheetUseCase({
      projectRepository,
      characterSheetRepository,
      clock: { now: () => "2026-03-21T00:12:00.000Z" },
    });

    const result = await useCase.execute({ projectId: "proj_1", characterId: "char_rin_1" });

    expect(characterSheetRepository.updateCharacter).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "char_rin_1",
        status: "approved",
        approvedAt: "2026-03-21T00:12:00.000Z",
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_1",
      status: "character_sheets_approved",
      updatedAt: "2026-03-21T00:12:00.000Z",
    });
    expect(result.status).toBe("approved");
  });
});
