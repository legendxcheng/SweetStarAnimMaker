import type {
  CharacterSheetPromptProvider,
  FramePromptProvider,
  MasterPlotProvider,
  ShotScriptProvider,
  StoryboardProvider,
} from "@sweet-star/core";

export function createStoryboardProviderWithGrokFallback(
  primary: MasterPlotProvider & StoryboardProvider,
  fallback: MasterPlotProvider & StoryboardProvider,
): MasterPlotProvider & StoryboardProvider {
  return {
    async generateMasterPlot(input) {
      try {
        return await primary.generateMasterPlot(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateMasterPlot(input);
      }
    },
    async generateStoryboard(input) {
      try {
        return await primary.generateStoryboard(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateStoryboard(input);
      }
    },
  };
}

export function createShotScriptProviderWithGrokFallback(
  primary: ShotScriptProvider,
  fallback: ShotScriptProvider,
): ShotScriptProvider {
  return {
    generateShotScript: primary.generateShotScript
      ? async (input) => {
          try {
            return await primary.generateShotScript!(input);
          } catch (error) {
            if (!shouldRetryWithGrok(error) || !fallback.generateShotScript) {
              throw error;
            }

            return fallback.generateShotScript(input);
          }
        }
      : undefined,
    async generateShotScriptSegment(input) {
      try {
        return await primary.generateShotScriptSegment(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateShotScriptSegment(input);
      }
    },
  };
}

export function createCharacterSheetPromptProviderWithGrokFallback(
  primary: CharacterSheetPromptProvider,
  fallback: CharacterSheetPromptProvider,
): CharacterSheetPromptProvider {
  return {
    async generateCharacterPrompt(input) {
      try {
        return await primary.generateCharacterPrompt(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateCharacterPrompt(input);
      }
    },
  };
}

export function createFramePromptProviderWithGrokFallback(
  primary: FramePromptProvider,
  fallback: FramePromptProvider,
): FramePromptProvider {
  return {
    async generateFramePrompt(input) {
      try {
        return await primary.generateFramePrompt(input);
      } catch (error) {
        if (!shouldRetryWithGrok(error)) {
          throw error;
        }

        return fallback.generateFramePrompt(input);
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
    /content is prohibited/i.test(error.message)
  );
}
