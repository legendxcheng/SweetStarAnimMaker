import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import type { VideoProvider } from "@sweet-star/core";

import { uploadWithPsda1 } from "../image-upload/providers/psda1-image-upload-provider";
import { buildProviderRequestError } from "./provider-request-error";
import type {
  CreateSeedanceStageVideoProviderOptions,
  CreateSeedanceVideoProviderOptions,
  GetSeedanceVideoGenerationTaskInput,
  GetSeedanceVideoGenerationTaskResult,
  SeedanceReferenceImageInput,
  SeedanceStageGenerationAudit,
  SeedanceStageSubmitAttemptAudit,
  SeedanceVideoProvider,
  SeedanceSubmitRequestAudit,
  SubmitSeedanceVideoGenerationTaskInput,
  SubmitSeedanceVideoGenerationTaskResult,
  WaitForSeedanceVideoGenerationTaskInput,
} from "./seedance-video-provider.types";

export type {
  CreateSeedanceStageVideoProviderOptions,
  CreateSeedanceVideoProviderOptions,
  GetSeedanceVideoGenerationTaskInput,
  GetSeedanceVideoGenerationTaskResult,
  SeedanceVideoProvider,
  SubmitSeedanceVideoGenerationTaskInput,
  SubmitSeedanceVideoGenerationTaskResult,
  WaitForSeedanceVideoGenerationTaskInput,
} from "./seedance-video-provider.types";

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com";
const DEFAULT_MODEL_NAME = "doubao-seedance-2-0-260128";
const DEFAULT_DURATION_SECONDS = 5;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_TIMEOUT_MS = 7_200_000;
const SUCCESS_STATUSES = new Set(["succeeded"]);
const FAILURE_STATUSES = new Set(["failed", "expired", "cancelled", "canceled"]);

class SeedanceSubmitError extends Error {
  constructor(
    message: string,
    public readonly requestAudit: SeedanceSubmitRequestAudit,
  ) {
    super(message);
    this.name = "SeedanceSubmitError";
  }
}

