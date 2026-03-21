import { describe, expect, it } from "vitest";
import { createProjectRecord, toProjectDetailDto, toProjectSummaryDto } from "../src/index";

describe("project domain", () => {
  it("creates premise-first project storage metadata", () => {
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-17T00:00:00.000Z",
    });

    expect(project.storageDir).toBe("projects/proj_20260317_ab12cd-my-story");
    expect(project.premiseRelPath).toBe("premise/v1.md");
    expect(project.status).toBe("premise_ready");
    expect(project.currentCharacterSheetBatchId).toBeNull();
    expect(project.currentStoryboardId).toBeNull();
  });

  it("maps project dtos with premise metadata and current master plot slots", () => {
    const project = createProjectRecord({
      id: "proj_20260317_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-17T00:00:00.000Z",
    });

    const currentCharacterSheetBatch = {
      id: "char_batch_v1",
      sourceMasterPlotId: "master_plot_v1",
      characterCount: 2,
      approvedCharacterCount: 1,
      updatedAt: "2026-03-17T01:00:00.000Z",
    };

    const detail = toProjectDetailDto(project, null, currentCharacterSheetBatch, null);
    const summary = toProjectSummaryDto(project, null, currentCharacterSheetBatch, null);

    expect(detail.premise).toEqual({
      path: "premise/v1.md",
      bytes: 0,
      updatedAt: "2026-03-17T00:00:00.000Z",
    });
    expect(detail.currentMasterPlot).toBeNull();
    expect(detail.currentCharacterSheetBatch?.approvedCharacterCount).toBe(1);
    expect(detail.currentStoryboard).toBeNull();
    expect(summary.currentMasterPlot).toBeNull();
    expect(summary.currentCharacterSheetBatch?.characterCount).toBe(2);
    expect(summary.currentStoryboard).toBeNull();
  });
});
