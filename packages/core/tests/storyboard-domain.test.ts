import { describe, expect, it } from "vitest";

import {
  currentStoryboardJsonRelPath,
  currentStoryboardMarkdownRelPath,
  toCurrentStoryboardSummary,
} from "../src/domain/storyboard";

describe("storyboard domain", () => {
  it("builds current storyboard artifact paths", () => {
    expect(currentStoryboardJsonRelPath).toBe("storyboard/current.json");
    expect(currentStoryboardMarkdownRelPath).toBe("storyboard/current.md");
  });

  it("summarizes a storyboard document using scenes and segments", () => {
    const summary = toCurrentStoryboardSummary({
      id: "storyboard_20260321_ab12cd",
      title: "The Last Sky Choir",
      episodeTitle: "Episode 1",
      sourceMasterPlotId: "master_plot_20260321_ab12cd",
      sourceTaskId: "task_20260321_cd34ef",
      updatedAt: "2026-03-21T12:30:00.000Z",
      approvedAt: null,
      scenes: [
        {
          id: "scene_1",
          order: 1,
          name: "Rin Hears The Sky",
          dramaticPurpose: "Introduce the emotional wound and the first impossible signal.",
          segments: [
            {
              id: "segment_1",
              order: 1,
              durationSec: 6,
              visual:
                "Rain trembles across the cockpit glass while a blue comet hums above the drowned skyline.",
              characterAction: "Rin freezes with one hand on the cracked controls.",
              dialogue: "",
              voiceOver: "That sound again.",
              audio: "",
              purpose: "Trigger the inciting beat.",
            },
          ],
        },
      ],
    });

    expect(summary.sceneCount).toBe(1);
    expect(summary.segmentCount).toBe(1);
    expect(summary.totalDurationSec).toBe(6);
  });
});