export function createSeedanceVideoProvider(
  options: CreateSeedanceVideoProviderOptions = {},
): SeedanceVideoProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelName = options.modelName?.trim() || DEFAULT_MODEL_NAME;
  const defaultDurationSeconds: number =
    typeof options.durationSeconds === "number" && isPositiveInteger(options.durationSeconds)
      ? options.durationSeconds
      : DEFAULT_DURATION_SECONDS;
  const requestTimeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async submitVideoGenerationTask(input) {
      const apiToken = readApiToken(options.apiToken);
      const requestBody: Record<string, unknown> = {
        model: modelName,
        content: [],
      };
      const contentResult = await buildContent(input, fetchFn);
      requestBody.content = contentResult.content;

      const durationSeconds =
        typeof input.durationSeconds === "number" && isPositiveInteger(input.durationSeconds)
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

      const requestAudit: SeedanceSubmitRequestAudit = {
        model: modelName,
        duration: durationSeconds,
        promptText: contentResult.audit.promptText,
        content: contentResult.audit.content,
        referenceImages: contentResult.audit.referenceImages,
        referenceAudioCount: contentResult.audit.referenceAudioCount,
        referenceVideoCount: contentResult.audit.referenceVideoCount,
        hasDraftTask: contentResult.audit.hasDraftTask,
        ...(resolution ? { resolution } : {}),
        ...(ratio ? { ratio } : {}),
        ...(typeof generateAudio === "boolean" ? { generateAudio } : {}),
        ...(typeof returnLastFrame === "boolean" ? { returnLastFrame } : {}),
        ...(serviceTier ? { serviceTier } : {}),
        ...(executionExpiresAfterSec ? { executionExpiresAfterSec } : {}),
        ...(safetyIdentifier ? { safetyIdentifier } : {}),
      };

      let payload: unknown;
      try {
        payload = await requestJson({
          apiToken,
          baseUrl,
          fetchFn,
          timeoutMs: requestTimeoutMs,
          method: "POST",
          path: "/api/v3/contents/generations/tasks",
          body: requestBody,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new SeedanceSubmitError(message, requestAudit);
      }
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
        requestAudit,
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
      const referenceImages =
        input.referenceImages && input.referenceImages.length > 0
          ? normalizeSeedanceReferenceImages(
              input.referenceImages.sort((left, right) => left.order - right.order).map((reference) => ({
                assetPath: reference.assetPath,
                role: "reference_image" as const,
                label: reference.label,
                semanticRole: reference.frameRole,
              })),
            )
          : input.startFramePath
            ? [
                {
                  assetPath: input.startFramePath,
                  role: "first_frame" as const,
                  semanticRole: "first_frame" as const,
                },
              ]
            : [];
      const referenceAudios = (input.referenceAudios ?? [])
        .sort((left, right) => left.order - right.order)
        .map((reference) => reference.assetPath);
      const submitInputBase = {
        promptText: input.promptText,
        referenceAudios,
        durationSeconds: input.durationSec ?? options.durationSeconds ?? DEFAULT_DURATION_SECONDS,
        ratio: input.aspectRatio ?? options.ratio,
        generateAudio: options.generateAudio,
        returnLastFrame: options.returnLastFrame,
      } satisfies Omit<SubmitSeedanceVideoGenerationTaskInput, "referenceImages">;
      const submitResult = await submitSeedanceStageTask({
        provider,
        referenceImages,
        submitInputBase,
      });
      const submitted = submitResult.submitted;
      console.info("[video-generate] seedance submitted", {
        taskId: submitted.taskId,
        status: submitted.status,
        model: submitted.modelName,
        referenceImageCount: referenceImages.length,
        referenceAudioCount: referenceAudios.length,
        rawResponseLength: submitted.rawResponse.length,
      });
      const completed = await provider.waitForVideoGenerationTask({
        taskId: submitted.taskId,
        pollIntervalMs: options.pollIntervalMs,
        timeoutMs: options.pollTimeoutMs,
      });
      console.info("[video-generate] seedance completed", {
        taskId: completed.taskId,
        status: completed.status,
        completed: completed.completed,
        failed: completed.failed,
        hasVideoUrl: Boolean(completed.videoUrl),
        hasLastFrameUrl: Boolean(completed.lastFrameUrl),
        durationSec: completed.durationSec,
        generateAudio: completed.generateAudio,
        rawResponseLength: completed.rawResponse.length,
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
          seedanceAudit: submitResult.audit,
        }),
        durationSec: completed.durationSec ?? input.durationSec ?? options.durationSeconds ?? null,
      };
    },
  };
}

async function submitSeedanceStageTask(input: {
  provider: SeedanceVideoProvider;
  referenceImages: SeedanceReferenceImageInput[];
  submitInputBase: Omit<SubmitSeedanceVideoGenerationTaskInput, "referenceImages">;
}) {
  const submitted = await input.provider.submitVideoGenerationTask({
    ...input.submitInputBase,
    referenceImages: input.referenceImages,
  });

  return buildStageSubmitResult(submitted, [
    buildSubmittedAttemptAudit({
      attempt: 1,
      strategy: "all_reference_images",
      submitted,
    }),
  ]);
}

