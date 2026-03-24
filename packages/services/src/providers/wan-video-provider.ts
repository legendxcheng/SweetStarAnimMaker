import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";

export interface CreateWanVideoProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  modelName?: string;
  resolution?: string;
  promptExtend?: boolean;
  audio?: boolean;
  timeoutMs?: number;
  referenceImageUploader?: ReferenceImageUploader;
  fetchFn?: typeof fetch;
}

export interface SubmitWanImageToVideoInput {
  image: string;
  promptText: string;
  resolution?: string | null;
  promptExtend?: boolean | null;
  audio?: boolean | null;
}

export interface SubmitWanImageToVideoResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  rawResponse: string;
}

export interface GetWanImageToVideoTaskInput {
  taskId: string;
}

export interface GetWanImageToVideoTaskResult {
  taskId: string;
  status: string | null;
  videoUrl: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
  rawResponse: string;
}

export interface WaitForWanImageToVideoTaskInput extends GetWanImageToVideoTaskInput {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface WanVideoProvider {
  submitImageToVideo(
    input: SubmitWanImageToVideoInput,
  ): Promise<SubmitWanImageToVideoResult> | SubmitWanImageToVideoResult;
  getImageToVideoTask(
    input: GetWanImageToVideoTaskInput,
  ): Promise<GetWanImageToVideoTaskResult> | GetWanImageToVideoTaskResult;
  waitForImageToVideoTask(
    input: WaitForWanImageToVideoTaskInput,
  ): Promise<GetWanImageToVideoTaskResult> | GetWanImageToVideoTaskResult;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL_NAME = "wan2.6-i2v";
const SUCCESS_STATUSES = new Set(["succeed", "succeeded", "success", "completed", "done"]);
const FAILURE_STATUSES = new Set(["failed", "fail", "error", "canceled", "cancelled", "rejected"]);

export function createWanVideoProvider(
  options: CreateWanVideoProviderOptions = {},
): WanVideoProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelName = options.modelName?.trim() || DEFAULT_MODEL_NAME;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async submitImageToVideo(input) {
      const apiToken = readApiToken(options.apiToken);
      const image = await resolveAssetUrl(input.image, options.referenceImageUploader);
      const promptText = input.promptText.trim();

      if (!promptText) {
        throw new Error("Wan video provider requires promptText");
      }

      const requestBody: Record<string, unknown> = {
        model: modelName,
        input: {
          prompt: promptText,
          img_url: image,
        },
      };

      const parameters: Record<string, unknown> = {};
      const resolution = input.resolution?.trim() || options.resolution?.trim();

      if (resolution) {
        parameters.resolution = resolution;
      }

      const promptExtend =
        typeof input.promptExtend === "boolean" ? input.promptExtend : options.promptExtend;
      if (typeof promptExtend === "boolean") {
        parameters.prompt_extend = promptExtend;
      }

      const audio = typeof input.audio === "boolean" ? input.audio : options.audio;
      if (typeof audio === "boolean") {
        parameters.audio = audio;
      }

      if (Object.keys(parameters).length > 0) {
        requestBody.parameters = parameters;
      }

      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "POST",
        path: "/alibailian/api/v1/services/aigc/video-generation/video-synthesis",
        body: requestBody,
      });
      const taskId = readFirstString(payload, [
        ["output", "task_id"],
        ["task_id"],
        ["data", "task_id"],
      ]);

      if (!taskId) {
        throw new Error("Wan video provider returned no task id");
      }

      return {
        taskId,
        status: readFirstString(payload, [
          ["output", "task_status"],
          ["status"],
          ["data", "status"],
        ]),
        provider: "wan-video",
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
        timeoutMs: options.timeoutMs,
        method: "GET",
        path: `/alibailian/api/v1/tasks/${encodeURIComponent(input.taskId)}`,
      });
      const status = readFirstString(payload, [
        ["output", "task_status"],
        ["status"],
        ["data", "status"],
      ]);
      const normalizedStatus = status?.trim().toLowerCase() ?? null;
      const failed = normalizedStatus ? FAILURE_STATUSES.has(normalizedStatus) : false;
      const completed = normalizedStatus ? SUCCESS_STATUSES.has(normalizedStatus) : false;

      return {
        taskId:
          readFirstString(payload, [
            ["output", "task_id"],
            ["task_id"],
            ["data", "task_id"],
          ]) ?? input.taskId,
        status,
        videoUrl: readFirstString(payload, [
          ["output", "video_url"],
          ["output", "video", "url"],
          ["output", "video_url_list", "0"],
          ["video_url"],
          ["data", "video_url"],
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
            `Wan video provider polling timed out after ${timeoutMs}ms for task ${input.taskId}`,
          );
        }

        await delay(pollIntervalMs);
      }
    },
  };
}

function readApiToken(apiToken: string | undefined) {
  const normalizedToken = apiToken?.trim();

  if (!normalizedToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for Wan video generation");
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
    throw new Error("Reference image uploader is required when Wan video inputs use local file paths");
  }

  return referenceImageUploader.uploadReferenceImage({
    localFilePath: trimmedValue,
  });
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//iu.test(value);
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
      const requestId =
        response.headers.get("x-request-id") ?? response.headers.get("x-req-id") ?? null;
      const details = [
        requestId ? `requestId=${requestId}` : null,
        responseBody ? `body=${truncateForError(responseBody)}` : null,
      ]
        .filter((value): value is string => value !== null)
        .join("; ");
      throw new Error(
        `Wan video provider request failed with status ${response.status}${details ? `; ${details}` : ""}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Wan video provider request timed out");
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
  if (!failed) {
    return null;
  }

  return readFirstString(payload, [
    ["output", "message"],
    ["output", "error_message"],
    ["message"],
    ["error", "message"],
    ["data", "message"],
  ]);
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
