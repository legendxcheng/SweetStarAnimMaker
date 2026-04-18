import type {
  GenerateVideoPromptInput,
  GenerateVideoPromptResult,
  VideoPromptProvider,
} from "@sweet-star/core";

import { requestOpenAiCompatibleChatCompletion } from "./openai-compatible-chat";
import { buildVideoPromptText, normalizeVideoPromptPayload } from "./video-prompt-plan";

export interface CreateGrokVideoPromptProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "grok-4.2";

export function createGrokVideoPromptProvider(
  options: CreateGrokVideoPromptProviderOptions,
): VideoPromptProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;

  return {
    async generateVideoPrompt(input: GenerateVideoPromptInput): Promise<GenerateVideoPromptResult> {
      const apiToken = options.apiToken?.trim();

      if (!apiToken) {
        throw new Error("VECTORENGINE_API_TOKEN is required for video prompt generation");
      }

      const rawText = await requestOpenAiCompatibleChatCompletion({
        baseUrl,
        apiToken,
        model,
        timeoutMs: options.timeoutMs,
        providerLabel: "Grok video prompt",
        systemText: [
          "You generate structured JSON video prompt plans for Seedance 2.0 short-drama segment generation.",
          "Output must be valid JSON.",
          "finalPrompt must be Simplified Chinese natural-language prompt text for Seedance 2.0 multimodal reference video generation.",
          "Treat each segment as one continuous clip with internal sub-shots and continuity-first time-axis structure.",
          "Preserve provided dialogue, narration, audio constraints, and ending handoff state.",
          "Do not output markdown.",
        ].join(" "),
        promptText: buildVideoPromptText(input),
        responseFormat: "json_object",
      });
      const payload = normalizeVideoPromptPayload(rawText, input, "Grok video prompt");

      return {
        ...payload,
        rawResponse: rawText,
        provider: "grok",
        model,
      };
    },
  };
}
