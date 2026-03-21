import type {
  GenerateStoryboardInput,
  GenerateStoryboardResult,
  StoryboardProvider,
} from "@sweet-star/core";

const provider = "gemini";
const model = "gemini-3.1-pro-preview";

export function createSmokeStoryboardProvider(): StoryboardProvider {
  return {
    async generateStoryboard(
      input: GenerateStoryboardInput,
    ): Promise<GenerateStoryboardResult> {
      const title = input.promptText.includes("second pass")
        ? "Refined Sky Choir"
        : "Initial Sky Choir";

      return {
        rawResponse: JSON.stringify({ title }),
        provider,
        model,
        storyboard: {
          id: "storyboard_generated",
          title,
          episodeTitle: "Episode 1",
          sourceMasterPlotId: "pending_source_master_plot_id",
          sourceTaskId: null,
          updatedAt: "pending_updated_at",
          approvedAt: null,
          scenes: [
            {
              id: "scene_1",
              order: 1,
              name: "Rin Hears The Sky",
              dramaticPurpose: "Trigger the inciting beat.",
              segments: [
                {
                  id: "segment_1",
                  order: 1,
                  durationSec: 6,
                  visual: "Rain shakes across the cockpit glass.",
                  characterAction: "Rin looks up.",
                  dialogue: "",
                  voiceOver: "That sound again.",
                  audio: "",
                  purpose: "Start the mystery.",
                },
              ],
            },
          ],
        },
      };
    },
  };
}
