import { readFile } from "node:fs/promises";
import path from "node:path";

import type { VideoProvider } from "@sweet-star/core";

import { uploadWithPsda1 } from "../image-upload/providers/psda1-image-upload-provider";
import { buildProviderRequestError } from "./provider-request-error";

export interface CreateSeedanceVideoProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  modelName?: string;
  resolution?: string;
  ratio?: string;
  durationSeconds?: number;
  generateAudio?: boolean;
  returnLastFrame?: boolean;
  serviceTier?: string;
  executionExpiresAfterSec?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface SubmitSeedanceVideoGenerationTaskInput {
  promptText?: string | null;
  referenceImages?: string[] | null;
  referenceVideos?: string[] | null;
  referenceAudios?: string[] | null;
  draftTaskId?: string | null;
  callbackUrl?: string | null;
  resolution?: string | null;
  ratio?: string | null;
  durationSeconds?: number | null;
  generateAudio?: boolean | null;
  returnLastFrame?: boolean | null;
  serviceTier?: string | null;
  executionExpiresAfterSec?: number | null;
  safetyIdentifier?: string | null;
}

export interface SubmitSeedanceVideoGenerationTaskResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  rawResponse: string;
}

export interface GetSeedanceVideoGenerationTaskInput {
  taskId: string;
}

export interface GetSeedanceVideoGenerationTaskResult {
  taskId: string;
  status: string | null;
  videoUrl: string | null;
  lastFrameUrl: string | null;
  errorMessage: string | null;
  durationSec: number | null;
  generateAudio: boolean | null;
  completed: boolean;
  failed: boolean;
  rawResponse: string;
}

