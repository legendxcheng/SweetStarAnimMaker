import type {
  GenerateMasterPlotInput,
  GenerateMasterPlotResult,
  MasterPlotProvider,
} from "@sweet-star/core";

export interface CreateGeminiStoryboardProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";

export function createGeminiStoryboardProvider(
  options: CreateGeminiStoryboardProviderOptions,
): MasterPlotProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiToken = options.apiToken?.trim();
  const model = options.model?.trim() || DEFAULT_MODEL;

  if (!apiToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for master plot generation");
  }

  return {
    async generateMasterPlot(input: GenerateMasterPlotInput): Promise<GenerateMasterPlotResult> {
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
                  text:
                    "You generate concise JSON master plot documents for short animated stories.",
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
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: masterPlotResponseJsonSchema,
            },
          }),
          signal: controller?.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Gemini master plot provider request failed with status ${response.status}`,
          );
        }

        const rawResponse = await response.json();
        const rawText = extractCandidateText(rawResponse);
        const masterPlot = normalizeMasterPlotPayload(JSON.parse(rawText));

        return {
          rawResponse: rawText,
          provider: "gemini",
          model,
          masterPlot,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Gemini master plot provider request timed out");
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

function buildPromptText(input: GenerateMasterPlotInput) {
  return [
    `Project: ${input.projectId}`,
    `Premise: ${input.premiseText}`,
    "",
    "Prompt:",
    input.promptText,
  ].join("\n");
}

const masterPlotResponseJsonSchema = {
  type: "object",
  required: [
    "logline",
    "synopsis",
    "mainCharacters",
    "coreConflict",
    "emotionalArc",
    "endingBeat",
  ],
  properties: {
    title: { type: ["string", "null"] },
    logline: { type: "string" },
    synopsis: { type: "string" },
    mainCharacters: {
      type: "array",
      items: { type: "string" },
    },
    coreConflict: { type: "string" },
    emotionalArc: { type: "string" },
    endingBeat: { type: "string" },
    targetDurationSec: { type: ["integer", "null"] },
  },
} as const;

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

  if (!text) {
    throw new Error("Gemini master plot provider returned no usable content");
  }

  return text;
}

function normalizeMasterPlotPayload(payload: unknown): GenerateMasterPlotResult["masterPlot"] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini master plot provider returned invalid master plot JSON");
  }

  const mainCharacters = (payload as { mainCharacters?: unknown }).mainCharacters;

  if (
    !Array.isArray(mainCharacters) ||
    mainCharacters.length === 0 ||
    !mainCharacters.every((value) => typeof value === "string" && value.trim())
  ) {
    throw new Error("Gemini master plot provider returned invalid mainCharacters");
  }

  const rawTargetDurationSec = (payload as { targetDurationSec?: unknown }).targetDurationSec;

  if (
    rawTargetDurationSec !== undefined &&
    rawTargetDurationSec !== null &&
    (typeof rawTargetDurationSec !== "number" ||
      !Number.isInteger(rawTargetDurationSec) ||
      rawTargetDurationSec <= 0)
  ) {
    throw new Error("Gemini master plot provider returned invalid targetDurationSec");
  }

  const normalizedTargetDurationSec =
    typeof rawTargetDurationSec === "number" ? rawTargetDurationSec : null;

  return {
    title: readNullableString((payload as { title?: unknown }).title, "title"),
    logline: readNonEmptyString((payload as { logline?: unknown }).logline, "logline"),
    synopsis: readNonEmptyString((payload as { synopsis?: unknown }).synopsis, "synopsis"),
    mainCharacters,
    coreConflict: readNonEmptyString(
      (payload as { coreConflict?: unknown }).coreConflict,
      "coreConflict",
    ),
    emotionalArc: readNonEmptyString(
      (payload as { emotionalArc?: unknown }).emotionalArc,
      "emotionalArc",
    ),
    endingBeat: readNonEmptyString((payload as { endingBeat?: unknown }).endingBeat, "endingBeat"),
    targetDurationSec: normalizedTargetDurationSec,
  };
}

function readNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini master plot provider returned invalid ${fieldName}`);
  }

  return value;
}

function readNullableString(value: unknown, fieldName: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini master plot provider returned invalid ${fieldName}`);
  }

  return value;
}
