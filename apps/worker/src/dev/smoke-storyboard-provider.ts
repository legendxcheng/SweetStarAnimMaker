import type {
  GenerateMasterPlotInput,
  GenerateMasterPlotResult,
  MasterPlotProvider,
} from "@sweet-star/core";

const provider = "gemini";
const model = "gemini-3.1-pro-preview";

export function createSmokeStoryboardProvider(): MasterPlotProvider {
  return {
    async generateMasterPlot(
      input: GenerateMasterPlotInput,
    ): Promise<GenerateMasterPlotResult> {
      const title = input.promptText.includes("second pass")
        ? "Refined Sky Choir"
        : "Initial Sky Choir";

      return {
        rawResponse: JSON.stringify({ title }),
        provider,
        model,
        masterPlot: {
          title,
          logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
          synopsis:
            "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
          mainCharacters: ["Rin", "Ivo"],
          coreConflict:
            "Rin must choose between private escape and saving the city that exiled her.",
          emotionalArc: "She moves from bitterness to sacrificial hope.",
          endingBeat: "Rin turns the comet's music into a rising tide of light.",
          targetDurationSec: 480,
        },
      };
    },
  };
}
