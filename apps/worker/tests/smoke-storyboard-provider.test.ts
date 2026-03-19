import { describe, expect, it } from "vitest";

import { createSmokeStoryboardProvider } from "../src/dev/smoke-storyboard-provider";

describe("smoke storyboard provider", () => {
  it("returns an initial master plot for first-pass generation", async () => {
    const provider = createSmokeStoryboardProvider();

    const result = await provider.generateMasterPlot({
      projectId: "proj_20260318_demo",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptText: "Turn this premise into a master plot:\n{{premiseText}}",
    });

    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-3.1-pro-preview");
    expect(result.masterPlot.title).toBe("Initial Sky Choir");
    expect(result.masterPlot.mainCharacters).toEqual(["Rin", "Ivo"]);
  });

  it("returns a refined master plot when the prompt indicates a later pass", async () => {
    const provider = createSmokeStoryboardProvider();

    const result = await provider.generateMasterPlot({
      projectId: "proj_20260318_demo",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptText: "Turn this premise into a second pass master plot:\n{{premiseText}}",
    });

    expect(result.masterPlot.title).toBe("Refined Sky Choir");
    expect(result.rawResponse).toContain("Refined Sky Choir");
  });
});
