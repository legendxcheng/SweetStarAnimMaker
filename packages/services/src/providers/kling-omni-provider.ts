import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";

export interface CreateKlingOmniProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  modelName?: string;
  mode?: string;
  timeoutMs?: number;
  referenceImageUploader?: ReferenceImageUploader;
  fetchFn?: typeof fetch;
}

export type KlingOmniAspectRatio = "16:9" | "9:16" | "1:1";

export interface SubmitOmniVideoWithFramesInput {
  promptText: string;
  startImage: string;
  endImage: string;
  durationSeconds?: number | null;
  aspectRatio?: KlingOmniAspectRatio | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface SubmitOmniVideoWithStartFrameInput {
  promptText: string;
  startImage: string;
  durationSeconds?: number | null;
  aspectRatio?: KlingOmniAspectRatio | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface SubmitOmniVideoWithElementsInput {
  promptText: string;
  elementIds: Array<string | number>;
  durationSeconds?: number | null;
  aspectRatio?: KlingOmniAspectRatio | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface SubmitOmniVideoResult {
  taskId: string;
  status: string | null;
  provider: string;
  modelName: string;
  mode: string;
  rawResponse: string;
}

export interface GetOmniVideoTaskInput {
  taskId: string;
}

export interface GetOmniVideoTaskResult {
  taskId: string;
  status: string | null;
  videoUrl: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
  rawResponse: string;
}

export interface CreateElementInput {
  name: string;
  description: string;
  frontalImage: string;
  referenceImages: string[];
  voiceId?: string | null;
  tagIds?: string[] | null;
  callbackUrl?: string | null;
  externalTaskId?: string | null;
}

export interface CreateElementResult {
  taskId: string;
  status: string | null;
  provider: string;
  rawResponse: string;
}

export interface GetElementInput {
  taskId: string;
}

export interface GetElementResult {
  taskId: string;
  status: string | null;
  errorMessage: string | null;
  completed: boolean;
  failed: boolean;
  elementId: string | null;
  elementName: string | null;
  elementDescription: string | null;
  referenceType: string | null;
  elementStatus: string | null;
  rawResponse: string;
}

export interface ListElementsInput {
  pageNum?: number;
  pageSize?: number;
}

export interface ListElementsResult {
  items: GetElementResult[];
  rawResponse: string;
}

export interface KlingOmniProvider {
  submitOmniVideoWithStartFrame(
    input: SubmitOmniVideoWithStartFrameInput,
  ): Promise<SubmitOmniVideoResult> | SubmitOmniVideoResult;
  submitOmniVideoWithFrames(
    input: SubmitOmniVideoWithFramesInput,
  ): Promise<SubmitOmniVideoResult> | SubmitOmniVideoResult;
  submitOmniVideoWithElements(
    input: SubmitOmniVideoWithElementsInput,
  ): Promise<SubmitOmniVideoResult> | SubmitOmniVideoResult;
  getOmniVideoTask(
    input: GetOmniVideoTaskInput,
  ): Promise<GetOmniVideoTaskResult> | GetOmniVideoTaskResult;
  createElement(input: CreateElementInput): Promise<CreateElementResult> | CreateElementResult;
  getElement(input: GetElementInput): Promise<GetElementResult> | GetElementResult;
  listElements(input?: ListElementsInput): Promise<ListElementsResult> | ListElementsResult;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL_NAME = "kling-v3-omni";
const DEFAULT_MODE = "pro";
const DEFAULT_DURATION_SECONDS = 5;
const SUCCESS_STATUSES = new Set(["succeed", "succeeded", "success", "completed", "done"]);
const FAILURE_STATUSES = new Set(["failed", "fail", "error", "canceled", "cancelled", "rejected"]);

export function createKlingOmniProvider(
  options: CreateKlingOmniProviderOptions = {},
): KlingOmniProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelName = options.modelName?.trim() || DEFAULT_MODEL_NAME;
  const mode = options.mode?.trim() || DEFAULT_MODE;
  const fetchFn = options.fetchFn ?? fetch;

  return {
    async submitOmniVideoWithStartFrame(input) {
      const apiToken = readApiToken(options.apiToken);
      const startImage = await resolveAssetUrl(input.startImage, options.referenceImageUploader);
      const payload = await submitOmniVideoRequest(
        {
          apiToken,
          baseUrl,
          fetchFn,
          timeoutMs: options.timeoutMs,
        },
        {
          modelName,
          mode,
          promptText: input.promptText,
          durationSeconds: input.durationSeconds,
          aspectRatio: input.aspectRatio,
          callbackUrl: input.callbackUrl,
          externalTaskId: input.externalTaskId,
          imageList: [{ image_url: startImage, type: "first_frame" }],
        },
      );

      return normalizeSubmitResult(payload, {
        provider: "kling-omni",
        modelName,
        mode,
        missingIdMessage: "Kling omni provider returned no task id",
      });
    },

    async submitOmniVideoWithFrames(input) {
      const apiToken = readApiToken(options.apiToken);
      const startImage = await resolveAssetUrl(input.startImage, options.referenceImageUploader);
      const endImage = await resolveAssetUrl(input.endImage, options.referenceImageUploader);
      const payload = await submitOmniVideoRequest(
        {
          apiToken,
          baseUrl,
          fetchFn,
          timeoutMs: options.timeoutMs,
        },
        {
          modelName,
          mode,
          promptText: input.promptText,
          durationSeconds: input.durationSeconds,
          aspectRatio: input.aspectRatio,
          callbackUrl: input.callbackUrl,
          externalTaskId: input.externalTaskId,
          imageList: [
          { image_url: startImage, type: "first_frame" },
          { image_url: endImage, type: "end_frame" },
        ],
        },
      );

      return normalizeSubmitResult(payload, {
        provider: "kling-omni",
        modelName,
        mode,
        missingIdMessage: "Kling omni provider returned no task id",
      });
    },

    async submitOmniVideoWithElements(input) {
      const apiToken = readApiToken(options.apiToken);
      const requestBody: Record<string, unknown> = {
        model_name: modelName,
        mode,
        prompt: readRequiredText(input.promptText, "promptText"),
        duration: normalizeDurationSeconds(input.durationSeconds),
        element_list: normalizeElementIds(input.elementIds),
      };

      assignOptionalString(requestBody, "aspect_ratio", input.aspectRatio);
      assignOptionalString(requestBody, "callback_url", input.callbackUrl);
      assignOptionalString(requestBody, "external_task_id", input.externalTaskId);

      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "POST",
        path: "/kling/v1/videos/omni-video",
        body: requestBody,
      });

      return normalizeSubmitResult(payload, {
        provider: "kling-omni",
        modelName,
        mode,
        missingIdMessage: "Kling omni provider returned no task id",
      });
    },

    async getOmniVideoTask(input) {
      const apiToken = readApiToken(options.apiToken);
      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "GET",
        path: `/kling/v1/videos/omni-video/${encodeURIComponent(input.taskId)}`,
      });

      const task = normalizeTaskState(payload, input.taskId);

      return {
        taskId: task.taskId,
        status: task.status,
        videoUrl: readFirstString(payload, [
          ["data", "task_result", "video_url"],
          ["data", "task_result", "video", "url"],
          ["data", "task_result", "videos", "0", "url"],
          ["data", "video_url"],
          ["video_url"],
        ]),
        errorMessage: task.errorMessage,
        completed: task.completed,
        failed: task.failed,
        rawResponse: JSON.stringify(payload),
      };
    },

