import { describe, expect, it, vi } from "vitest";

import {
  RejectStoryboardReasonRequiredError,
  createRejectStoryboardUseCase,
} from "../src/index";

describe("reject master plot use case", () => {
  it("requires a reason", async () => {
    const useCase = createRejectStoryboardUseCase({
      projectRepository: {
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
      },
      masterPlotStorage: {
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
      },
      storyboardReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn(),
      },
      createStoryboardGenerateTask: {
        execute: vi.fn(),
      },
      clock: {
        now: () => "2026-03-18T12:45:00.000Z",
      },
    });

    await expect(
      useCase.execute({
        projectId: "proj_20260318_ab12cd",
        reason: "   ",
      }),
    ).rejects.toBeInstanceOf(RejectStoryboardReasonRequiredError);
  });

  it("creates a new master plot task and returns the project to generating", async () => {
    const storyboardReviewRepository = {
      insert: vi.fn(),
      findLatestByProjectId: vi.fn(),
    };
    const createStoryboardGenerateTask = {
      execute: vi.fn().mockResolvedValue({
        id: "task_20260318_next",
      }),
    };
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
    const useCase = createRejectStoryboardUseCase({
      projectRepository,
      masterPlotStorage: {
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
      },
      storyboardReviewRepository,
      createStoryboardGenerateTask,
      clock: {
        now: () => "2026-03-18T12:45:00.000Z",
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
      reason: "Need stronger scene transitions.",
    });

    expect(createStoryboardGenerateTask.execute).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
    });
    expect(projectRepository.updateStatus).toHaveBeenCalledWith({
      projectId: "proj_20260318_ab12cd",
      status: "master_plot_generating",
      updatedAt: "2026-03-18T12:45:00.000Z",
    });
    expect(storyboardReviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        triggeredTaskId: "task_20260318_next",
      }),
    );
    expect(result.triggeredTaskId).toBe("task_20260318_next");
  });
});
