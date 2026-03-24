import type {
  FramePromptProvider,
  GenerateFramePromptInput,
  GenerateFramePromptResult,
} from "@sweet-star/core";

export interface CreateGeminiFramePromptProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";

export function createGeminiFramePromptProvider(
  options: CreateGeminiFramePromptProviderOptions,
): FramePromptProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;

  return {
    async generateFramePrompt(
      input: GenerateFramePromptInput,
    ): Promise<GenerateFramePromptResult> {
      const apiToken = options.apiToken?.trim();

      if (!apiToken) {
        throw new Error("VECTORENGINE_API_TOKEN is required for frame prompt generation");
      }

      const rawText = await requestGeminiJson({
        baseUrl,
        apiToken,
        model,
        timeoutMs: options.timeoutMs,
        promptText: buildPromptText(input),
      });
      const promptPlan = normalizeFramePromptPayload(rawText, input);

      return {
        ...promptPlan,
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
                "You generate structured JSON frame plans for SeaDream image generation. Only select characterId values from the approved roster. All prompt text must be Simplified Chinese.",
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
          responseJsonSchema: framePromptPlanResponseJsonSchema,
        },
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`Gemini frame prompt provider request failed with status ${response.status}`);
    }

    const rawResponse = await response.json();
    return extractCandidateText(rawResponse);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini frame prompt provider request timed out");
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

const framePromptPlanResponseJsonSchema = {
  type: "object",
  required: ["frameType", "selectedCharacterIds", "promptText"],
  properties: {
    frameType: {
      type: "string",
      enum: ["start_frame", "end_frame"],
    },
    selectedCharacterIds: {
      type: "array",
      items: { type: "string" },
    },
    promptText: { type: "string" },
    negativePromptText: { type: ["string", "null"] },
    rationale: { type: ["string", "null"] },
  },
} as const;

function buildPromptText(input: GenerateFramePromptInput) {
  return [
    `projectId: ${input.projectId}`,
    `frameType: ${input.frameType}`,
    "",
    "segment:",
    JSON.stringify(input.segment, null, 2),
    "",
    "approvedCharacterRoster:",
    JSON.stringify(input.characterRoster, null, 2),
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
    throw new Error("Gemini frame prompt provider returned no usable content");
  }

  return text.trim();
}

function normalizeFramePromptPayload(
  rawText: string,
  input: GenerateFramePromptInput,
): Omit<GenerateFramePromptResult, "rawResponse" | "provider" | "model"> {
  let payload: unknown;

  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error("Gemini frame prompt provider returned invalid frame plan JSON");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini frame prompt provider returned invalid frame plan JSON");
  }

  const frameType = readFrameType((payload as { frameType?: unknown }).frameType);

  if (frameType !== input.frameType) {
    throw new Error("Gemini frame prompt provider returned mismatched frameType");
  }

  const validCharacterIds = new Set(input.characterRoster.map((item) => item.characterId));
  const selectedCharacterIds = normalizeCharacterIds(
    (payload as { selectedCharacterIds?: unknown }).selectedCharacterIds,
    validCharacterIds,
  );

  return {
    frameType,
    selectedCharacterIds,
    promptText: readNonEmptyString(
      (payload as { promptText?: unknown }).promptText,
      "promptText",
    ).trim(),
    negativePromptText: readNullableString(
      (payload as { negativePromptText?: unknown }).negativePromptText,
    ),
    rationale: readNullableString((payload as { rationale?: unknown }).rationale),
  };
}

function readFrameType(value: unknown): "start_frame" | "end_frame" {
  if (value === "start_frame" || value === "end_frame") {
    return value;
  }

  throw new Error("Gemini frame prompt provider returned invalid frameType");
}

function normalizeCharacterIds(value: unknown, validCharacterIds: Set<string>) {
  if (!Array.isArray(value)) {
    throw new Error("Gemini frame prompt provider returned invalid selectedCharacterIds");
  }

  const deduped = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalizedId = item.trim();

    if (normalizedId && validCharacterIds.has(normalizedId)) {
      deduped.add(normalizedId);
    }
  }

  return Array.from(deduped);
}

function readNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini frame prompt provider returned invalid ${fieldName}`);
  }

  return value;
}

function readNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Gemini frame prompt provider returned invalid optional text field");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
