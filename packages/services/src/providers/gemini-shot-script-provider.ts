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

interface TemporaryAnchorPlan {
  id: string;
  label: string;
  isRequired: boolean;
}

interface TemporarySegmentPlan {
  id: string;
  fromAnchorId: string;
  toAnchorId: string;
  strategy: "start_frame_only" | "start_and_end_frame";
  transitionSmooth: boolean;
  reason: string;
}

interface NormalizedShotScriptSegmentPayload {
  anchors: TemporaryAnchorPlan[];
  segments: TemporarySegmentPlan[];
  segment: GenerateShotScriptSegmentResult["segment"];
}

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
      const maxAttempts = characterSheets.length > 0 ? 3 : 2;
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
        const normalizedPayload = normalizeShotScriptSegmentPayload(
          parseShotScriptPayload(rawText),
          input.variables,
        );
        const violations = validator.validateShots(normalizedPayload.segment.shots);
        const unsafeIssues = findUnsafeFrameDependencyIssues(normalizedPayload);

        if (violations.length === 0 && unsafeIssues.length === 0) {
          return {
            rawResponse: rawText,
            segment: normalizedPayload.segment,
          };
        }

        lastViolationsMessage = violations.map((violation) => violation.message).join("\n");
        const unsafeIssuesMessage = unsafeIssues.join("\n");

        if (attempt === maxAttempts) {
          if (violations.length === 0 && unsafeIssues.length > 0) {
            return {
              rawResponse: rawText,
              segment: downgradeUnsafeFrameDependencies(normalizedPayload.segment),
            };
          }

          throw new Error(
            `Gemini shot script provider failed canonical character validation after ${attempt} attempts: ${lastViolationsMessage}`,
          );
        }

        promptText = buildCorrectionPrompt(
          input.promptText,
          lastViolationsMessage,
          unsafeIssuesMessage,
        );
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
  required: ["name", "summary", "anchors", "segments", "shots"],
  properties: {
    name: { type: ["string", "null"] },
    summary: { type: "string" },
    anchors: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "label", "isRequired"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          isRequired: { type: "boolean" },
        },
      },
    },
    segments: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "fromAnchorId",
          "toAnchorId",
          "strategy",
          "transitionSmooth",
          "reason",
        ],
        properties: {
          id: { type: "string" },
          fromAnchorId: { type: "string" },
          toAnchorId: { type: "string" },
          strategy: { type: "string" },
          transitionSmooth: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
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
): NormalizedShotScriptSegmentPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini shot script provider returned invalid shot script JSON");
  }

  const scene = readSceneContext(variables);
  const segment = readSegmentContext(variables);
  const anchors = readAnchorPlans((payload as { anchors?: unknown }).anchors);
  const segments = readSegmentPlans((payload as { segments?: unknown }).segments);
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
  const normalizedAnchors =
    anchors.length > 0 ? anchors : inferAnchorPlansFromShots(normalizedShots, summary);
  const normalizedSegments =
    segments.length > 0 ? segments : inferSegmentPlansFromShots(normalizedShots);

  assertChineseFirstShots(normalizedShots);
  assertDurationMatchesSegment(normalizedShots, segment.durationSec);

  return {
    anchors: normalizedAnchors,
    segments: normalizedSegments,
    segment: {
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
    },
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

function buildCorrectionPrompt(
  basePromptText: string,
  violationsMessage: string,
  unsafeIssuesMessage: string,
) {
  const sections = [basePromptText];

  if (violationsMessage.trim().length > 0) {
    sections.push(
      "",
      "上一次输出存在以下角色命名问题，请只修正这些问题后重新输出完整 JSON：",
      violationsMessage,
      "所有涉及已批准角色的镜头，必须保留标准角色名，不得使用简称或泛称。",
    );
  }

  if (unsafeIssuesMessage.trim().length > 0) {
    sections.push(
      "",
      "上一次输出存在以下关键节点规划问题，请修正后重新输出完整 JSON：",
      unsafeIssuesMessage,
      "对于不可平滑过渡的关键节点，不要强行使用 start_and_end_frame。",
      "请优先拆出更多关键节点或更多 shots；如果仍然拿不准，就改用 start_frame_only。",
    );
  }

  return sections.join("\n");
}

function readAnchorPlans(value: unknown): TemporaryAnchorPlan[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => normalizeAnchorPlan(entry, index));
}

function normalizeAnchorPlan(entry: unknown, index: number): TemporaryAnchorPlan {
  if (!entry || typeof entry !== "object") {
    throw new Error("Gemini shot script provider returned invalid anchor");
  }

  return {
    id: readNonEmptyString((entry as { id?: unknown }).id, `anchors[${index}].id`),
    label: readNonEmptyString((entry as { label?: unknown }).label, `anchors[${index}].label`),
    isRequired: readBoolean(
      (entry as { isRequired?: unknown }).isRequired,
      `anchors[${index}].isRequired`,
    ),
  };
}