    async createElement(input) {
      const apiToken = readApiToken(options.apiToken);
      const frontalImage = await resolveAssetUrl(input.frontalImage, options.referenceImageUploader);
      const referenceImages = await resolveAssetUrls(
        normalizeRequiredStringArray(input.referenceImages, "referenceImages"),
        options.referenceImageUploader,
      );

      const requestBody: Record<string, unknown> = {
        element_name: readRequiredText(input.name, "name"),
        element_description: readRequiredText(input.description, "description"),
        reference_type: "image_refer",
        element_image_list: {
          frontal_image: frontalImage,
          refer_images: referenceImages.map((imageUrl) => ({
            image_url: imageUrl,
          })),
        },
      };

      assignOptionalString(requestBody, "element_voice_id", input.voiceId);
      assignOptionalString(requestBody, "callback_url", input.callbackUrl);
      assignOptionalString(requestBody, "external_task_id", input.externalTaskId);

      const tagList = normalizeStringArray(input.tagIds);
      if (tagList.length > 0) {
        requestBody.tag_list = tagList.map((tagId) => ({
          tag_id: tagId,
        }));
      }

      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "POST",
        path: "/kling/v1/general/advanced-custom-elements",
        body: requestBody,
      });

      const taskId = readFirstString(payload, [
        ["data", "task_id"],
        ["data", "id"],
        ["task_id"],
        ["id"],
      ]);

      if (!taskId) {
        throw new Error("Kling omni provider returned no element task id");
      }

      return {
        taskId,
        status: readFirstString(payload, [
          ["data", "task_status"],
          ["data", "status"],
          ["task_status"],
          ["status"],
        ]),
        provider: "kling-omni",
        rawResponse: JSON.stringify(payload),
      };
    },

    async getElement(input) {
      const apiToken = readApiToken(options.apiToken);
      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "GET",
        path: `/kling/v1/general/advanced-custom-elements/${encodeURIComponent(input.taskId)}`,
      });

      return normalizeElementTaskResult(payload, input.taskId);
    },

    async listElements(input = {}) {
      const apiToken = readApiToken(options.apiToken);
      const pageNum = normalizeBoundedInteger(input.pageNum, 1, 1, 1000);
      const pageSize = normalizeBoundedInteger(input.pageSize, 30, 1, 500);
      const payload = await requestJson({
        apiToken,
        baseUrl,
        fetchFn,
        timeoutMs: options.timeoutMs,
        method: "GET",
        path: `/kling/v1/general/advanced-custom-elements?pageNum=${pageNum}&pageSize=${pageSize}`,
      });
      const items = Array.isArray(readPath(payload, ["data"])) ? (readPath(payload, ["data"]) as unknown[]) : [];

      return {
        items: items.map((item) => normalizeElementTaskResult(item, null)),
        rawResponse: JSON.stringify(payload),
      };
    },
  };
}

