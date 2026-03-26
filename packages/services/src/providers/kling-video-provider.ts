import type { VideoProvider } from "@sweet-star/core";
import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";

export interface CreateKlingVideoProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  modelName?: string;
  mode?: string;
  timeoutMs?: number;
  referenceImageUploader?: ReferenceImageUploader;
  fetchFn?: typeof fetch;
}

export interface KlingMultiPromptItem {
  index: number;
  prompt: string;
  duration: string;
}

export interface SubmitImageToVideoInput {
  image: string;
  imageTail?: string | null;
  promptText?: string;
  negativePromptText?: string | null;
  durationSeconds?: number | null;
  sound?: string | null;
  multiShot?: boolean | null;
  multiPrompt?: KlingMultiPromptItem[] | null;
  cfgScale?: number | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface SubmitImageToVideoResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  mode: string;
  rawResponse: string;
}

export interface GetImageToVideoTaskInput {
  taskId: string;
}

export interface GetImageToVideoTaskResult {
  taskId: string;
  status: string | null;
  videoUrl: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
  rawResponse: string;
}

export interface WaitForImageToVideoTaskInput extends GetImageToVideoTaskInput {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface KlingVideoProvider {
  submitImageToVideo(
    input: SubmitImageToVideoInput,
  ): Promise<SubmitImageToVideoResult> | SubmitImageToVideoResult;
  getImageToVideoTask(
    input: GetImageToVideoTaskInput,
  ): Promise<GetImageToVideoTaskResult> | GetImageToVideoTaskResult;
  waitForImageToVideoTask(
    input: WaitForImageToVideoTaskInput,
  ): Promise<GetImageToVideoTaskResult> | GetImageToVideoTaskResult;
}

export interface CreateKlingStageVideoProviderOptions extends CreateKlingVideoProviderOptions {
  durationSeconds?: number;
  sound?: string;
  multiShot?: boolean;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL_NAME = "kling-v3";
const DEFAULT_MODE = "pro";
const DEFAULT_STAGE_MODE = "std";
const DEFAULT_STAGE_DURATION_SECONDS = 10;
const DEFAULT_STAGE_SOUND = "on";
const SUCCESS_STATUSES = new Set(["succeed", "succeeded", "success", "completed", "done"]);
const FAILURE_STATUSES = new Set(["failed", "fail", "error", "canceled", "cancelled", "rejected"]);

export function createKlingVideoProvider(
  options: CreateKlingVideoProviderOptions = {},
): KlingVideoProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelName = options.modelName?.trim() || DEFAULT_MODEL_NAME;
  const mode = options.mode?.trim() || DEFAULT_MODE;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async submitImageToVideo(input) {
      const apiToken = readApiToken(options.apiToken);
      const image = await resolveAssetUrl(input.image, options.referenceImageUploader);
      const imageTail = await resolveAssetUrl(input.imageTail, options.referenceImageUploader);

      const requestBody: Record<string, unknown> = {
        model_name: modelName,
        mode,
        image,
        duration: isPositiveNumber(input.durationSeconds) ? input.durationSeconds : 5,
      };

      if (imageTail) {
        requestBody.image_tail = imageTail;
      }

      const promptText = input.promptText?.trim();
      if (promptText) {
        requestBody.prompt = promptText;
      }

      const sound = input.sound?.trim();
      if (sound) {
        requestBody.sound = sound;
      }

      if (typeof input.multiShot === "boolean" && shouldSendMultiShot(input.imageTail)) {
        requestBody.multi_shot = input.multiShot;
      }

      const multiPrompt = normalizeMultiPrompt(input.multiPrompt);
      if (multiPrompt.length > 0) {
        requestBody.multi_prompt = multiPrompt;
      }

      const negativePromptText = input.negativePromptText?.trim();
      if (negativePromptText) {
        requestBody.negative_prompt = negativePromptText;
      }

      if (isPositiveNumber(input.cfgScale)) {
        requestBody.cfg_scale = input.cfgScale;
      }

      const callbackUrl = input.callbackUrl?.trim();
      if (callbackUrl) {
        requestBody.callback_url = callbackUrl;
      }

      const externalTaskId = input.externalTaskId?.trim();
      if (externalTaskId) {
        requestBody.external_task_id = externalTaskId;
      }

      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "POST",
        path: "/kling/v1/videos/image2video",
        body: requestBody,
      });
      const taskId = readFirstString(payload, [
        ["data", "task_id"],
        ["data", "id"],
        ["task_id"],
        ["id"],
      ]);

