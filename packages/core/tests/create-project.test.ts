import { describe, expect, it, vi } from "vitest";

import { createCreateProjectUseCase } from "../src/index";

describe("create project use case", () => {
  it("creates a premise-first project and initializes prompt assets", async () => {
    const repository = {
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
    };
    const premiseStorage = {
      writePremise: vi.fn().mockReturnValue({
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
      }),
      readPremise: vi.fn(),
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
    const useCase = createCreateProjectUseCase({
      repository,
      premiseStorage,
      masterPlotStorage,
      idGenerator: {
        generateProjectId: () => "proj_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T00:00:00.000Z",
      },
    });

    const result = await useCase.execute({
      name: "My Story",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
    });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "proj_20260317_ab12cd",
        slug: "my-story",
        storageDir: "projects/proj_20260317_ab12cd-my-story",
        premiseBytes: 88,
        visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
        videoReferenceStrategy: "auto",
      }),
    );
    expect(masterPlotStorage.initializePromptTemplate).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      promptTemplateKey: "master_plot.generate",
    });
    expect(result).toEqual({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "premise_ready",
      videoReferenceStrategy: "auto",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      premise: {
        path: "premise/v1.md",
        bytes: 88,
        updatedAt: "2026-03-17T00:00:00.000Z",
        text: "A washed-up pilot discovers a singing comet above a drowned city.",
        visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
      },
      currentMasterPlot: null,
      currentCharacterSheetBatch: null,
      currentSceneSheetBatch: null,
      currentStoryboard: null,
      currentShotScript: null,
      currentImageBatch: null,
      currentVideoBatch: null,
    });
  });

  it("removes premise files when repository insert fails", async () => {
    const repository = {
      insert: vi.fn(() => {
        throw new Error("insert failed");
      }),
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
    };
    const premiseStorage = {
      writePremise: vi.fn().mockReturnValue({
        premiseRelPath: "premise/v1.md",
        premiseBytes: 88,
      }),
      readPremise: vi.fn(),
      deletePremise: vi.fn(),
    };
    const useCase = createCreateProjectUseCase({
      repository,
      premiseStorage,
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
      },
      idGenerator: {
        generateProjectId: () => "proj_20260317_ab12cd",
      },
      clock: {
        now: () => "2026-03-17T00:00:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        name: "My Story",
        premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
        visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
      }),
    ).rejects.toThrow("insert failed");

    expect(premiseStorage.deletePremise).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260317_ab12cd-my-story",
    });
  });
});
