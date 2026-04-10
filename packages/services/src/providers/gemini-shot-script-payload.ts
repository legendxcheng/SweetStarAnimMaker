import type { GenerateShotScriptSegmentResult } from "@sweet-star/core";

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

export interface NormalizedGeminiShotScriptSegmentPayload {
  anchors: TemporaryAnchorPlan[];
  segments: TemporarySegmentPlan[];
  segment: GenerateShotScriptSegmentResult["segment"];
}

export function normalizeGeminiShotScriptSegmentPayload(
  payload: unknown,
  variables: Record<string, unknown>,
): NormalizedGeminiShotScriptSegmentPayload {
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

export function parseGeminiShotScriptPayload(rawText: string) {
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

export function findUnsafeGeminiFrameDependencyIssues(
  payload: NormalizedGeminiShotScriptSegmentPayload,
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

export function downgradeUnsafeGeminiFrameDependencies(
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
    (combinedText.includes("正面") &&
      combinedText.includes("背面") &&
      !combinedText.includes("转身")) ||
    (combinedText.includes("远景") &&
      combinedText.includes("特写") &&
      !combinedText.includes("推")) ||
    hasPairedKeywords(combinedText, ["静止", "高速"]) ||
    (combinedText.includes("拿枪") &&
      combinedText.includes("开枪") &&
      combinedText.includes("倒地"))
  );
}

function hasPairedKeywords(text: string, keywords: [string, string]) {
  return text.includes(keywords[0]) && text.includes(keywords[1]);
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