export interface WaitForSeedanceVideoGenerationTaskInput
  extends GetSeedanceVideoGenerationTaskInput {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface SeedanceVideoProvider {
  submitVideoGenerationTask(
    input: SubmitSeedanceVideoGenerationTaskInput,
  ): Promise<SubmitSeedanceVideoGenerationTaskResult> | SubmitSeedanceVideoGenerationTaskResult;
  getVideoGenerationTask(
    input: GetSeedanceVideoGenerationTaskInput,
  ): Promise<GetSeedanceVideoGenerationTaskResult> | GetSeedanceVideoGenerationTaskResult;
  waitForVideoGenerationTask(
    input: WaitForSeedanceVideoGenerationTaskInput,
  ): Promise<GetSeedanceVideoGenerationTaskResult> | GetSeedanceVideoGenerationTaskResult;
}

export interface CreateSeedanceStageVideoProviderOptions
  extends CreateSeedanceVideoProviderOptions {
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com";
const DEFAULT_MODEL_NAME = "doubao-seedance-2-0-260128";
const DEFAULT_DURATION_SECONDS = 5;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_TIMEOUT_MS = 7_200_000;
const SUCCESS_STATUSES = new Set(["succeeded"]);
const FAILURE_STATUSES = new Set(["failed", "expired", "cancelled", "canceled"]);

export function createSeedanceVideoProvider(
  options: CreateSeedanceVideoProviderOptions = {},
): SeedanceVideoProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelName = options.modelName?.trim() || DEFAULT_MODEL_NAME;
  const defaultDurationSeconds = isPositiveInteger(options.durationSeconds)
    ? options.durationSeconds
    : DEFAULT_DURATION_SECONDS;
  const requestTimeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async submitVideoGenerationTask(input) {
      const apiToken = readApiToken(options.apiToken);
      const requestBody: Record<string, unknown> = {
        model: modelName,
        content: await buildContent(input, fetchFn),
      };

      const durationSeconds = isPositiveInteger(input.durationSeconds)
        ? input.durationSeconds
        : defaultDurationSeconds;
      requestBody.duration = durationSeconds;

      const resolution = input.resolution?.trim() || options.resolution?.trim();
      if (resolution) {
        requestBody.resolution = resolution;
      }

      const ratio = input.ratio?.trim() || options.ratio?.trim();
      if (ratio) {
        requestBody.ratio = ratio;
      }

      const generateAudio =
        typeof input.generateAudio === "boolean" ? input.generateAudio : options.generateAudio;
      if (typeof generateAudio === "boolean") {
        requestBody.generate_audio = generateAudio;
      }

      const returnLastFrame =
        typeof input.returnLastFrame === "boolean"
          ? input.returnLastFrame
          : options.returnLastFrame;
      if (typeof returnLastFrame === "boolean") {
        requestBody.return_last_frame = returnLastFrame;
      }

      const callbackUrl = input.callbackUrl?.trim();
      if (callbackUrl) {
        requestBody.callback_url = callbackUrl;
      }

      const serviceTier = input.serviceTier?.trim() || options.serviceTier?.trim();
      if (serviceTier) {
        requestBody.service_tier = serviceTier;
      }

      const executionExpiresAfterSec = isPositiveInteger(input.executionExpiresAfterSec)
        ? input.executionExpiresAfterSec
        : isPositiveInteger(options.executionExpiresAfterSec)
          ? options.executionExpiresAfterSec
          : null;
      if (executionExpiresAfterSec) {
        requestBody.execution_expires_after = executionExpiresAfterSec;
      }

      const safetyIdentifier = input.safetyIdentifier?.trim();
      if (safetyIdentifier) {
        requestBody.safety_identifier = safetyIdentifier;
      }

      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: requestTimeoutMs,
        method: "POST",
        path: "/api/v3/contents/generations/tasks",
        body: requestBody,
      });
      const taskId = readFirstString(payload, [["id"], ["data", "id"]]);

      if (!taskId) {
        throw new Error("Seedance video provider returned no task id");
      }

      return {
        taskId,
        status: readFirstString(payload, [["status"], ["data", "status"]]),
        provider: "seedance-video",
        modelName,
        rawResponse: JSON.stringify(payload),
      };
    },

    async getVideoGenerationTask(input) {
      const apiToken = readApiToken(options.apiToken);
      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: requestTimeoutMs,
        method: "GET",
        path: `/api/v3/contents/generations/tasks/${encodeURIComponent(input.taskId)}`,
      });
      const status = readFirstString(payload, [["status"], ["data", "status"]]);
      const normalizedStatus = status?.trim().toLowerCase() ?? null;
      const failed = normalizedStatus ? FAILURE_STATUSES.has(normalizedStatus) : false;
      const completed = normalizedStatus ? SUCCESS_STATUSES.has(normalizedStatus) : false;

      return {
        taskId: readFirstString(payload, [["id"], ["data", "id"]]) ?? input.taskId,
        status,
        videoUrl: readFirstString(payload, [["content", "video_url"], ["data", "content", "video_url"]]),
        lastFrameUrl: readFirstString(payload, [
          ["content", "last_frame_url"],
          ["data", "content", "last_frame_url"],
        ]),
        errorMessage: readTaskErrorMessage(payload, failed),
        durationSec: readFirstInteger(payload, [["duration"], ["data", "duration"]]),
        generateAudio: readFirstBoolean(payload, [["generate_audio"], ["data", "generate_audio"]]),
        completed,
        failed,
        rawResponse: JSON.stringify(payload),
      };
    },

    async waitForVideoGenerationTask(input) {
      const startedAt = Date.now();
      const timeoutMs = input.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
      const pollIntervalMs = input.pollIntervalMs ?? 5_000;

      while (true) {
        const result = await this.getVideoGenerationTask({
          taskId: input.taskId,
        });

        if (result.completed || result.failed) {
          return result;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          throw new Error(
            `Seedance video provider polling timed out after ${timeoutMs}ms for task ${input.taskId}`,
          );
        }

        await delay(pollIntervalMs);
      }
    },
  };
}

export function createSeedanceStageVideoProvider(
  options: CreateSeedanceStageVideoProviderOptions = {},
): VideoProvider {
  const provider = createSeedanceVideoProvider(options);

  return {
    async generateSegmentVideo(input) {
      const submitted = await provider.submitVideoGenerationTask({
        promptText: input.promptText,
        referenceImages: [input.startFramePath],
        durationSeconds: input.durationSec ?? options.durationSeconds ?? DEFAULT_DURATION_SECONDS,
        generateAudio: options.generateAudio,
        returnLastFrame: options.returnLastFrame,
      });
      const completed = await provider.waitForVideoGenerationTask({
        taskId: submitted.taskId,
        pollIntervalMs: options.pollIntervalMs,
        timeoutMs: options.pollTimeoutMs,
      });

      if (completed.failed) {
        throw new Error(
          completed.errorMessage
            ? `Seedance video generation failed: ${completed.errorMessage}`
            : `Seedance video generation failed for task ${completed.taskId}`,
        );
      }

      if (!completed.videoUrl) {
        throw new Error(
          `Seedance video generation completed without video url for task ${completed.taskId}`,
        );
      }

      return {
        provider: submitted.provider,
        model: submitted.modelName,
        videoUrl: completed.videoUrl,
        thumbnailUrl: completed.lastFrameUrl,
        rawResponse: JSON.stringify({
          submit: JSON.parse(submitted.rawResponse),
          result: JSON.parse(completed.rawResponse),
        }),
        durationSec: completed.durationSec ?? input.durationSec ?? options.durationSeconds ?? null,
      };
    },
  };
}

