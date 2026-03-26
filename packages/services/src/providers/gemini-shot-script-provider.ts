import type {
  GenerateShotScriptSegmentInput,
  GenerateShotScriptSegmentResult,
  ShotScriptProvider,
  ShotScriptCanonicalCharacterContext,
} from "@sweet-star/core";
import { buildShotScriptCanonicalCharacterValidator } from "@sweet-star/core";

import { buildProviderRequestError } from "./provider-request-error";

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
    async generateShotScriptSegment(
      input: GenerateShotScriptSegmentInput,
    ): Promise<GenerateShotScriptSegmentResult> {
      const characterSheets = readCanonicalCharacterContext(input.variables);
      const validator = buildShotScriptCanonicalCharacterValidator(characterSheets);
      const maxAttempts = characterSheets.length > 0 ? 3 : 1;
      let promptText = input.promptText;
      let lastViolationsMessage = "";

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const rawText = await requestGeminiJson({
          baseUrl,
          apiToken,
          model,
          timeoutMs: options.timeoutMs,
          errorLabel: "shot script",
          systemText:
            "You generate structured JSON shot scripts for exactly one storyboard segment. All reviewable narrative fields must be in Simplified Chinese.",
          promptText,
          responseJsonSchema: shotScriptSegmentResponseJsonSchema,
        });
        const segment = normalizeShotScriptSegmentPayload(
          parseShotScriptPayload(rawText),
          input.variables,
        );
        const violations = validator.validateShots(segment.shots);

        if (violations.length === 0) {
          return {
            rawResponse: rawText,
            segment,
          };
        }

        lastViolationsMessage = violations.map((violation) => violation.message).join("\n");

        if (attempt === maxAttempts) {
          throw new Error(
            `Gemini shot script provider failed canonical character validation after ${attempt} attempts: ${lastViolationsMessage}`,
          );
        }

        promptText = buildCorrectionPrompt(input.promptText, lastViolationsMessage);
      }

      throw new Error(
        `Gemini shot script provider failed canonical character validation after ${maxAttempts} attempts: ${lastViolationsMessage}`,
      );
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
      const bodyText = typeof response.text === "function" ? await response.text() : null;
      throw buildProviderRequestError(`Gemini ${input.errorLabel}`, response.status, bodyText);
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

const shotScriptSegmentResponseJsonSchema = {
  type: "object",
  required: ["name", "summary", "shots"],
  properties: {
    name: { type: ["string", "null"] },
    summary: { type: "string" },
    shots: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "sceneId",
          "segmentId",
          "order",
          "shotCode",
          "durationSec",
          "purpose",
          "visual",
          "subject",
          "action",
          "frameDependency",
          "dialogue",
          "os",
          "audio",
          "transitionHint",
          "continuityNotes",
        ],
        properties: {
          id: { type: "string" },
          sceneId: { type: "string" },
          segmentId: { type: "string" },
          order: { type: "integer" },
          shotCode: { type: "string" },
          durationSec: { type: ["integer", "null"] },
          purpose: { type: "string" },
          visual: { type: "string" },
          subject: { type: "string" },
          action: { type: "string" },
          frameDependency: { type: "string" },
          dialogue: { type: ["string", "null"] },
          os: { type: ["string", "null"] },
          audio: { type: ["string", "null"] },
          transitionHint: { type: ["string", "null"] },
          continuityNotes: { type: ["string", "null"] },
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

function normalizeShotScriptSegmentPayload(
  payload: unknown,
  variables: Record<string, unknown>,
): GenerateShotScriptSegmentResult["segment"] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini shot script provider returned invalid shot script JSON");
  }

  const scene = readSceneContext(variables);
  const segment = readSegmentContext(variables);
  const shots = (payload as { shots?: unknown }).shots;

  if (!Array.isArray(shots) || shots.length === 0) {
    throw new Error("Gemini shot script provider returned invalid shots");
  }

  const name = readNullableString((payload as { name?: unknown }).name, "name");
  const summary = readNonEmptyString((payload as { summary?: unknown }).summary, "summary");
  assertContainsChinese(summary, "summary");
  if (name) {
    assertContainsChinese(name, "name");
  }

  const normalizedShots = shots.map((shot, index) =>
    normalizeShot(shot, index, {
      sceneId: scene.id,
      segmentId: segment.id,
    }),
  );

  assertChineseFirstShots(normalizedShots);
  assertDurationMatchesSegment(normalizedShots, segment.durationSec);

  return {
    segmentId: segment.id,
    sceneId: scene.id,
    order: segment.order,
    name,
    summary,
    durationSec: segment.durationSec,
    status: "in_review",
    lastGeneratedAt: null,
    approvedAt: null,
    shots: normalizedShots,
  };
}

