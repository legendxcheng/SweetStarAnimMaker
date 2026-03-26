import type {
  CharacterSheetPromptProvider,
  GenerateCharacterSheetPromptInput,
  GenerateCharacterSheetPromptResult,
} from "@sweet-star/core";

import { requestOpenAiCompatibleChatCompletion } from "./openai-compatible-chat";

export interface CreateGrokCharacterSheetProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "grok-4.2";

export function createGrokCharacterSheetProvider(
  options: CreateGrokCharacterSheetProviderOptions,
): CharacterSheetPromptProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;

  return {
    async generateCharacterPrompt(
      input: GenerateCharacterSheetPromptInput,
    ): Promise<GenerateCharacterSheetPromptResult> {
      const apiToken = options.apiToken?.trim();

      if (!apiToken) {
        throw new Error("VECTORENGINE_API_TOKEN is required for character sheet prompt generation");
      }

      const rawText = await requestOpenAiCompatibleChatCompletion({
        baseUrl,
        apiToken,
        model,
        timeoutMs: options.timeoutMs,
        providerLabel: "Grok character sheet",
        systemText:
          "You generate concise visual appearance prompts for character turnaround sheets.",
        promptText: buildPromptText(input),
      });

      return {
        promptText: rawText,
        rawResponse: rawText,
        provider: "grok",
        model,
      };
    },
  };
}

function buildPromptText(input: GenerateCharacterSheetPromptInput) {
  return [
    `Project: ${input.projectId}`,
    `Character: ${input.characterName}`,
    `Master Plot: ${input.masterPlot.logline}`,
    "",
    "Prompt:",
    input.promptText,
  ].join("\n");
}