async function buildContent(
  input: SubmitSeedanceVideoGenerationTaskInput,
  fetchFn: typeof fetch,
) {
  const content: Array<Record<string, unknown>> = [];
  const auditContent: SeedanceSubmitRequestAudit["content"] = [];
  const auditReferenceImages: SeedanceSubmitRequestAudit["referenceImages"] = [];
  const referenceImages = normalizeSeedanceReferenceImages(input.referenceImages);
  const promptText = buildPromptTextWithReferenceImageAliases(
    input.promptText,
    referenceImages,
  );

  if (promptText) {
    content.push({
      type: "text",
      text: promptText,
    });
    auditContent.push({
      type: "text",
    });
  }

  const referenceVideos = normalizeStringArray(input.referenceVideos);
  const referenceAudios = normalizeStringArray(input.referenceAudios);
  const draftTaskId = input.draftTaskId?.trim();

  if (referenceAudios.length > 0 && referenceImages.length === 0 && referenceVideos.length === 0) {
    throw new Error(
      "Seedance video provider requires at least one reference image or video when audio references are provided",
    );
  }

  for (const [index, referenceImage] of referenceImages.entries()) {
    const resolvedAsset = await resolveSeedanceAsset(referenceImage.assetPath, "image", fetchFn);
    content.push({
      type: "image_url",
      role: referenceImage.role,
      image_url: {
        url: resolvedAsset.url,
      },
    });
    const alias = `图片${index + 1}`;
    const label = referenceImage.label?.trim() || inferReferenceImageAlias(referenceImage.assetPath);
    auditContent.push({
      type: "image_url",
      role: referenceImage.role,
      alias,
      label,
      semanticRole: referenceImage.semanticRole ?? null,
    });
    auditReferenceImages.push({
      alias,
      label,
      role: referenceImage.role,
      semanticRole: referenceImage.semanticRole ?? null,
      assetPath: referenceImage.assetPath,
      resolvedAsset: resolvedAsset.audit,
    });
  }

  for (const referenceVideo of referenceVideos) {
    const resolvedAsset = await resolveSeedanceAsset(referenceVideo, "video", fetchFn);
    content.push({
      type: "video_url",
      role: "reference_video",
      video_url: {
        url: resolvedAsset.url,
      },
    });
    auditContent.push({
      type: "video_url",
      role: "reference_video",
    });
  }

  for (const referenceAudio of referenceAudios) {
    const resolvedAsset = await resolveSeedanceAsset(referenceAudio, "audio", fetchFn);
    content.push({
      type: "audio_url",
      role: "reference_audio",
      audio_url: {
        url: resolvedAsset.url,
      },
    });
    auditContent.push({
      type: "audio_url",
      role: "reference_audio",
    });
  }

  if (draftTaskId) {
    content.push({
      type: "draft_task",
      draft_task: {
        id: draftTaskId,
      },
    });
    auditContent.push({
      type: "draft_task",
    });
  }

  if (content.length === 0) {
    throw new Error("Seedance video provider requires promptText, reference assets, or draftTaskId");
  }

  return {
    content,
    audit: {
      model: "",
      duration: 0,
      promptText,
      content: auditContent,
      referenceImages: auditReferenceImages,
      referenceAudioCount: referenceAudios.length,
      referenceVideoCount: referenceVideos.length,
      hasDraftTask: Boolean(draftTaskId),
    } satisfies SeedanceSubmitRequestAudit,
  };
}

async function resolveSeedanceAsset(
  value: string,
  mediaType: "image" | "audio" | "video",
  fetchFn: typeof fetch,
) {
  const trimmedValue = value.trim();

  if (isRemoteUrl(trimmedValue) || isAssetUrl(trimmedValue) || isDataUrl(trimmedValue)) {
    return {
      url: trimmedValue,
      audit: {
        kind: (isRemoteUrl(trimmedValue)
          ? "remote_url"
          : isAssetUrl(trimmedValue)
            ? "asset_url"
            : "data_url") as "remote_url" | "asset_url" | "data_url",
        urlPrefix: truncateAuditUrl(trimmedValue),
      },
    };
  }

  if (mediaType === "video") {
    const fileBytes = await readFile(trimmedValue);
    const uploadedUrl = await uploadWithPsda1({
      fileName: path.basename(trimmedValue),
      fileBytes,
      fetchFn,
    });
    return {
      url: uploadedUrl,
      audit: buildLocalFileAssetAudit(trimmedValue, fileBytes, mediaType),
    };
  }

  const fileBytes = await readFile(trimmedValue);
  const mimeType = resolveMimeType(trimmedValue, mediaType);
  return {
    url: `data:${mimeType};base64,${Buffer.from(fileBytes).toString("base64")}`,
    audit: buildLocalFileAssetAudit(trimmedValue, fileBytes, mediaType),
  };
}

function buildLocalFileAssetAudit(
  filePath: string,
  fileBytes: Buffer,
  mediaType: "image" | "audio" | "video",
) {
  return {
    kind: "local_file" as const,
    mimeType: resolveMimeType(filePath, mediaType),
    byteLength: fileBytes.byteLength,
    sha256: createHash("sha256").update(fileBytes).digest("hex"),
  };
}

