import type {
  FramePromptProvider,
  GenerateFramePromptInput,
  GenerateFramePromptResult,
} from "@sweet-star/core";

import { buildFramePromptText } from "./frame-prompt-template";
import { requestOpenAiCompatibleChatCompletion } from "./openai-compatible-chat";

export interface CreateGrokFramePromptProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "grok-4.2";

export function createGrokFramePromptProvider(
  options: CreateGrokFramePromptProviderOptions,
): FramePromptProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;

  return {
    async generateFramePrompt(input: GenerateFramePromptInput): Promise<GenerateFramePromptResult> {
      const apiToken = options.apiToken?.trim();

      if (!apiToken) {
        throw new Error("VECTORENGINE_API_TOKEN is required for frame prompt generation");
      }

      const rawText = await requestOpenAiCompatibleChatCompletion({
        baseUrl,
        apiToken,
        model,
        timeoutMs: options.timeoutMs,
        providerLabel: "Grok frame prompt",
        systemText: [
          "You generate structured JSON frame plans for SeaDream image generation.",
          "Only select characterId values from the approved roster and sceneId values from the provided scene candidates.",
          "All prompt text must be Simplified Chinese.",
          "Return only one valid JSON object and no markdown.",
        ].join(" "),
        promptText: buildPromptText(input),
        responseFormat: "json_object",
      });
      const promptPlan = normalizeFramePromptPayload(rawText, input);

      return {
        ...promptPlan,
        rawResponse: rawText,
        provider: "grok",
        model,
      };
    },
  };
}

function buildPromptText(input: GenerateFramePromptInput) {
  return buildFramePromptText(input);
}

function normalizeFramePromptPayload(
  rawText: string,
  input: GenerateFramePromptInput,
): Omit<GenerateFramePromptResult, "rawResponse" | "provider" | "model"> {
  let payload: unknown;

  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error("Grok frame prompt provider returned invalid frame plan JSON");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Grok frame prompt provider returned invalid frame plan JSON");
  }

  const frameType = readFrameType((payload as { frameType?: unknown }).frameType);

  if (frameType !== input.frameType) {
    throw new Error("Grok frame prompt provider returned mismatched frameType");
  }

  const validCharacterIds = new Set(input.characterRoster.map((item) => item.characterId));
  const validSceneIds = new Set(input.sceneCandidates.map((item) => item.sceneId));
  const selectedCharacterIds = normalizeCharacterIds(
    (payload as { selectedCharacterIds?: unknown }).selectedCharacterIds,
    validCharacterIds,
  );
  const selectedSceneId = normalizeSceneId(
    (payload as { selectedSceneId?: unknown }).selectedSceneId,
    validSceneIds,
  );

  return {
    frameType,
    selectedCharacterIds,
    selectedSceneId,
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

  throw new Error("Grok frame prompt provider returned invalid frameType");
}

function normalizeCharacterIds(value: unknown, validCharacterIds: Set<string>) {
  if (!Array.isArray(value)) {
    throw new Error("Grok frame prompt provider returned invalid selectedCharacterIds");
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

function normalizeSceneId(value: unknown, validSceneIds: Set<string>) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Grok frame prompt provider returned invalid selectedSceneId");
  }

  const normalizedId = value.trim();

  if (!normalizedId) {
    return null;
  }

  if (!validSceneIds.has(normalizedId)) {
    return null;
  }

  return normalizedId;
}

function readNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Grok frame prompt provider returned invalid ${fieldName}`);
  }

  return value;
}

function readNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Grok frame prompt provider returned invalid optional text field");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