      if (!taskId) {
        throw new Error("Kling video provider returned no task id");
      }

      return {
        taskId,
        status: readFirstString(payload, [
          ["data", "task_status"],
          ["data", "status"],
          ["task_status"],
          ["status"],
        ]),
        provider: "kling-video",
        modelName,
        mode,
        rawResponse: JSON.stringify(payload),
      };
    },

    async getImageToVideoTask(input) {
      const apiToken = readApiToken(options.apiToken);
      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "GET",
        path: `/kling/v1/videos/image2video/${encodeURIComponent(input.taskId)}`,
      });
      const status = readFirstString(payload, [
        ["data", "task_status"],
        ["data", "status"],
        ["task_status"],
        ["status"],
      ]);
      const normalizedStatus = status?.trim().toLowerCase() ?? null;
      const failed = normalizedStatus ? FAILURE_STATUSES.has(normalizedStatus) : false;
      const completed = normalizedStatus ? SUCCESS_STATUSES.has(normalizedStatus) : false;

      return {
        taskId:
          readFirstString(payload, [
            ["data", "task_id"],
            ["data", "id"],
            ["task_id"],
            ["id"],
          ]) ?? input.taskId,
        status,
        videoUrl: readFirstString(payload, [
          ["data", "task_result", "video_url"],
          ["data", "task_result", "video", "url"],
          ["data", "task_result", "videos", "0", "url"],
          ["data", "video_url"],
          ["data", "video", "url"],
          ["data", "videos", "0", "url"],
          ["video_url"],
          ["video", "url"],
          ["videos", "0", "url"],
        ]),
        errorMessage: readTaskErrorMessage(payload, failed),
        completed,
        failed,
        rawResponse: JSON.stringify(payload),
      };
    },

    async waitForImageToVideoTask(input) {
      const startedAt = Date.now();
      const timeoutMs = input.timeoutMs ?? 300_000;
      const pollIntervalMs = input.pollIntervalMs ?? 5_000;

      while (true) {
        const result = await this.getImageToVideoTask({
          taskId: input.taskId,
        });

        if (result.completed || result.failed) {
          return result;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          throw new Error(
            `Kling video provider polling timed out after ${timeoutMs}ms for task ${input.taskId}`,
          );
        }

        await delay(pollIntervalMs);
      }
    },
  };
}

export function createKlingStageVideoProvider(
  options: CreateKlingStageVideoProviderOptions = {},
): VideoProvider {
  const provider = createKlingVideoProvider({
    ...options,
    mode: options.mode?.trim() || DEFAULT_STAGE_MODE,
  });
  const durationSeconds = isPositiveNumber(options.durationSeconds)
    ? Number(options.durationSeconds)
    : DEFAULT_STAGE_DURATION_SECONDS;
  const sound = options.sound?.trim() || DEFAULT_STAGE_SOUND;
  const multiShot = typeof options.multiShot === "boolean" ? options.multiShot : true;
  const pollIntervalMs = options.pollIntervalMs;
  const pollTimeoutMs = options.pollTimeoutMs;

  return {
    async generateSegmentVideo(input) {
      const stagePromptText = buildStageMultiPromptText(input.promptText);
      const multiPrompt = [
        {
          index: 1,
          prompt: stagePromptText,
          duration: String(durationSeconds),
        },
      ];
      const submitted = await provider.submitImageToVideo({
        image: input.startFramePath,
        ...(input.endFramePath ? { imageTail: input.endFramePath } : {}),
        durationSeconds,
        sound,
        multiShot: input.frameDependency === "start_and_end_frame" ? multiShot : false,
        multiPrompt,
      });
      const completed = await provider.waitForImageToVideoTask({
        taskId: submitted.taskId,
        pollIntervalMs,
        timeoutMs: pollTimeoutMs,
      });

      if (completed.failed) {
        throw new Error(
          completed.errorMessage
            ? `Kling video generation failed: ${completed.errorMessage}`
            : `Kling video generation failed for task ${completed.taskId}`,
        );
      }

      if (!completed.videoUrl) {
        throw new Error(`Kling video generation completed without video url for task ${completed.taskId}`);
      }

      return {
        provider: submitted.provider,
        model: submitted.modelName,
        videoUrl: completed.videoUrl,
        thumbnailUrl: null,
        rawResponse: JSON.stringify({
          submit: JSON.parse(submitted.rawResponse),
          result: JSON.parse(completed.rawResponse),
        }),
        durationSec: durationSeconds,
      };
    },
  };
}

