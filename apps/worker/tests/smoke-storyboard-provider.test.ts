import { describe, expect, it } from "vitest";

import { createSmokeStoryboardProvider } from "../src/dev/smoke-storyboard-provider";

describe("smoke storyboard provider", () => {
  it("returns an initial storyboard for first-pass generation", async () => {
    const provider = createSmokeStoryboardProvider();

    const result = await provider.generateStoryboard({
      projectId: "proj_20260318_demo",
      masterPlot: {
        title: "The Last Sky Choir",
        logline: "A washed-up pilot discovers a singing comet above a drowned city.",
        synopsis:
          "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict:
          "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
      },
      promptText: "Turn this master plot into storyboard scenes.",
    });

    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-3.1-pro-preview");
    expect(result.storyboard.title).toBe("Initial Sky Choir");
    expect(result.storyboard.scenes[0]?.segments[0]?.voiceOver).toBe("That sound again.");
  });

  it("returns a refined storyboard when the prompt indicates a later pass", async () => {
    const provider = createSmokeStoryboardProvider();

    const result = await provider.generateStoryboard({
      projectId: "proj_20260318_demo",
      masterPlot: {
        title: "The Last Sky Choir",
        logline: "A washed-up pilot discovers a singing comet above a drowned city.",
        synopsis:
          "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
        mainCharacters: ["Rin", "Ivo"],
        coreConflict:
          "Rin must choose between private escape and saving the city that exiled her.",
        emotionalArc: "She moves from bitterness to sacrificial hope.",
        endingBeat: "Rin turns the comet's music into a rising tide of light.",
        targetDurationSec: 480,
      },
      promptText: "Turn this master plot into a second pass storyboard.",
    });

    expect(result.storyboard.title).toBe("Refined Sky Choir");
    expect(result.rawResponse).toContain("Refined Sky Choir");
  });
});
