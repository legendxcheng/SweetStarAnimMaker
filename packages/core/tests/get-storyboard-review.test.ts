import { describe, expect, it, vi } from "vitest";

import { createGetStoryboardReviewUseCase } from "../src/index";

describe("get master plot review use case", () => {
  it("returns the review workspace for the current master plot", async () => {
    const useCase = createGetStoryboardReviewUseCase({
      projectRepository: {
        insert: vi.fn(),
        findById: vi.fn().mockResolvedValue({
          id: "proj_20260318_ab12cd",
          name: "My Story",
          slug: "my-story",
          storageDir: "projects/proj_20260318_ab12cd-my-story",
          premiseRelPath: "premise/v1.md",
          premiseBytes: 120,
          currentMasterPlotId: "mp_20260318_ab12cd",
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
        writeCurrentMasterPlot: vi.fn(),
        readCurrentMasterPlot: vi.fn().mockResolvedValue({
          id: "mp_20260318_ab12cd",
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
      },
      storyboardReviewRepository: {
        insert: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "mpr_20260318_ab12cd",
          projectId: "proj_20260318_ab12cd",
          masterPlotId: "mp_20260318_ab12cd",
          action: "reject",
          reason: "Need better pacing.",
          triggeredTaskId: null,
          createdAt: "2026-03-18T12:10:00.000Z",
        }),
      },
      taskRepository: {
        insert: vi.fn(),
        findById: vi.fn(),
        findLatestByProjectId: vi.fn().mockResolvedValue({
          id: "task_20260318_ab12cd",
          projectId: "proj_20260318_ab12cd",
          type: "master_plot_generate",
          status: "succeeded",
          queueName: "master-plot-generate",
          storageDir: "projects/proj_20260318_ab12cd-my-story/tasks/task_20260318_ab12cd",
          inputRelPath: "tasks/task_20260318_ab12cd/input.json",
          outputRelPath: "tasks/task_20260318_ab12cd/output.json",
          logRelPath: "tasks/task_20260318_ab12cd/log.txt",
          errorMessage: null,
          createdAt: "2026-03-18T11:50:00.000Z",
          updatedAt: "2026-03-18T12:00:00.000Z",
          startedAt: "2026-03-18T11:52:00.000Z",
          finishedAt: "2026-03-18T12:00:00.000Z",
        }),
        delete: vi.fn(),
        markRunning: vi.fn(),
        markSucceeded: vi.fn(),
        markFailed: vi.fn(),
      },
    });

    const result = await useCase.execute({
      projectId: "proj_20260318_ab12cd",
    });

    expect(result.projectStatus).toBe("master_plot_in_review");
    expect(result.currentMasterPlot.id).toBe("mp_20260318_ab12cd");
    expect(result.latestReview?.action).toBe("reject");
    expect(result.latestTask?.id).toBe("task_20260318_ab12cd");
    expect(result.availableActions).toEqual({
      save: true,
      approve: true,
      reject: true,
    });
  });
});
