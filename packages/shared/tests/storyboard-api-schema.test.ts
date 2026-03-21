import { describe, expect, it } from "vitest";

import * as shared from "../src/index";

describe("master plot api schema", () => {
  it("exports a current master-plot schema", () => {
    const schema = shared.currentMasterPlotResponseSchema;

    expect(schema).toBeDefined();
  });

  it("accepts a current master plot response", () => {
    const parsed = shared.currentMasterPlotResponseSchema.parse({
      id: "mp_20260317_ab12cd",
      title: "The Last Sky Choir",
      logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
      synopsis: "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
      mainCharacters: ["Rin", "Ivo"],
      coreConflict: "Rin must choose between private escape and saving the city that exiled her.",
      emotionalArc: "She moves from bitterness to sacrificial hope.",
      endingBeat: "Rin turns the comet's music into a rising tide of light.",
      targetDurationSec: 480,
      sourceTaskId: "task_20260317_ab12cd",
      updatedAt: "2026-03-17T12:00:00.000Z",
      approvedAt: null,
    });

    expect(parsed.mainCharacters).toHaveLength(2);
  });

  it("accepts a current master plot response with a nullable title", () => {
    const parsed = shared.currentMasterPlotResponseSchema.parse({
      id: "mp_20260318_hu12cd",
      title: null,
      logline: "A lonely mechanic bargains with a star trapped in iron.",
      synopsis: "She must free the star before the empire turns it into a weapon.",
      mainCharacters: ["Mara", "The Star"],
      coreConflict: "Mercy collides with survival under occupation.",
      emotionalArc: "Mara learns that intimacy requires risk.",
      endingBeat: "She opens the foundry roof and lets dawn choose for her.",
      targetDurationSec: null,
      sourceTaskId: null,
      updatedAt: "2026-03-18T12:30:00.000Z",
      approvedAt: "2026-03-18T12:45:00.000Z",
    });

    expect(parsed.approvedAt).toBe("2026-03-18T12:45:00.000Z");
  });
});
