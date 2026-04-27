import type { VideoPromptProvider } from "@sweet-star/core";

export function createVideoPromptProviderWithGrokFallback(
  primary: VideoPromptProvider,
  fallback: VideoPromptProvider,
): VideoPromptProvider {
  return {
    async generateVideoPrompt(input) {
      try {
        return await primary.generateVideoPrompt(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateVideoPrompt(input);
      }
    },
  };
}

function shouldRetryWithGrok(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("PROHIBITED_CONTENT") ||
    /content is prohibited/i.test(error.message) ||
    /returned invalid prompt plan JSON/i.test(error.message) ||
    /returned invalid finalPrompt/i.test(error.message) ||
    /returned invalid visualGuardrails/i.test(error.message) ||
    /returned invalid rationale/i.test(error.message)
  );
}
