import type {
  GenerateVideoPromptInput,
  GenerateVideoPromptResult,
  VideoPromptProvider,
} from "@sweet-star/core";

import { buildProviderRequestError } from "./provider-request-error";
import {
  buildVideoPromptText,
  normalizeVideoPromptPayload,
  videoPromptPlanResponseJsonSchema,
} from "./video-prompt-plan";

export interface CreateGeminiVideoPromptProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";
const DEFAULT_TIMEOUT_MS = 300_000;

export function createGeminiVideoPromptProvider(
  options: CreateGeminiVideoPromptProviderOptions,
): VideoPromptProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async generateVideoPrompt(input: GenerateVideoPromptInput): Promise<GenerateVideoPromptResult> {
      const apiToken = options.apiToken?.trim();

      if (!apiToken) {
        throw new Error("VECTORENGINE_API_TOKEN is required for video prompt generation");
      }

      const rawText = await requestGeminiJson({
        baseUrl,
        apiToken,
        model,
        timeoutMs,
        promptText: buildVideoPromptText(input),
      });
      const payload = normalizeVideoPromptPayload(rawText, input, "Gemini video prompt");

      return {
        ...payload,
        rawResponse: rawText,
        provider: "gemini",
        model,
      };
    },
  };
}

async function requestGeminiJson(input: {
  baseUrl: string;
  apiToken: string;
  model: string;
  timeoutMs?: number;
  promptText: string;
}) {
  const controller = input.timeoutMs ? new AbortController() : null;
  const timeout =
    input.timeoutMs && controller ? setTimeout(() => controller.abort(), input.timeoutMs) : null;

  try {
    const response = await fetch(`${input.baseUrl}/v1beta/models/${input.model}:generateContent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You generate structured JSON video prompt plans for Seedance 2.0 short-drama segment generation. Output must be valid JSON. finalPrompt must be Simplified Chinese natural-language prompt text for Seedance 2.0 multimodal reference video generation. Treat each segment as one continuous clip with internal sub-shots, continuity-first time-axis structure, preserved dialogue, preserved audio constraints, and explicit ending handoff state. Do not output markdown.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.promptText }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: videoPromptPlanResponseJsonSchema,
        },
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      const bodyText = typeof response.text === "function" ? await response.text() : null;
      throw buildProviderRequestError("Gemini video prompt", response.status, bodyText);
    }

    const rawResponse = await response.json();
    return extractCandidateText(rawResponse);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini video prompt provider request timed out");
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
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
    throw new Error("Gemini video prompt provider returned no usable content");
  }

  return text.trim();
}