function truncateAuditUrl(value: string) {
  return value.length > 160 ? `${value.slice(0, 160)}...` : value;
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

function normalizeSeedanceReferenceImages(
  value: Array<string | SeedanceReferenceImageInput> | null | undefined,
) {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      if (typeof item === "string") {
        return {
          assetPath: item.trim(),
          role: "reference_image" as const,
          semanticRole: null,
          label: null,
        };
      }

      return {
        assetPath: item.assetPath.trim(),
        role: item.role ?? "reference_image",
        semanticRole: item.semanticRole ?? null,
        label: item.label?.trim() || null,
      };
    })
    .filter((item) => item.assetPath.length > 0);
}

function buildPromptTextWithReferenceImageAliases(
  promptText: string | null | undefined,
  referenceImages: Array<{
    assetPath: string;
    label?: string | null;
    semanticRole?: "first_frame" | "last_frame" | null;
  }>,
) {
  const normalizedPromptText = promptText?.trim() ?? "";
  const aliasLines = referenceImages.map((referenceImage, index) => {
    const alias = `图片${index + 1}`;
    const label = referenceImage.label?.trim() || inferReferenceImageAlias(referenceImage.assetPath);
    const purposeText = inferReferenceImagePurposeText(referenceImage);

    return `${alias} = ${label}。用途：${purposeText}`;
  });

  if (aliasLines.length === 0) {
    return normalizedPromptText;
  }

  const aliasText = `参考图别名说明：\n${aliasLines.join("\n")}`;

  return normalizedPromptText ? `${normalizedPromptText}\n\n${aliasText}` : aliasText;
}

function inferReferenceImageAlias(assetPath: string) {
  const normalizedAssetPath = assetPath.trim();
  const fileName = normalizedAssetPath ? path.basename(normalizedAssetPath) : "参考图";

  return fileName || "参考图";
}

function inferReferenceImagePurposeText(referenceImage: {
  assetPath: string;
  label?: string | null;
  semanticRole?: "first_frame" | "last_frame" | null;
}) {
  switch (referenceImage.semanticRole) {
    case "first_frame":
      return "约束视频开头状态，开场画面应承接这张图的构图、动作起点和镜头起势。";
    case "last_frame":
      return "约束视频结尾状态，最后画面应自然抵达这张图的动作、情绪和构图。";
    default:
      break;
  }

  const label = referenceImage.label?.trim() ?? "";
  const assetPath = referenceImage.assetPath.trim();

  if (/character|角色/iu.test(label) || /character-sheets/iu.test(assetPath)) {
    return "锁定角色外观、脸部特征、发型、服装、体型和人物一致性。";
  }

  if (/scene|场景/iu.test(label) || /scene-sheets/iu.test(assetPath)) {
    return "锁定场景环境、空间结构、关键陈设和整体氛围。";
  }

  return "作为普通多模态参考图，辅助约束画面元素、道具、风格或连续性。";
}

function readApiToken(apiToken: string | undefined) {
  const normalizedToken = apiToken?.trim();

  if (!normalizedToken) {
    throw new Error("SEEDANCE_API_KEY is required for Seedance video generation");
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

function buildSubmittedAttemptAudit(input: {
  attempt: number;
  strategy: SeedanceStageSubmitAttemptAudit["strategy"];
  submitted: SubmitSeedanceVideoGenerationTaskResult;
}): SeedanceStageSubmitAttemptAudit {
  return {
    attempt: input.attempt,
    strategy: input.strategy,
    status: "submitted",
    request: input.submitted.requestAudit ?? createMissingRequestAudit(),
    taskId: input.submitted.taskId,
    providerStatus: input.submitted.status,
  };
}

function buildStageSubmitResult(
  submitted: SubmitSeedanceVideoGenerationTaskResult,
  attempts: SeedanceStageSubmitAttemptAudit[],
) {
  const audit: SeedanceStageGenerationAudit = {
    attempts,
    fallbackApplied: false,
    finalAttempt: attempts.at(-1)?.attempt ?? null,
  };

  return {
    submitted,
    audit,
  };
}

function createMissingRequestAudit(): SeedanceSubmitRequestAudit {
  return {
    model: "",
    duration: 0,
    promptText: "",
    content: [],
    referenceImages: [],
    referenceAudioCount: 0,
    referenceVideoCount: 0,
    hasDraftTask: false,
  };
}
