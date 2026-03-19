import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("project api schema", () => {
  it("accepts a valid create-project payload", () => {
    const parsed = shared.createProjectRequestSchema.parse({
      name: "My Story",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
    });

    expect(parsed.name).toBe("My Story");
    expect(parsed.premiseText).toContain("singing comet");
  });

  it("accepts project detail without a current master plot", () => {
    const parsed = shared.projectDetailResponseSchema.parse({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "premise_ready",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      premise: {
        path: "premise/v1.md",
        bytes: 123,
        updatedAt: "2026-03-17T12:00:00.000Z",
      },
      currentMasterPlot: null,
    });

    expect(parsed.currentMasterPlot).toBeNull();
  });

  it("exposes the expanded master-plot workflow statuses", () => {
    expect(shared.projectStatuses).toEqual([
      "premise_ready",
      "master_plot_generating",
      "master_plot_in_review",
      "master_plot_approved",
    ]);
  });

  it("accepts project summary without a current master plot", () => {
    const parsed = shared.projectSummaryResponseSchema.parse({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "premise_ready",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      currentMasterPlot: null,
    });

    expect(parsed.id).toBe("proj_20260317_ab12cd");
    expect(parsed.currentMasterPlot).toBeNull();
  });

  it("accepts project summary with a current master plot", () => {
    const parsed = shared.projectSummaryResponseSchema.parse({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      status: "master_plot_in_review",
      storageDir: "projects/proj_20260317_ab12cd-my-story",
      createdAt: "2026-03-17T12:00:00.000Z",
      updatedAt: "2026-03-17T12:00:00.000Z",
      currentMasterPlot: {
        id: "master_plot_v1",
        title: "The Last Sky Choir",
        logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
        synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
        sourceTaskId: "task_123",
        updatedAt: "2026-03-17T12:05:00.000Z",
        approvedAt: null,
      },
    });

    expect(parsed.currentMasterPlot).not.toBeNull();
    expect(parsed.currentMasterPlot?.title).toBe("The Last Sky Choir");
  });

  it("accepts a project list response", () => {
    const parsed = shared.projectListResponseSchema.parse([
      {
        id: "proj_1",
        name: "Project One",
        slug: "project-one",
        status: "premise_ready",
        storageDir: "projects/proj_1-project-one",
        createdAt: "2026-03-17T12:00:00.000Z",
        updatedAt: "2026-03-17T12:00:00.000Z",
        currentMasterPlot: null,
      },
      {
        id: "proj_2",
        name: "Project Two",
        slug: "project-two",
        status: "master_plot_approved",
        storageDir: "projects/proj_2-project-two",
        createdAt: "2026-03-17T13:00:00.000Z",
        updatedAt: "2026-03-17T13:00:00.000Z",
        currentMasterPlot: {
          id: "master_plot_v2",
          title: null,
          logline: "A lonely mechanic bargains with a star trapped in iron.",
          synopsis: "She must free the star before the empire turns it into a weapon.",
          mainCharacters: ["Mara", "The Star"],
          coreConflict: "Mercy collides with survival under occupation.",
          emotionalArc: "Mara learns that intimacy requires risk.",
          endingBeat: "She opens the foundry roof and lets dawn choose for her.",
          targetDurationSec: null,
          sourceTaskId: "task_456",
          updatedAt: "2026-03-17T13:05:00.000Z",
          approvedAt: "2026-03-17T13:15:00.000Z",
        },
      },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("Project One");
    expect(parsed[1].currentMasterPlot?.approvedAt).toBe("2026-03-17T13:15:00.000Z");
  });
});