function normalizeSubmitResult(
  payload: unknown,
  input: { provider: string; modelName: string; mode: string; missingIdMessage: string },
): SubmitOmniVideoResult {
  const taskId = readFirstString(payload, [
    ["data", "task_id"],
    ["data", "id"],
    ["task_id"],
    ["id"],
  ]);

  if (!taskId) {
    throw new Error(input.missingIdMessage);
  }

  return {
    taskId,
    status: readFirstString(payload, [
      ["data", "task_status"],
      ["data", "status"],
      ["task_status"],
      ["status"],
    ]),
    provider: input.provider,
    modelName: input.modelName,
    mode: input.mode,
    rawResponse: JSON.stringify(payload),
  };
}

async function submitOmniVideoRequest(
  request: {
    apiToken: string;
    baseUrl: string;
    fetchFn: typeof fetch;
    timeoutMs?: number;
  },
  input: {
    modelName: string;
    mode: string;
    promptText: string;
    durationSeconds?: number | null;
    aspectRatio?: KlingOmniAspectRatio | null;
    callbackUrl?: string | null;
    externalTaskId?: string | null;
    imageList?: Array<{ image_url: string; type: "first_frame" | "end_frame" }>;
  },
) {
  const requestBody: Record<string, unknown> = {
    model_name: input.modelName,
    mode: input.mode,
    prompt: readRequiredText(input.promptText, "promptText"),
    duration: normalizeDurationSeconds(input.durationSeconds),
  };

  assignOptionalString(requestBody, "aspect_ratio", input.aspectRatio);
  assignOptionalString(requestBody, "callback_url", input.callbackUrl);
  assignOptionalString(requestBody, "external_task_id", input.externalTaskId);

  if (input.imageList && input.imageList.length > 0) {
    requestBody.image_list = input.imageList;
  }

  return requestJson({
    apiToken: request.apiToken,
    baseUrl: request.baseUrl,
    fetchFn: request.fetchFn,
    timeoutMs: request.timeoutMs,
    method: "POST",
    path: "/kling/v1/videos/omni-video",
    body: requestBody,
  });
}