function parseShotScriptPayload(rawText: string) {
  const directPayload = tryParseJson(rawText.trim());

  if (directPayload !== null) {
    return directPayload;
  }

  const extractedObjectText = extractFirstJsonObject(rawText);

  if (extractedObjectText !== null) {
    const extractedPayload = tryParseJson(extractedObjectText);

    if (extractedPayload !== null) {
      return extractedPayload;
    }
  }

  throw new Error("Gemini shot script provider returned invalid shot script JSON");
}

function tryParseJson(rawText: string) {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return null;
  }
}

function extractFirstJsonObject(rawText: string) {
  const startIndex = rawText.indexOf("{");

  if (startIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (char === undefined) {
      break;
    }

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return rawText.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function readCanonicalCharacterContext(
  variables: Record<string, unknown>,
): ShotScriptCanonicalCharacterContext[] {
  const characterSheets = variables.characterSheets;

  if (!Array.isArray(characterSheets)) {
    return [];
  }

  return characterSheets.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const characterName = (entry as { characterName?: unknown }).characterName;
    const promptTextCurrent = (entry as { promptTextCurrent?: unknown }).promptTextCurrent;
    const characterId = (entry as { characterId?: unknown }).characterId;
    const imageAssetPath = (entry as { imageAssetPath?: unknown }).imageAssetPath;

    if (
      typeof characterId !== "string" ||
      !characterId.trim() ||
      typeof characterName !== "string" ||
      !characterName.trim() ||
      typeof promptTextCurrent !== "string" ||
      !promptTextCurrent.trim()
    ) {
      return [];
    }

    return [
      {
        characterId,
        characterName,
        promptTextCurrent,
        imageAssetPath: typeof imageAssetPath === "string" ? imageAssetPath : null,
      },
    ];
  });
}

function buildCorrectionPrompt(basePromptText: string, violationsMessage: string) {
  return [
    basePromptText,
    "",
    "上一次输出存在以下角色命名问题，请只修正这些问题后重新输出完整 JSON：",
    violationsMessage,
    "所有涉及已批准角色的镜头，必须保留标准角色名，不得使用简称或泛称。",
  ].join("\n");
}

function normalizeShot(
  shot: unknown,
  index: number,
  source: {
    sceneId: string;
    segmentId: string;
  },
) {
  if (!shot || typeof shot !== "object") {
    throw new Error("Gemini shot script provider returned invalid shot");
  }

  const sceneId = readNonEmptyString((shot as { sceneId?: unknown }).sceneId, "sceneId");
  const segmentId = readNonEmptyString((shot as { segmentId?: unknown }).segmentId, "segmentId");

  if (sceneId !== source.sceneId) {
    throw new Error("Gemini shot script provider returned mismatched sceneId");
  }

  if (segmentId !== source.segmentId) {
    throw new Error("Gemini shot script provider returned mismatched segmentId");
  }

  const durationSec = readNullablePositiveInteger(
    (shot as { durationSec?: unknown }).durationSec,
    "durationSec",
  );

  return {
    id: readNonEmptyString((shot as { id?: unknown }).id, "id"),
    sceneId,
    segmentId,
    order: index + 1,
    shotCode: readNonEmptyString((shot as { shotCode?: unknown }).shotCode, "shotCode"),
    durationSec,
    purpose: readNonEmptyString((shot as { purpose?: unknown }).purpose, "purpose"),
    visual: readNonEmptyString((shot as { visual?: unknown }).visual, "visual"),
    subject: readNonEmptyString((shot as { subject?: unknown }).subject, "subject"),
    action: readNonEmptyString((shot as { action?: unknown }).action, "action"),
    frameDependency: readFrameDependency(
      (shot as { frameDependency?: unknown }).frameDependency,
      "frameDependency",
    ),
    dialogue: readNullableString((shot as { dialogue?: unknown }).dialogue, "dialogue"),
    os: readNullableString((shot as { os?: unknown }).os, "os"),
    audio: readNullableString((shot as { audio?: unknown }).audio, "audio"),
    transitionHint: readNullableString(
      (shot as { transitionHint?: unknown }).transitionHint,
      "transitionHint",
    ),
    continuityNotes: readNullableString(
      (shot as { continuityNotes?: unknown }).continuityNotes,
      "continuityNotes",
    ),
  };
}

