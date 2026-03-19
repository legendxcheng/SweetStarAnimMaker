import type { GenerateStoryboardInput, GenerateStoryboardResult, LlmStoryboardProvider } from "@sweet-star/core";

const provider = "gemini";
const model = "gemini-3.1-pro-preview";

export function createSmokeStoryboardProvider(): LlmStoryboardProvider {
  return {
    async generateStoryboard(
      input: GenerateStoryboardInput,
    ): Promise<GenerateStoryboardResult> {
      if (input.reviewContext) {
        return {
          rawResponse: {
            mode: "regenerate",
            rejectedVersionId: input.reviewContext.rejectedVersionId,
            reason: input.reviewContext.reason,
          },
          provider,
          model,
          storyboard: {
            summary: "Regenerated storyboard summary",
            scenes: [
              {
                id: "scene_1",
                sceneIndex: 1,
                description: "A returns with a clearer emotional beat.",
                camera: "medium shot",
                characters: ["A"],
                prompt: "medium shot, character A returning with stronger emotion",
              },
              {
                id: "scene_2",
                sceneIndex: 2,
                description: "The rival notices the shift and reacts.",
                camera: "over-the-shoulder",
                characters: ["A", "Rival"],
                prompt: "over-the-shoulder shot, rival reacting to character A",
              },
            ],
          },
        };
      }

      return {
        rawResponse: {
          mode: "initial",
          projectId: input.projectId,
        },
        provider,
        model,
        storyboard: {
          summary: "Initial storyboard summary",
          scenes: [
            {
              id: "scene_1",
              sceneIndex: 1,
              description: "A enters the rehearsal room and scans the stage.",
              camera: "wide shot",
              characters: ["A"],
              prompt: "wide shot of character A entering a rehearsal room",
            },
            {
              id: "scene_2",
              sceneIndex: 2,
              description: "A steps into the spotlight and steadies their breath.",
              camera: "close-up",
              characters: ["A"],
              prompt: "close-up of character A standing in a spotlight",
            },
          ],
        },
      };
    },
  };
}
