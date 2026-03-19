import { describe, expect, it } from "vitest";

import {
  RejectStoryboardReasonRequiredError,
  createStoryboardReviewRecord,
} from "../src/index";

describe("storyboard review domain", () => {
  it("creates an approve review record", () => {
    const review = createStoryboardReviewRecord({
      id: "sbr_20260318_ab12cd",
      projectId: "proj_20260318_ab12cd",
      masterPlotId: "mp_20260318_ab12cd",
      action: "approve",
      note: "Approved for production.",
      createdAt: "2026-03-18T12:00:00.000Z",
    });

    expect(review).toEqual({
      id: "sbr_20260318_ab12cd",
      projectId: "proj_20260318_ab12cd",
      masterPlotId: "mp_20260318_ab12cd",
      action: "approve",
      reason: "Approved for production.",
      triggeredTaskId: null,
      createdAt: "2026-03-18T12:00:00.000Z",
    });
  });

  it("requires a reason when creating a reject review record", () => {
    expect(() =>
      createStoryboardReviewRecord({
        id: "sbr_20260318_ab12cd",
        projectId: "proj_20260318_ab12cd",
        masterPlotId: "mp_20260318_ab12cd",
        action: "reject",
        reason: "   ",
        createdAt: "2026-03-18T12:00:00.000Z",
      }),
    ).toThrow(RejectStoryboardReasonRequiredError);
  });
});
