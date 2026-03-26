import type {
  CharacterSheetPromptProvider,
  GenerateCharacterSheetPromptInput,
  GenerateCharacterSheetPromptResult,
} from "@sweet-star/core";

import { buildProviderRequestError } from "./provider-request-error";

export interface CreateGeminiCharacterSheetProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";

export function createGeminiCharacterSheetProvider(
  options: CreateGeminiCharacterSheetProviderOptions,
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

      const controller = options.timeoutMs ? new AbortController() : null;
      const timeout =
        options.timeoutMs && controller
          ? setTimeout(() => controller.abort(), options.timeoutMs)
          : null;

      try {
        const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "You generate concise visual appearance prompts for character turnaround sheets.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: buildPromptText(input),
                  },
                ],
              },
            ],
          }),
          signal: controller?.signal,
        });

        if (!response.ok) {
          const bodyText = typeof response.text === "function" ? await response.text() : null;
          throw buildProviderRequestError("Gemini character sheet", response.status, bodyText);
        }

        const rawResponse = await response.json();
        const rawText = extractCandidateText(rawResponse);

        return {
          promptText: rawText,
          rawResponse: rawText,
          provider: "gemini",
          model,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Gemini character sheet provider request timed out");
        }

        throw error;
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
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

function extractCandidateText(rawResponse: unknown) {
  const text = (rawResponse as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  })?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || !text.trim()) {
    throw new Error("Gemini character sheet provider returned no usable content");
  }

  return text.trim();
}
