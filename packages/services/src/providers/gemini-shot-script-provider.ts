import type {
  GenerateShotScriptInput,
  GenerateShotScriptResult,
  ShotScriptProvider,
} from "@sweet-star/core";

export interface CreateGeminiShotScriptProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";

export function createGeminiShotScriptProvider(
  options: CreateGeminiShotScriptProviderOptions,
): ShotScriptProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiToken = options.apiToken?.trim();
  const model = options.model?.trim() || DEFAULT_MODEL;

  if (!apiToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for shot script generation");
  }

  return {
    async generateShotScript(input: GenerateShotScriptInput): Promise<GenerateShotScriptResult> {
      const rawText = await requestGeminiJson({
        baseUrl,
        apiToken,
        model,
        timeoutMs: options.timeoutMs,
        errorLabel: "shot script",
        systemText:
          "You generate concise JSON shot script documents for short animated stories.",
        promptText: input.promptText,
        responseJsonSchema: shotScriptResponseJsonSchema,
      });
      const shotScript = normalizeShotScriptPayload(JSON.parse(rawText));

      return {
        rawResponse: rawText,
        shotScript,
      };
    },
  };
}

async function requestGeminiJson(input: {
  baseUrl: string;
  apiToken: string;
  model: string;
  timeoutMs?: number;
  errorLabel: string;
  systemText: string;
  promptText: string;
  responseJsonSchema: object;
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
          parts: [{ text: input.systemText }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.promptText }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: input.responseJsonSchema,
        },
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Gemini ${input.errorLabel} provider request failed with status ${response.status}`,
      );
    }

    const rawResponse = await response.json();
    return extractCandidateText(rawResponse);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Gemini ${input.errorLabel} provider request timed out`);
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

const shotScriptResponseJsonSchema = {
  type: "object",
  required: ["title", "shots"],
  properties: {
    title: { type: ["string", "null"] },
    shots: {
      type: "array",
      items: {
        type: "object",
        required: [
          "sceneId",
          "segmentId",
          "shotCode",
          "shotPurpose",
          "subjectCharacters",
          "environment",
          "framing",
          "cameraAngle",
          "composition",
          "actionMoment",
          "emotionTone",
          "continuityNotes",
          "imagePrompt",
          "negativePrompt",
          "motionHint",
          "durationSec",
        ],
        properties: {
          sceneId: { type: "string" },
          segmentId: { type: "string" },
          shotCode: { type: "string" },
          shotPurpose: { type: "string" },
          subjectCharacters: {
            type: "array",
            items: { type: "string" },
          },
          environment: { type: "string" },
          framing: { type: "string" },
          cameraAngle: { type: "string" },
          composition: { type: "string" },
          actionMoment: { type: "string" },
          emotionTone: { type: "string" },
          continuityNotes: { type: "string" },
          imagePrompt: { type: "string" },
          negativePrompt: { type: ["string", "null"] },
          motionHint: { type: ["string", "null"] },
          durationSec: { type: ["integer", "null"] },
        },
      },
    },
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
    throw new Error("Gemini shot script provider returned no usable content");
  }

  return text;
}

function normalizeShotScriptPayload(payload: unknown): GenerateShotScriptResult["shotScript"] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini shot script provider returned invalid shot script JSON");
  }

  const shots = (payload as { shots?: unknown }).shots;

  if (!Array.isArray(shots) || shots.length === 0) {
    throw new Error("Gemini shot script provider returned invalid shots");
  }

  return {
    id: "shot_script_generated",
    title: readNullableString((payload as { title?: unknown }).title, "title"),
    sourceStoryboardId: "pending_source_storyboard_id",
    sourceTaskId: null,
    updatedAt: "pending_updated_at",
    approvedAt: null,
    shots: shots.map((shot, index) => normalizeShot(shot, index)),
  };
}

function normalizeShot(shot: unknown, index: number) {
  if (!shot || typeof shot !== "object") {
    throw new Error("Gemini shot script provider returned invalid shot");
  }

  const subjectCharacters = (shot as { subjectCharacters?: unknown }).subjectCharacters;

  if (!Array.isArray(subjectCharacters)) {
    throw new Error("Gemini shot script provider returned invalid subjectCharacters");
  }

  const durationSec = (shot as { durationSec?: unknown }).durationSec;

  return {
    id: `shot_${index + 1}`,
    sceneId: readNonEmptyString((shot as { sceneId?: unknown }).sceneId, "sceneId"),
    segmentId: readNonEmptyString((shot as { segmentId?: unknown }).segmentId, "segmentId"),
    order: index + 1,
    shotCode: readNonEmptyString((shot as { shotCode?: unknown }).shotCode, "shotCode"),
    shotPurpose: readNonEmptyString(
      (shot as { shotPurpose?: unknown }).shotPurpose,
      "shotPurpose",
    ),
    subjectCharacters: subjectCharacters.map((character, characterIndex) =>
      readNonEmptyString(character, `subjectCharacters[${characterIndex}]`),
    ),
    environment: readNonEmptyString(
      (shot as { environment?: unknown }).environment,
      "environment",
    ),
    framing: readNonEmptyString((shot as { framing?: unknown }).framing, "framing"),
    cameraAngle: readNonEmptyString(
      (shot as { cameraAngle?: unknown }).cameraAngle,
      "cameraAngle",
    ),
    composition: readNonEmptyString(
      (shot as { composition?: unknown }).composition,
      "composition",
    ),
    actionMoment: readNonEmptyString(
      (shot as { actionMoment?: unknown }).actionMoment,
      "actionMoment",
    ),
    emotionTone: readNonEmptyString(
      (shot as { emotionTone?: unknown }).emotionTone,
      "emotionTone",
    ),
    continuityNotes: readNonEmptyString(
      (shot as { continuityNotes?: unknown }).continuityNotes,
      "continuityNotes",
    ),
    imagePrompt: readNonEmptyString(
      (shot as { imagePrompt?: unknown }).imagePrompt,
      "imagePrompt",
    ),
    negativePrompt: readNullableString(
      (shot as { negativePrompt?: unknown }).negativePrompt,
      "negativePrompt",
    ),
    motionHint: readNullableString(
      (shot as { motionHint?: unknown }).motionHint,
      "motionHint",
    ),
    durationSec: typeof durationSec === "number" ? durationSec : null,
  };
}

function readNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini shot script provider returned invalid ${fieldName}`);
  }

  return value;
}

function readNullableString(value: unknown, fieldName: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini shot script provider returned invalid ${fieldName}`);
  }

  return value;
}