function readSceneContext(variables: Record<string, unknown>) {
  const scene = variables.scene;

  if (!scene || typeof scene !== "object") {
    throw new Error("Gemini shot script provider requires scene context");
  }

  return {
    id: readNonEmptyString((scene as { id?: unknown }).id, "scene.id"),
  };
}

function readSegmentContext(variables: Record<string, unknown>) {
  const segment = variables.segment;

  if (!segment || typeof segment !== "object") {
    throw new Error("Gemini shot script provider requires segment context");
  }

  const durationValue = (segment as { durationSec?: unknown }).durationSec;

  return {
    id: readNonEmptyString((segment as { id?: unknown }).id, "segment.id"),
    order: readPositiveInteger((segment as { order?: unknown }).order, "segment.order"),
    durationSec:
      typeof durationValue === "number" && Number.isInteger(durationValue) ? durationValue : null,
  };
}

function assertChineseFirstShots(
  shots: Array<{
    purpose: string;
    visual: string;
    subject: string;
    action: string;
    frameDependency: "start_frame_only" | "start_and_end_frame";
    dialogue: string | null;
    os: string | null;
    audio: string | null;
    transitionHint: string | null;
    continuityNotes: string | null;
  }>,
) {
  const reviewText = shots
    .flatMap((shot) => [
      shot.purpose,
      shot.visual,
      shot.subject,
      shot.action,
      shot.frameDependency,
      shot.dialogue,
      shot.os,
      shot.audio,
      shot.transitionHint,
      shot.continuityNotes,
    ])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");

  assertContainsChinese(reviewText, "shots");
}

function assertDurationMatchesSegment(
  shots: Array<{
    durationSec: number | null;
  }>,
  expectedDurationSec: number | null,
) {
  if (expectedDurationSec === null) {
    return;
  }

  const actualDurationSec = shots.reduce(
    (total, shot) => total + (shot.durationSec ?? 0),
    0,
  );
  const toleranceSec = Math.max(1, Math.round(expectedDurationSec * 0.2));

  if (Math.abs(actualDurationSec - expectedDurationSec) > toleranceSec) {
    throw new Error("Gemini shot script provider returned mismatched total duration");
  }
}

function assertContainsChinese(value: string, fieldName: string) {
  if (!/[\u3400-\u9fff]/u.test(value)) {
    throw new Error(`Gemini shot script provider returned non-Chinese ${fieldName}`);
  }
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

function readNullablePositiveInteger(value: unknown, fieldName: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Gemini shot script provider returned invalid ${fieldName}`);
  }

  return value;
}

function readPositiveInteger(value: unknown, fieldName: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Gemini shot script provider returned invalid ${fieldName}`);
  }

  return value;
}

function readFrameDependency(
  value: unknown,
  fieldName: string,
): "start_frame_only" | "start_and_end_frame" {
  if (value === "start_frame_only" || value === "start_and_end_frame") {
    return value;
  }

  throw new Error(`Gemini shot script provider returned invalid ${fieldName}`);
}
