import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  createUpdateProjectScriptUseCase,
} from "../src/index";

describe("update project script use case", () => {
  it("rewrites premise metadata and timestamps", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue({
        id: "proj_20260317_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 7,
        currentMasterPlotId: null,
        status: "premise_ready",
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-17T00:00:00.000Z",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
    };
    const premiseStorage = {
      writePremise: vi.fn().mockReturnValue({
        premiseRelPath: "premise/v1.md",
        premiseBytes: 15,
      }),
      readPremise: vi.fn().mockReturnValue("Old premise"),
      deletePremise: vi.fn(),
    };
    const useCase = createUpdateProjectScriptUseCase({
      repository,
      premiseStorage,
      clock: {
        now: () => "2026-03-17T01:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260317_ab12cd",
      premiseText: "Updated premise",
    });

    expect(repository.updatePremiseMetadata).toHaveBeenCalledWith({
      id: "proj_20260317_ab12cd",
      premiseBytes: 15,
      updatedAt: "2026-03-17T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-17T01:00:00.000Z",
    });
    expect(result.updatedAt).toBe("2026-03-17T01:00:00.000Z");
    expect(result.premise.updatedAt).toBe("2026-03-17T01:00:00.000Z");
    expect(result.premise.bytes).toBe(15);
  });

  it("restores the previous premise when metadata persistence fails", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue({
        id: "proj_20260317_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 7,
        currentMasterPlotId: null,
        status: "premise_ready",
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-17T00:00:00.000Z",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(() => {
        throw new Error("update failed");
      }),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
    };
    const premiseStorage = {
      writePremise: vi
        .fn()
        .mockReturnValueOnce({
          premiseRelPath: "premise/v1.md",
          premiseBytes: 15,
        })
        .mockReturnValueOnce({
          premiseRelPath: "premise/v1.md",
          premiseBytes: 7,
        }),
      readPremise: vi.fn().mockReturnValue("Old premise"),
      deletePremise: vi.fn(),
    };
    const useCase = createUpdateProjectScriptUseCase({
      repository,
      premiseStorage,
      clock: {
        now: () => "2026-03-17T01:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260317_ab12cd",
        premiseText: "Updated premise",
      }),
    ).rejects.toThrow("update failed");

    expect(premiseStorage.writePremise).toHaveBeenNthCalledWith(2, {
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      premiseText: "Old premise",
    });
  });

  it("throws when the project does not exist", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue(null),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateStatus: vi.fn(),
    };
    const premiseStorage = {
      writePremise: vi.fn(),
      readPremise: vi.fn(),
      deletePremise: vi.fn(),
    };
    const useCase = createUpdateProjectScriptUseCase({
      repository,
      premiseStorage,
      clock: {
        now: () => "2026-03-17T01:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
        premiseText: "Updated premise",
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
