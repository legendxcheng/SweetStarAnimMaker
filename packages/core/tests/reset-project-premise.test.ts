import { describe, expect, it, vi } from "vitest";

import {
  ProjectNotFoundError,
  ProjectValidationError,
  createResetProjectPremiseUseCase,
} from "../src/index";

describe("reset project premise use case", () => {
  it("rewrites premise metadata, visual style, and resets the project to premise_ready", async () => {
    const nextPremiseText = "A retired courier steals back a star map from a drowned archive.";
    const repository = {
      insert: vi.fn(),
      findById: vi.fn().mockReturnValue({
        id: "proj_20260325_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260325_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 7,
        currentMasterPlotId: "master-plot-v1",
        currentCharacterSheetBatchId: "character-batch-v1",
        currentStoryboardId: "storyboard-v1",
        currentShotScriptId: "shot-script-v1",
        currentImageBatchId: "image-batch-v1",
        currentVideoBatchId: "video-batch-v1",
        visualStyleText: "旧风格",
        status: "videos_in_review",
        createdAt: "2026-03-25T00:00:00.000Z",
        updatedAt: "2026-03-25T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-25T00:00:00.000Z",
      }),
      listAll: vi.fn(),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentCharacterSheetBatch: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateCurrentShotScript: vi.fn(),
      updateCurrentImageBatch: vi.fn(),
      updateCurrentVideoBatch: vi.fn(),
      updateStatus: vi.fn(),
      resetToPremise: vi.fn(),
    };
    const premiseStorage = {
      writePremise: vi.fn().mockReturnValue({
        premiseRelPath: "premise/v1.md",
        premiseBytes: 42,
      }),
      readPremise: vi.fn().mockReturnValue("Old premise"),
      deletePremise: vi.fn(),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
    };
    const useCase = createResetProjectPremiseUseCase({
      repository,
      premiseStorage,
      masterPlotStorage,
      clock: {
        now: () => "2026-03-25T01:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260325_ab12cd",
      premiseText: nextPremiseText,
      visualStyleText: "胶片颗粒感，潮湿港口，低饱和暖金补光",
      confirmReset: true,
    });

    expect(premiseStorage.deletePremise).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260325_ab12cd-my-story",
    });
    expect(premiseStorage.writePremise).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260325_ab12cd-my-story",
      premiseText: nextPremiseText,
    });
    expect(masterPlotStorage.initializePromptTemplate).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260325_ab12cd-my-story",
      promptTemplateKey: "master_plot.generate",
    });
    expect(repository.resetToPremise).toHaveBeenCalledWith({
      projectId: "proj_20260325_ab12cd",
      premiseBytes: Buffer.byteLength(nextPremiseText, "utf8"),
      visualStyleText: "胶片颗粒感，潮湿港口，低饱和暖金补光",
      updatedAt: "2026-03-25T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T01:00:00.000Z",
    });
    expect(result.id).toBe("proj_20260325_ab12cd");
    expect(result.name).toBe("My Story");
    expect(result.slug).toBe("my-story");
    expect(result.status).toBe("premise_ready");
    expect(result.premise.text).toBe(nextPremiseText);
    expect(result.premise.visualStyleText).toBe("胶片颗粒感，潮湿港口，低饱和暖金补光");
    expect(result.currentMasterPlot).toBeNull();
    expect(result.currentCharacterSheetBatch).toBeNull();
    expect(result.currentStoryboard).toBeNull();
    expect(result.currentShotScript).toBeNull();
    expect(result.currentImageBatch).toBeNull();
    expect(result.currentVideoBatch).toBeNull();
  });

  it("rejects reset requests without explicit confirmation", async () => {
    const useCase = createResetProjectPremiseUseCase({
      repository: {
        insert: vi.fn(),
        findById: vi.fn(),
        listAll: vi.fn(),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateCurrentVideoBatch: vi.fn(),
        updateStatus: vi.fn(),
        resetToPremise: vi.fn(),
      },
      premiseStorage: {
        writePremise: vi.fn(),
        readPremise: vi.fn(),
        deletePremise: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
      },
      clock: {
        now: () => "2026-03-25T01:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260325_ab12cd",
        premiseText: "Updated premise",
        visualStyleText: "Updated style",
        confirmReset: false as true,
      }),
    ).rejects.toBeInstanceOf(ProjectValidationError);
  });

  it("throws when the project does not exist", async () => {
    const useCase = createResetProjectPremiseUseCase({
      repository: {
        insert: vi.fn(),
        findById: vi.fn().mockReturnValue(null),
        listAll: vi.fn(),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateCurrentCharacterSheetBatch: vi.fn(),
        updateCurrentStoryboard: vi.fn(),
        updateCurrentShotScript: vi.fn(),
        updateCurrentImageBatch: vi.fn(),
        updateCurrentVideoBatch: vi.fn(),
        updateStatus: vi.fn(),
        resetToPremise: vi.fn(),
      },
      premiseStorage: {
        writePremise: vi.fn(),
        readPremise: vi.fn(),
        deletePremise: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
      },
      clock: {
        now: () => "2026-03-25T01:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "missing-project",
        premiseText: "Updated premise",
        visualStyleText: "Updated style",
        confirmReset: true,
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});
