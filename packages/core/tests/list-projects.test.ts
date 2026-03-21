import { describe, expect, it, vi } from "vitest";

import { createListProjectsUseCase } from "../src/index";

describe("list projects use case", () => {
  it("loads current master plots for projects that have one", async () => {
    const repository = {
      insert: vi.fn(),
      findById: vi.fn(),
      listAll: vi.fn().mockResolvedValue([
        {
          id: "proj_20260320_ab12cd",
          name: "Sky Choir",
          slug: "sky-choir",
          storageDir: "projects/proj_20260320_ab12cd-sky-choir",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 100,
          currentMasterPlotId: "mp_20260320_ab12cd",
          currentStoryboardId: null,
          status: "master_plot_in_review",
          createdAt: "2026-03-20T10:00:00.000Z",
          updatedAt: "2026-03-20T10:30:00.000Z",
          premiseUpdatedAt: "2026-03-20T10:00:00.000Z",
        },
        {
          id: "proj_20260320_ef34gh",
          name: "Iron Star",
          slug: "iron-star",
          storageDir: "projects/proj_20260320_ef34gh-iron-star",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: null,
          currentStoryboardId: null,
          status: "premise_ready",
          createdAt: "2026-03-20T11:00:00.000Z",
          updatedAt: "2026-03-20T11:05:00.000Z",
          premiseUpdatedAt: "2026-03-20T11:00:00.000Z",
        },
      ]),
      updatePremiseMetadata: vi.fn(),
      updateCurrentMasterPlot: vi.fn(),
      updateCurrentStoryboard: vi.fn(),
      updateStatus: vi.fn(),
    };
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writeCurrentMasterPlot: vi.fn(),
      readCurrentMasterPlot: vi.fn().mockResolvedValue({
        id: "mp_20260320_ab12cd",
        title: "The Last Sky Choir",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
        sourceTaskId: "task_20260320_ab12cd",
        updatedAt: "2026-03-20T10:30:00.000Z",
        approvedAt: null,
      }),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
    };
    const storyboardStorage = {
      writeRawResponse: vi.fn(),
      writeStoryboardVersion: vi.fn(),
      readStoryboardVersion: vi.fn(),
      writeCurrentStoryboard: vi.fn(),
      readCurrentStoryboard: vi.fn(),
    };
    const useCase = createListProjectsUseCase({
      repository,
      masterPlotStorage,
      storyboardStorage,
    });

    const result = await useCase.execute();

    expect(masterPlotStorage.readCurrentMasterPlot).toHaveBeenCalledTimes(1);
    expect(masterPlotStorage.readCurrentMasterPlot).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260320_ab12cd-sky-choir",
    });
    expect(result[0].currentMasterPlot?.title).toBe("The Last Sky Choir");
    expect(result[1].currentMasterPlot).toBeNull();
  });
});
