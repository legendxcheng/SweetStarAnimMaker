import { describe, expect, it } from "vitest";

import * as shared from "../src/index";

describe("master plot review api schema", () => {
  it("accepts an approve request payload", () => {
    const schema = (shared as Record<string, { parse: (value: unknown) => unknown }>).approveMasterPlotRequestSchema;
    const parsed = schema.parse({});

    expect(parsed).toEqual({});
  });

  it("accepts a reject request payload", () => {
    const schema = (shared as Record<string, { parse: (value: unknown) => unknown }>).rejectMasterPlotRequestSchema;
    const parsed = schema.parse({
      reason: "Need a sharper emotional payoff.",
    });

    expect(parsed.reason).toBe("Need a sharper emotional payoff.");
  });

  it("accepts a save-current-master-plot request payload", () => {
    const schema = (shared as Record<string, { parse: (value: unknown) => unknown }>).saveMasterPlotRequestSchema;
    const parsed = schema.parse({
      title: "The Last Sky Choir",
      logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
      synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
      mainCharacters: ["Rin", "Ivo"],
      coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
      emotionalArc: "She moves from bitterness to sacrificial hope.",
      endingBeat: "Rin turns the comet's music into a rising tide of light.",
      targetDurationSec: 480,
    });

    expect(parsed.mainCharacters).toHaveLength(2);
  });

  it("accepts a latest review summary", () => {
    const schema = (shared as Record<string, { parse: (value: unknown) => unknown }>).masterPlotReviewSummarySchema;
    const parsed = schema.parse({
      id: "mpr_20260318_ab12cd",
      projectId: "proj_20260318_ab12cd",
      masterPlotId: "mp_20260318_ab12cd",
      action: "reject",
      reason: "Need a stronger ending beat.",
      triggeredTaskId: "task_20260318_ab12cd",
      createdAt: "2026-03-18T12:00:00.000Z",
    });

    expect(parsed.action).toBe("reject");
    expect(parsed.triggeredTaskId).toBe("task_20260318_ab12cd");
  });

  it("accepts a master-plot review workspace response", () => {
    const schema = (shared as Record<string, { parse: (value: unknown) => unknown }>).masterPlotReviewWorkspaceResponseSchema;
    const parsed = schema.parse({
      projectId: "proj_20260318_ab12cd",
      projectStatus: "master_plot_in_review",
      currentMasterPlot: {
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
      },
      latestReview: {
        id: "mpr_20260318_ab12cd",
        projectId: "proj_20260318_ab12cd",
        masterPlotId: "mp_20260318_ab12cd",
        action: "approve",
        reason: "Final approved version.",
        triggeredTaskId: null,
        createdAt: "2026-03-18T13:00:00.000Z",
      },
      availableActions: {
        save: true,
        approve: true,
        reject: true,
      },
      latestTask: {
        id: "task_20260318_ab12cd",
        projectId: "proj_20260318_ab12cd",
        type: "master_plot_generate",
        status: "succeeded",
        createdAt: "2026-03-18T11:55:00.000Z",
        updatedAt: "2026-03-18T12:00:00.000Z",
        startedAt: "2026-03-18T11:56:00.000Z",
        finishedAt: "2026-03-18T12:00:00.000Z",
        errorMessage: null,
        files: {
          inputPath: "tasks/task_20260318_ab12cd/input.json",
          outputPath: "tasks/task_20260318_ab12cd/output.json",
          logPath: "tasks/task_20260318_ab12cd/log.txt",
        },
      },
    });

    expect(parsed.projectStatus).toBe("master_plot_in_review");
    expect(parsed.currentMasterPlot.title).toBe("The Last Sky Choir");
    expect(parsed.availableActions.save).toBe(true);
  });
});
