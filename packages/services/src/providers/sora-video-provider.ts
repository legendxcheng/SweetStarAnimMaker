import type { VideoProvider } from "@sweet-star/core";
import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";

export interface CreateSoraVideoProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  modelName?: string;
  orientation?: string;
  size?: string;
  durationSeconds?: number;
  timeoutMs?: number;
  referenceImageUploader?: ReferenceImageUploader;
  fetchFn?: typeof fetch;
}

export interface SubmitSoraImageToVideoInput {
  image: string;
  imageTail: string;
  promptText: string;
  orientation?: string | null;
  size?: string | null;
  durationSeconds?: number | null;
  watermark?: boolean | null;
  private?: boolean | null;
}

export interface SubmitSoraImageToVideoResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  rawResponse: string;
}

export interface GetSoraImageToVideoTaskInput {
  taskId: string;
}

export interface GetSoraImageToVideoTaskResult {
  taskId: string;
  status: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  enhancedPrompt: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
  rawResponse: string;
}

export interface WaitForSoraImageToVideoTaskInput extends GetSoraImageToVideoTaskInput {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface SoraVideoProvider {
  submitImageToVideo(
    input: SubmitSoraImageToVideoInput,
  ): Promise<SubmitSoraImageToVideoResult> | SubmitSoraImageToVideoResult;
  getImageToVideoTask(
    input: GetSoraImageToVideoTaskInput,
  ): Promise<GetSoraImageToVideoTaskResult> | GetSoraImageToVideoTaskResult;
  waitForImageToVideoTask(
    input: WaitForSoraImageToVideoTaskInput,
  ): Promise<GetSoraImageToVideoTaskResult> | GetSoraImageToVideoTaskResult;
}

export interface CreateSoraStageVideoProviderOptions extends CreateSoraVideoProviderOptions {}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL_NAME = "sora-2-all";
const DEFAULT_ORIENTATION = "landscape";
const DEFAULT_SIZE = "large";
const DEFAULT_DURATION_SECONDS = 15;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_TIMEOUT_MS = 7_200_000;
const SUCCESS_STATUSES = new Set(["succeed", "succeeded", "success", "completed", "done"]);
const FAILURE_STATUSES = new Set(["failed", "fail", "error", "canceled", "cancelled", "rejected"]);

export function createSoraVideoProvider(
  options: CreateSoraVideoProviderOptions = {},
): SoraVideoProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelName = options.modelName?.trim() || DEFAULT_MODEL_NAME;
  const defaultOrientation = options.orientation?.trim() || DEFAULT_ORIENTATION;
  const defaultSize = options.size?.trim() || DEFAULT_SIZE;
  const defaultDurationSeconds = isPositiveNumber(options.durationSeconds)
    ? options.durationSeconds
    : DEFAULT_DURATION_SECONDS;
  const requestTimeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async submitImageToVideo(input) {
      const apiToken = readApiToken(options.apiToken);
      const image = await resolveAssetUrl(input.image, options.referenceImageUploader);
      const imageTail = await resolveAssetUrl(input.imageTail, options.referenceImageUploader);
      const promptText = input.promptText.trim();

      if (!promptText) {
        throw new Error("Sora video provider requires promptText");
      }

      const requestBody: Record<string, unknown> = {
        images: [image, imageTail],
        model: modelName,
        orientation: input.orientation?.trim() || defaultOrientation,
        prompt: promptText,
        size: input.size?.trim() || defaultSize,
        duration: isPositiveNumber(input.durationSeconds)
          ? input.durationSeconds
          : defaultDurationSeconds,
      };

      if (typeof input.watermark === "boolean") {
        requestBody.watermark = input.watermark;
      }

      if (typeof input.private === "boolean") {
        requestBody.private = input.private;
      }

      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: requestTimeoutMs,
        method: "POST",
        path: "/v1/video/create",
        body: requestBody,
      });
      const taskId = readFirstString(payload, [["id"], ["data", "id"]]);

      if (!taskId) {
        throw new Error("Sora video provider returned no task id");
      }

      return {
        taskId,
        status: readFirstString(payload, [["status"], ["data", "status"]]),
        provider: "sora-video",
        modelName,
        rawResponse: JSON.stringify(payload),
      };
    },

    async getImageToVideoTask(input) {
      const apiToken = readApiToken(options.apiToken);
      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: requestTimeoutMs,
        method: "GET",
        path: `/v1/video/query?id=${encodeURIComponent(input.taskId)}`,
      });
      const status = readFirstString(payload, [["status"], ["data", "status"]]);
      const normalizedStatus = status?.trim().toLowerCase() ?? null;
      const failed = normalizedStatus ? FAILURE_STATUSES.has(normalizedStatus) : false;
      const completed = normalizedStatus ? SUCCESS_STATUSES.has(normalizedStatus) : false;

      return {
        taskId: readFirstString(payload, [["id"], ["data", "id"]]) ?? input.taskId,
        status,
        videoUrl: readFirstString(payload, [["video_url"], ["data", "video_url"]]),
        thumbnailUrl: readFirstString(payload, [["thumbnail_url"], ["data", "thumbnail_url"]]),
        enhancedPrompt: readFirstString(payload, [["enhanced_prompt"], ["data", "enhanced_prompt"]]),
        errorMessage: readTaskErrorMessage(payload, failed),
        completed,
        failed,
        rawResponse: JSON.stringify(payload),
      };
    },

    async waitForImageToVideoTask(input) {
      const startedAt = Date.now();
      const timeoutMs = input.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
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
            `Sora video provider polling timed out after ${timeoutMs}ms for task ${input.taskId}`,
          );
        }

        await delay(pollIntervalMs);
      }
    },
  };
}

