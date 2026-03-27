import type {
  GenerateVideoPromptInput,
  GenerateVideoPromptResult,
  VideoPromptProvider,
} from "@sweet-star/core";

import { buildProviderRequestError } from "./provider-request-error";

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
        promptText: buildPromptText(input),
      });
      const payload = normalizeVideoPromptPayload(rawText);

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
                "You generate structured JSON video prompt plans for Kling Omni single-shot video generation. Output must be valid JSON. finalPrompt must be Simplified Chinese natural-language prompt text for Kling Omni. Preserve provided dialogue, narration, audio, and continuity constraints. Do not output markdown.",
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

const videoPromptPlanResponseJsonSchema = {
  type: "object",
  required: ["finalPrompt", "dialoguePlan", "audioPlan", "visualGuardrails", "rationale"],
  properties: {
    finalPrompt: { type: "string" },
    dialoguePlan: { type: "string" },
    audioPlan: { type: "string" },
    visualGuardrails: { type: "string" },
    rationale: { type: "string" },
  },
} as const;

function buildPromptText(input: GenerateVideoPromptInput) {
  const lines = [
    "任务：为 Kling Omni 单镜头视频生成一个结构化 JSON prompt plan。",
    "",
    "输出字段：",
    "- finalPrompt",
    "- dialoguePlan",
    "- audioPlan",
    "- visualGuardrails",
    "- rationale",
    "",
    "关键要求：",
    "- finalPrompt 必须直接可用于 Kling Omni 单镜头视频生成。",
    "- finalPrompt 必须使用简体中文自然语言，不要输出 JSON 片段、标题或解释。",
    "- finalPrompt 必须显式以 <<<image_1>>> 作为首帧锚点。",
    input.endFrame
      ? "- 当前镜头同时有首帧和尾帧，动作与镜头需要从首帧自然推进到尾帧状态。"
      : "- 当前镜头只有首帧，动作与镜头只能在首帧基础上自然延展。",
    "- 不要虚构未提供的新角色设定或剧情。",
    "- 必须保留对白、旁白、环境声、拟音和连续性要求；如果没有，也要在 plan 中明确说明。",
    "- 这是单镜头，不要输出分镜列表。",
    "",
    "镜头上下文：",
    `- segment 摘要：${input.segment.summary}`,
    `- shotCode：${input.currentShot.shotCode}`,
    `- shot 目的：${input.currentShot.purpose}`,
    `- 画面内容：${input.currentShot.visual}`,
    `- 主体：${input.currentShot.subject}`,
    `- 动作：${input.currentShot.action}`,
    `- frameDependency：${input.currentShot.frameDependency}`,
    `- 时长秒数：${input.durationSec ?? "未知"}`,
    `- 对白：${input.currentShot.dialogue ?? "无"}`,
    `- 旁白/画外音：${input.currentShot.os ?? "无"}`,
    `- 音频/声效：${input.currentShot.audio ?? "无"}`,
    `- 转场提示：${input.currentShot.transitionHint ?? "无"}`,
    `- 连续性要求：${input.currentShot.continuityNotes ?? "无"}`,
    `- 首帧尺寸：${formatDimensions(input.startFrame.width, input.startFrame.height)}`,
    input.endFrame
      ? `- 尾帧尺寸：${formatDimensions(input.endFrame.width, input.endFrame.height)}`
      : "- 尾帧：无",
    "",
    "dialoguePlan 要求：",
    "- 写清说话主体、可见口型台词、旁白内容、是否需要可见口型、节奏提示。",
    "",
    "audioPlan 要求：",
    "- 写清环境声、拟音、音乐氛围、声场重点。",
    "",
    "visualGuardrails 要求：",
    "- 写清角色一致性、服装道具一致性、镜头运动、空间连续性、时间连续性、首尾帧过渡和明确禁止项。",
    "",
    "rationale 要求：",
    "- 用简短中文解释 finalPrompt 为什么这样组织。",
  ];

  return lines.filter(Boolean).join("\n");
}

function formatDimensions(width: number | null, height: number | null) {
  if (typeof width === "number" && typeof height === "number") {
    return `${width}x${height}`;
  }

  return "未知";
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

function normalizeVideoPromptPayload(
  rawText: string,
): Omit<GenerateVideoPromptResult, "rawResponse" | "provider" | "model"> {
  let payload: unknown;

  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error("Gemini video prompt provider returned invalid prompt plan JSON");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini video prompt provider returned invalid prompt plan JSON");
  }

  return {
    finalPrompt: readNonEmptyString((payload as { finalPrompt?: unknown }).finalPrompt, "finalPrompt"),
    dialoguePlan: readNonEmptyString(
      (payload as { dialoguePlan?: unknown }).dialoguePlan,
      "dialoguePlan",
    ),
    audioPlan: readNonEmptyString((payload as { audioPlan?: unknown }).audioPlan, "audioPlan"),
    visualGuardrails: readNonEmptyString(
      (payload as { visualGuardrails?: unknown }).visualGuardrails,
      "visualGuardrails",
    ),
    rationale: readNonEmptyString((payload as { rationale?: unknown }).rationale, "rationale"),
  };
}

function readNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini video prompt provider returned invalid ${fieldName}`);
  }

  return value.trim();
}