async function buildContent(
  input: SubmitSeedanceVideoGenerationTaskInput,
  fetchFn: typeof fetch,
) {
  const content: Array<Record<string, unknown>> = [];
  const promptText = input.promptText?.trim();

  if (promptText) {
    content.push({
      type: "text",
      text: promptText,
    });
  }

  const referenceImages = normalizeStringArray(input.referenceImages);
  const referenceVideos = normalizeStringArray(input.referenceVideos);
  const referenceAudios = normalizeStringArray(input.referenceAudios);
  const draftTaskId = input.draftTaskId?.trim();

  if (referenceAudios.length > 0 && referenceImages.length === 0 && referenceVideos.length === 0) {
    throw new Error(
      "Seedance video provider requires at least one reference image or video when audio references are provided",
    );
  }

  for (const referenceImage of referenceImages) {
    content.push({
      type: "image_url",
      role: "reference_image",
      image_url: {
        url: await resolveSeedanceAsset(referenceImage, "image", fetchFn),
      },
    });
  }

  for (const referenceVideo of referenceVideos) {
    content.push({
      type: "video_url",
      role: "reference_video",
      video_url: {
        url: await resolveSeedanceAsset(referenceVideo, "video", fetchFn),
      },
    });
  }

  for (const referenceAudio of referenceAudios) {
    content.push({
      type: "audio_url",
      role: "reference_audio",
      audio_url: {
        url: await resolveSeedanceAsset(referenceAudio, "audio", fetchFn),
      },
    });
  }

  if (draftTaskId) {
    content.push({
      type: "draft_task",
      draft_task: {
        id: draftTaskId,
      },
    });
  }

  if (content.length === 0) {
    throw new Error("Seedance video provider requires promptText, reference assets, or draftTaskId");
  }

  return content;
}

async function resolveSeedanceAsset(
  value: string,
  mediaType: "image" | "audio" | "video",
  fetchFn: typeof fetch,
) {
  const trimmedValue = value.trim();

  if (isRemoteUrl(trimmedValue) || isAssetUrl(trimmedValue) || isDataUrl(trimmedValue)) {
    return trimmedValue;
  }

  if (mediaType === "video") {
    const fileBytes = await readFile(trimmedValue);
    return uploadWithPsda1({
      fileName: path.basename(trimmedValue),
      fileBytes,
      fetchFn,
    });
  }

  const fileBytes = await readFile(trimmedValue);
  const mimeType = resolveMimeType(trimmedValue, mediaType);
  return `data:${mimeType};base64,${Buffer.from(fileBytes).toString("base64")}`;
}

function resolveMimeType(filePath: string, mediaType: "image" | "audio" | "video") {
  const extension = path.extname(filePath).toLowerCase();

  if (mediaType === "image") {
    switch (extension) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".bmp":
        return "image/bmp";
      case ".tif":
      case ".tiff":
        return "image/tiff";
      case ".gif":
        return "image/gif";
      case ".heic":
        return "image/heic";
      case ".heif":
        return "image/heif";
      default:
        throw new Error(`Unsupported local Seedance image format: ${extension || filePath}`);
    }
  }

  if (mediaType === "audio") {
    switch (extension) {
      case ".mp3":
        return "audio/mp3";
      case ".wav":
        return "audio/wav";
      default:
        throw new Error(`Unsupported local Seedance audio format: ${extension || filePath}`);
    }
  }

  switch (extension) {
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    default:
      throw new Error(`Unsupported local Seedance video format: ${extension || filePath}`);
  }
}

function normalizeStringArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function readApiToken(apiToken: string | undefined) {
  const normalizedToken = apiToken?.trim();

  if (!normalizedToken) {
    throw new Error("SEEDANCE_API_TOKEN is required for Seedance video generation");
  }

  return normalizedToken;
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//iu.test(value);
}

function isAssetUrl(value: string) {
  return /^asset:\/\//iu.test(value);
}

function isDataUrl(value: string) {
  return /^data:/iu.test(value);
}

function isPositiveInteger(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
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
      const bodyText = await safeReadResponseText(response);
      throw buildProviderRequestError("Seedance video", response.status, bodyText);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Seedance video provider request timed out");
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

function readFirstString(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function readFirstInteger(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (typeof candidate === "number" && Number.isInteger(candidate)) {
      return candidate;
    }
  }

  return null;
}

function readFirstBoolean(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return null;
}

function readTaskErrorMessage(payload: unknown, failed: boolean) {
  if (!failed) {
    return null;
  }

  return readFirstString(payload, [
    ["error", "message"],
    ["message"],
    ["data", "error", "message"],
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