function buildStageMultiPromptText(promptText: string, maxLength = 512) {
  const normalizedPrompt = normalizeWhitespace(promptText);
  const looksLikePromptTemplate =
    promptText.includes("任务目标") ||
    promptText.includes("已知输入") ||
    promptText.includes("输出要求") ||
    promptText.includes("提示词编排器");

  if (!looksLikePromptTemplate && normalizedPrompt.length <= maxLength) {
    return normalizedPrompt;
  }

  const segmentSummary = extractPromptValue(promptText, "segment 摘要");
  const shotsSummary = compactShotsSummary(extractPromptValue(promptText, "shots 摘要") ?? "");
  const condensedPrompt = normalizeWhitespace(
    [
      "基于首尾帧生成连续稳定的多镜头片段，镜头衔接自然，保持主体身份、服装、空间和时间连续，动作推进贴合剧情，避免跳切、漂移和畸形。",
      segmentSummary ? `剧情：${segmentSummary}` : null,
      shotsSummary ? `分镜动作：${shotsSummary}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" "),
  );

  if (condensedPrompt.length <= maxLength) {
    return condensedPrompt;
  }

  return condensedPrompt.slice(0, maxLength).trim();
}

function readApiToken(apiToken: string | undefined) {
  const normalizedToken = apiToken?.trim();

  if (!normalizedToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for Kling video generation");
  }

  return normalizedToken;
}

async function resolveAssetUrl(
  value: string | null | undefined,
  referenceImageUploader: ReferenceImageUploader | undefined,
) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (isRemoteUrl(trimmedValue)) {
    return trimmedValue;
  }

  if (!referenceImageUploader) {
    throw new Error(
      "Reference image uploader is required when Kling video inputs use local file paths",
    );
  }

  return referenceImageUploader.uploadReferenceImage({
    localFilePath: trimmedValue,
  });
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//iu.test(value);
}

function isPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function requestJson(input: {
  apiToken: string;
  baseUrl: string;
  fetchFn: typeof fetch;
  timeoutMs?: number;
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
}) {
  const controller = input.timeoutMs ? new AbortController() : null;
  const timeout =
    input.timeoutMs && controller ? setTimeout(() => controller.abort(), input.timeoutMs) : null;

  try {
    const response = await input.fetchFn(`${input.baseUrl}${input.path}`, {
      method: input.method,
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        "Content-Type": "application/json",
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: controller?.signal,
    });

    if (!response.ok) {
      const responseBody = await safeReadResponseText(response);
      const requestId = response.headers.get("x-request-id");
      const details = [
        requestId ? `requestId=${requestId}` : null,
        responseBody ? `body=${truncateForError(responseBody)}` : null,
      ]
        .filter((value): value is string => value !== null)
        .join("; ");
      throw new Error(
        `Kling video provider request failed with status ${response.status}${details ? `; ${details}` : ""}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Kling video provider request timed out");
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function safeReadResponseText(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function truncateForError(value: string, maxLength = 500) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function readFirstString(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function readTaskErrorMessage(payload: unknown, failed: boolean) {
  const dedicatedError = readFirstString(payload, [
    ["data", "error_message"],
    ["data", "error", "message"],
    ["error_message"],
    ["error", "message"],
  ]);

  if (dedicatedError) {
    return dedicatedError;
  }

  if (!failed) {
    return null;
  }

  return readFirstString(payload, [["message"]]);
}

function normalizeMultiPrompt(value: KlingMultiPromptItem[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && Number.isInteger(item.index) && item.index > 0)
    .map((item) => ({
      index: item.index,
      prompt: item.prompt.trim(),
      duration: item.duration.trim(),
    }))
    .filter((item) => item.prompt.length > 0 && item.duration.length > 0);
}

function extractPromptValue(promptText: string, label: string) {
  const escapedLabel = escapeForRegExp(label);
  const match = promptText.match(
    new RegExp(`(?:^|\\n)\\s*-?\\s*${escapedLabel}\\s*[：:]\\s*(.+)`, "u"),
  );

  return match ? normalizeWhitespace(match[1]) : null;
}

function compactShotsSummary(value: string) {
  return normalizeWhitespace(
    value.replace(/\b[A-Za-z0-9_-]+\s*:\s*/gu, "").replace(/\s*;\s*/gu, "；"),
  );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function shouldSendMultiShot(imageTail: string | null | undefined) {
  // VectorEngine currently rejects multi_shot when a tail image is present.
  return typeof imageTail !== "string" || imageTail.trim().length === 0;
}

function readPath(value: unknown, path: string[]) {
  let current = value;

  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