export function createSoraStageVideoProvider(
  options: CreateSoraStageVideoProviderOptions = {},
): VideoProvider {
  const provider = createSoraVideoProvider(options);

  return {
    async generateSegmentVideo(input) {
      const submitted = await provider.submitImageToVideo({
        image: input.startFramePath,
        imageTail: input.endFramePath,
        promptText: input.promptText,
        durationSeconds: input.durationSec ?? undefined,
      });
      const completed = await provider.waitForImageToVideoTask({
        taskId: submitted.taskId,
      });

      if (completed.failed) {
        throw new Error(
          completed.errorMessage
            ? `Sora video generation failed: ${completed.errorMessage}`
            : `Sora video generation failed for task ${completed.taskId}`,
        );
      }

      if (!completed.videoUrl) {
        throw new Error(`Sora video generation completed without video url for task ${completed.taskId}`);
      }

      return {
        provider: submitted.provider,
        model: submitted.modelName,
        videoUrl: completed.videoUrl,
        thumbnailUrl: completed.thumbnailUrl,
        rawResponse: JSON.stringify({
          submit: JSON.parse(submitted.rawResponse),
          result: JSON.parse(completed.rawResponse),
        }),
        durationSec: input.durationSec ?? null,
      };
    },
  };
}

function readApiToken(apiToken: string | undefined) {
  const normalizedToken = apiToken?.trim();

  if (!normalizedToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for Sora video generation");
  }

  return normalizedToken;
}

async function resolveAssetUrl(
  value: string,
  referenceImageUploader: ReferenceImageUploader | undefined,
) {
  const trimmedValue = value.trim();

  if (isRemoteUrl(trimmedValue)) {
    return trimmedValue;
  }

  if (!referenceImageUploader) {
    throw new Error(
      "Reference image uploader is required when Sora video inputs use local file paths",
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
        `Sora video provider request failed with status ${response.status}${details ? `; ${details}` : ""}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Sora video provider request timed out");
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
    ["error"],
    ["message"],
    ["data", "error"],
    ["data", "message"],
  ]);

  if (!failed) {
    return null;
  }

  return dedicatedError;
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