function normalizeElementTaskResult(payload: unknown, fallbackTaskId: string | null): GetElementResult {
  const task = normalizeTaskState(payload, fallbackTaskId);
  const firstElement = readFirstArrayItem(payload, [
    ["data", "task_result", "elements"],
    ["task_result", "elements"],
  ]);

  return {
    taskId: task.taskId,
    status: task.status,
    errorMessage: task.errorMessage,
    completed: task.completed,
    failed: task.failed,
    elementId: readStringLike(firstElement, [["element_id"]]),
    elementName: readFirstString(firstElement, [["element_name"]]),
    elementDescription: readFirstString(firstElement, [["element_description"]]),
    referenceType: readFirstString(firstElement, [["reference_type"]]),
    elementStatus: readFirstString(firstElement, [["status"]]),
    rawResponse: JSON.stringify(payload),
  };
}

function normalizeTaskState(payload: unknown, fallbackTaskId: string | null) {
  const status = readFirstString(payload, [
    ["data", "task_status"],
    ["data", "status"],
    ["task_status"],
    ["status"],
  ]);
  const normalizedStatus = status?.trim().toLowerCase() ?? null;

  return {
    taskId:
      readFirstString(payload, [
        ["data", "task_id"],
        ["data", "id"],
        ["task_id"],
        ["id"],
      ]) ?? fallbackTaskId ?? "",
    status,
    errorMessage: readTaskErrorMessage(payload, normalizedStatus ? FAILURE_STATUSES.has(normalizedStatus) : false),
    completed: normalizedStatus ? SUCCESS_STATUSES.has(normalizedStatus) : false,
    failed: normalizedStatus ? FAILURE_STATUSES.has(normalizedStatus) : false,
  };
}

function normalizeElementIds(value: Array<string | number>) {
  const items = value
    .map((item) => normalizeElementIdForRequest(item))
    .filter((item): item is string | number => item !== null);

  if (items.length === 0) {
    throw new Error("elementIds must include at least one element id");
  }

  return items.map((elementId) => ({
    element_id: elementId,
  }));
}

function normalizeElementIdForRequest(value: string | number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/u.test(trimmed)) {
    const asNumber = Number(trimmed);
    if (Number.isSafeInteger(asNumber)) {
      return asNumber;
    }
  }

  return trimmed;
}

function readApiToken(apiToken: string | undefined) {
  const normalizedToken = apiToken?.trim();

  if (!normalizedToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for Kling omni generation");
  }

  return normalizedToken;
}

function readRequiredText(value: string, fieldName: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmedValue;
}

function normalizeRequiredStringArray(value: string[], fieldName: string) {
  const items = normalizeStringArray(value);

  if (items.length === 0) {
    throw new Error(`${fieldName} must include at least one item`);
  }

  return items;
}

function normalizeStringArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function normalizeDurationSeconds(value: number | null | undefined) {
  return String(isPositiveNumber(value) ? value : DEFAULT_DURATION_SECONDS);
}

function normalizeBoundedInteger(
  value: number | null | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Number(value)));
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
      "Reference image uploader is required when Kling omni inputs use local file paths",
    );
  }

  return referenceImageUploader.uploadReferenceImage({
    localFilePath: trimmedValue,
  });
}

async function resolveAssetUrls(
  values: string[],
  referenceImageUploader: ReferenceImageUploader | undefined,
) {
  const results: string[] = [];

  for (const value of values) {
    results.push(await resolveAssetUrl(value, referenceImageUploader));
  }

  return results;
}

function assignOptionalString(
  target: Record<string, unknown>,
  key: string,
  value: string | null | undefined,
) {
  const trimmedValue = value?.trim();

  if (trimmedValue) {
    target[key] = trimmedValue;
  }
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
        `Kling omni provider request failed with status ${response.status}${details ? `; ${details}` : ""}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Kling omni provider request timed out");
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

function readStringLike(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return null;
}

function readTaskErrorMessage(payload: unknown, failed: boolean) {
  const dedicatedError = readFirstString(payload, [
    ["data", "task_status_msg"],
    ["data", "error_message"],
    ["data", "error", "message"],
    ["task_status_msg"],
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

function readFirstArrayItem(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate[0];
    }
  }

  return null;
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
