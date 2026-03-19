import { describe, expect, it, vi } from "vitest";

import {
  createSaveHumanStoryboardVersionUseCase,
} from "../src/index";

describe("save current master plot use case", () => {
  it("throws when there is no current master plot to overwrite", async () => {
    const useCase = createSaveHumanStoryboardVersionUseCase({
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
      clock: {
        now: () => "2026-03-18T12:30:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260318_ab12cd",
        title: "The Last Sky Choir",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
      }),
    ).rejects.toThrow("Current master plot not found");
  });

  it("overwrites the current master plot and keeps the project in review", async () => {
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
    const masterPlotStorage = {
      initializePromptTemplate: vi.fn(),
      readPromptTemplate: vi.fn(),
      writePromptSnapshot: vi.fn(),
      writeRawResponse: vi.fn(),
      readCurrentMasterPlot: vi.fn().mockResolvedValue({
        id: "mp_current",
        title: null,
        logline: "Old logline",
        synopsis: "Old synopsis",
        mainCharacters: ["Rin"],
        coreConflict: "Old conflict",
        emotionalArc: "Old arc",
        endingBeat: "Old ending",
        targetDurationSec: null,
        sourceTaskId: "task_20260318_ab12cd",
        updatedAt: "2026-03-18T12:00:00.000Z",
        approvedAt: null,
      }),
      writeCurrentMasterPlot: vi.fn(),
    };
    const useCase = createSaveHumanStoryboardVersionUseCase({
      projectRepository,
      masterPlotStorage,
      clock: {
        now: () => "2026-03-18T12:30:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
      title: "The Last Sky Choir",
      logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
      synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
      mainCharacters: ["Rin", "Ivo"],
      coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
      emotionalArc: "She moves from bitterness to sacrificial hope.",
      endingBeat: "Rin turns the comet's music into a rising tide of light.",
      targetDurationSec: 480,
    });

    expect(masterPlotStorage.writeCurrentMasterPlot).toHaveBeenCalledWith({
      storageDir: "projects/proj_20260318_ab12cd-my-story",
      masterPlot: expect.objectContaining({
        id: "mp_current",
        title: "The Last Sky Choir",
      }),
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      status: "master_plot_in_review",
      updatedAt: "2026-03-18T12:30:00.000Z",
    });
    expect(result.id).toBe("mp_current");
  });
});
