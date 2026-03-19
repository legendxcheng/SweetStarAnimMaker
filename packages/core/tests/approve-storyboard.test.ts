import { describe, expect, it, vi } from "vitest";

import {
  createApproveStoryboardUseCase,
} from "../src/index";

describe("approve master plot use case", () => {
  it("throws when there is no current master plot", async () => {
    const useCase = createApproveStoryboardUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260318_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260318_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: null,
          status: "master_plot_in_review",
          createdAt: "2026-03-18T10:00:00.000Z",
          updatedAt: "2026-03-18T12:00:00.000Z",
          premiseUpdatedAt: "2026-03-18T10:00:00.000Z",
        }),
        updatePremiseMetadata: vi.fn(),
        updateCurrentMasterPlot: vi.fn(),
        updateStatus: vi.fn(),
        listAll: vi.fn(),
      },
      masterPlotStorage: {
        initializePromptTemplate: vi.fn(),
        readPromptTemplate: vi.fn(),
        writePromptSnapshot: vi.fn(),
        writeRawResponse: vi.fn(),
        readCurrentMasterPlot: vi.fn().mockResolvedValue(null),
        writeCurrentMasterPlot: vi.fn(),
      },
      storyboardReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn(),
      },
      clock: {
        now: () => "2026-03-18T12:40:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260318_ab12cd",
      }),
    ).rejects.toThrow("Current master plot not found");
  });

  it("writes an approve review record, stamps approvedAt, and updates the project status", async () => {
    const projectRepository = {
      insert: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: "proj_20260318_ab12cd",
        name: "My Story",
        slug: "my-story",
        storageDir: "projects/proj_20260318_ab12cd-my-story",
        premiseRelPath: "premise/v1.md",
        premiseBytes: 120,
        currentMasterPlotId: "mp_current",
        status: "master_plot_in_review",
        createdAt: "2026-03-18T10:00:00.000Z",
        updatedAt: "2026-03-18T12:00:00.000Z",
        premiseUpdatedAt: "2026-03-18T10:00:00.000Z",
      }),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateStatus: vi.fn(),
      listAll: vi.fn(),
    };
    const storyboardReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      readCurrentMasterPlot: vi.fn().mockResolvedValue({
        id: "mp_current",
        title: "The Last Sky Choir",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
        sourceTaskId: "task_20260318_ab12cd",
        updatedAt: "2026-03-18T12:00:00.000Z",
        approvedAt: null,
      }),
      writeCurrentMasterPlot: vi.fn(),
    };
    const useCase = createApproveStoryboardUseCase({
      projectRepository,
      masterPlotStorage,
      storyboardReviewRepository,
      clock: {
        now: () => "2026-03-18T12:40:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
    });

    expect(masterPlotStorage.writeCurrentMasterPlot).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260318_ab12cd-my-story",
      masterPlot: expect.objectContaining({
        approvedAt: "2026-03-18T12:40:00.000Z",
      }),
    });
    expect(storyboardReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "approve",
        reason: null,
      }),
    );
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      status: "master_plot_approved",
      updatedAt: "2026-03-18T12:40:00.000Z",
    });
    expect(result.action).toBe("approve");
  });
});