function readSegmentPlans(value: unknown): TemporarySegmentPlan[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => normalizeSegmentPlan(entry, index));
}

function normalizeSegmentPlan(entry: unknown, index: number): TemporarySegmentPlan {
  if (!entry || typeof entry !== "object") {
    throw new Error("Gemini shot script provider returned invalid segment plan");
  }

  return {
    id: readNonEmptyString((entry as { id?: unknown }).id, `segments[${index}].id`),
    fromAnchorId: readNonEmptyString(
      (entry as { fromAnchorId?: unknown }).fromAnchorId,
      `segments[${index}].fromAnchorId`,
    ),
    toAnchorId: readNonEmptyString(
      (entry as { toAnchorId?: unknown }).toAnchorId,
      `segments[${index}].toAnchorId`,
    ),
    strategy: readFrameDependency(
      (entry as { strategy?: unknown }).strategy,
      `segments[${index}].strategy`,
    ),
    transitionSmooth: readBoolean(
      (entry as { transitionSmooth?: unknown }).transitionSmooth,
      `segments[${index}].transitionSmooth`,
    ),
    reason: readNonEmptyString(
      (entry as { reason?: unknown }).reason,
      `segments[${index}].reason`,
    ),
  };
}

function inferAnchorPlansFromShots(
  shots: GenerateShotScriptSegmentResult["segment"]["shots"],
  summary: string,
): TemporaryAnchorPlan[] {
  if (shots.length === 0) {
    return [];
  }

  return [
    {
      id: "anchor_1",
      label: shots[0]?.visual ?? summary,
      isRequired: true,
    },
  ];
}

function inferSegmentPlansFromShots(
  shots: GenerateShotScriptSegmentResult["segment"]["shots"],
): TemporarySegmentPlan[] {
  const firstShot = shots[0];

  if (!firstShot) {
    return [];
  }

  return [
    {
      id: "segment_plan_1",
      fromAnchorId: "anchor_1",
      toAnchorId: "anchor_1",
      strategy: firstShot.frameDependency,
      transitionSmooth: true,
      reason: "兼容旧响应格式时推断的默认关键节点规划。",
    },
  ];
}

function findUnsafeFrameDependencyIssues(
  payload: NormalizedShotScriptSegmentPayload,
): string[] {
  const anchorsById = new Map(payload.anchors.map((anchor) => [anchor.id, anchor] as const));
  const riskySegments = payload.segments.filter(
    (segment) =>
      segment.strategy === "start_and_end_frame" &&
      (!segment.transitionSmooth || hasForbiddenAnchorTransition(segment, anchorsById)),
  );

  if (riskySegments.length === 0) {
    return [];
  }

  const hasRiskyEndFrameShot = payload.segment.shots.some(
    (shot) => shot.frameDependency === "start_and_end_frame",
  );

  if (!hasRiskyEndFrameShot) {
    return [];
  }

  return riskySegments.map(
    (segment) =>
      `关键节点 ${segment.fromAnchorId} -> ${segment.toAnchorId} 不可平滑过渡：${segment.reason}；请拆分更多节点，或改用 start_frame_only。`,
  );
}

function hasForbiddenAnchorTransition(
  segment: TemporarySegmentPlan,
  anchorsById: Map<string, TemporaryAnchorPlan>,
) {
  const fromAnchor = anchorsById.get(segment.fromAnchorId);
  const toAnchor = anchorsById.get(segment.toAnchorId);
  const combinedText = [segment.reason, fromAnchor?.label ?? "", toAnchor?.label ?? ""].join("\n");

  return (
    hasPairedKeywords(combinedText, ["室内", "室外"]) ||
    hasPairedKeywords(combinedText, ["城市", "森林"]) ||
    hasPairedKeywords(combinedText, ["人", "机器人"]) ||
    hasPairedKeywords(combinedText, ["小孩", "成年人"]) ||
    hasPairedKeywords(combinedText, ["站", "躺"]) ||
    (combinedText.includes("正面") && combinedText.includes("背面") && !combinedText.includes("转身")) ||
    (combinedText.includes("远景") && combinedText.includes("特写") && !combinedText.includes("推")) ||
    hasPairedKeywords(combinedText, ["静止", "高速"]) ||
    (combinedText.includes("拿枪") &&
      combinedText.includes("开枪") &&
      combinedText.includes("倒地"))
  );
}

function hasPairedKeywords(text: string, keywords: [string, string]) {
  return text.includes(keywords[0]) && text.includes(keywords[1]);
}

function downgradeUnsafeFrameDependencies(
  segment: GenerateShotScriptSegmentResult["segment"],
): GenerateShotScriptSegmentResult["segment"] {
  return {
    ...segment,
    shots: segment.shots.map((shot) =>
      shot.frameDependency === "start_and_end_frame"
        ? { ...shot, frameDependency: "start_frame_only" as const }
        : shot,
    ),
  };
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

function readBoolean(value: unknown, fieldName: string) {
  if (typeof value !== "boolean") {
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
