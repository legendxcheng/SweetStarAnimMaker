import type { VideoProvider } from "@sweet-star/core";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL_NAME,
  DEFAULT_MODE,
  DEFAULT_STAGE_DURATION_SECONDS,
  DEFAULT_STAGE_SOUND,
  KLING_OMNI_PROVIDER_NAME,
  MIN_STAGE_DURATION_SECONDS,
} from "./kling-omni-provider.constants";
import {
  assignOptionalString,
  delay,
  isPositiveNumber,
  normalizeBoundedInteger,
  normalizeDurationSeconds,
  normalizeRequiredStringArray,
  normalizeStringArray,
  readApiToken,
  readFirstString,
  readPath,
  readRequiredText,
  requestJson,
  resolveAssetUrl,
  resolveAssetUrls,
} from "./kling-omni-provider.helpers";
import {
  normalizeElementIds,
  normalizeElementTaskResult,
  normalizeSubmitResult,
  normalizeTaskState,
} from "./kling-omni-provider.normalizers";
import type {
  CreateElementInput,
  CreateKlingOmniProviderOptions,
  CreateKlingOmniStageVideoProviderOptions,
  GetOmniVideoTaskResult,
  KlingOmniProvider,
  KlingOmniRequestContext,
  SubmitOmniVideoRequestInput,
} from "./kling-omni-provider.types";

export type {
  CreateElementInput,
  CreateElementResult,
  CreateKlingOmniProviderOptions,
  CreateKlingOmniStageVideoProviderOptions,
  GetElementInput,
  GetElementResult,
  GetOmniVideoTaskInput,
  GetOmniVideoTaskResult,
  KlingOmniAspectRatio,
  KlingOmniProvider,
  ListElementsInput,
  ListElementsResult,
  SubmitOmniVideoResult,
  SubmitOmniVideoWithElementsInput,
  SubmitOmniVideoWithFramesInput,
  SubmitOmniVideoWithStartFrameInput,
} from "./kling-omni-provider.types";

export function createKlingOmniProvider(
  options: CreateKlingOmniProviderOptions = {},
): KlingOmniProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelName = options.modelName?.trim() || DEFAULT_MODEL_NAME;
  const mode = options.mode?.trim() || DEFAULT_MODE;
  const fetchFn = options.fetchFn ?? fetch;
  const submitResultContext = {
    provider: KLING_OMNI_PROVIDER_NAME,
    modelName,
    mode,
    missingIdMessage: "Kling omni provider returned no task id",
  };

  const createRequestContext = (): KlingOmniRequestContext => ({
    apiToken: readApiToken(options.apiToken),
    baseUrl,
    fetchFn,
    timeoutMs: options.timeoutMs,
  });

  return {
    async submitOmniVideoWithStartFrame(input) {
      const startImage = await resolveAssetUrl(input.startImage, options.referenceImageUploader);
      const payload = await submitOmniVideoRequest(createRequestContext(), {
        modelName,
        mode,
        promptText: input.promptText,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        sound: input.sound ?? options.sound,
        callbackUrl: input.callbackUrl,
        externalTaskId: input.externalTaskId,
        imageList: [{ image_url: startImage, type: "first_frame" }],
      });

      return normalizeSubmitResult(payload, submitResultContext);
    },

    async submitOmniVideoWithFrames(input) {
      const startImage = await resolveAssetUrl(input.startImage, options.referenceImageUploader);
      const endImage = await resolveAssetUrl(input.endImage, options.referenceImageUploader);
      const payload = await submitOmniVideoRequest(createRequestContext(), {
        modelName,
        mode,
        promptText: input.promptText,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        sound: input.sound ?? options.sound,
        callbackUrl: input.callbackUrl,
        externalTaskId: input.externalTaskId,
        imageList: [
          { image_url: startImage, type: "first_frame" },
          { image_url: endImage, type: "end_frame" },
        ],
      });

      return normalizeSubmitResult(payload, submitResultContext);
    },

    async submitOmniVideoWithElements(input) {
      const requestBody: Record<string, unknown> = {
        model_name: modelName,
        mode,
        prompt: readRequiredText(input.promptText, "promptText"),
        duration: normalizeDurationSeconds(input.durationSeconds),
        element_list: normalizeElementIds(input.elementIds),
      };

      assignOptionalString(requestBody, "aspect_ratio", input.aspectRatio);
      assignOptionalString(requestBody, "sound", input.sound ?? options.sound);
      assignOptionalString(requestBody, "callback_url", input.callbackUrl);
      assignOptionalString(requestBody, "external_task_id", input.externalTaskId);

      const payload = await requestJson({
        ...createRequestContext(),
        method: "POST",
        path: "/kling/v1/videos/omni-video",
        body: requestBody,
      });

      return normalizeSubmitResult(payload, submitResultContext);
    },

    async getOmniVideoTask(input) {
      const payload = await requestJson({
        ...createRequestContext(),
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
      const payload = await requestJson({
        ...createRequestContext(),
        method: "POST",
        path: "/kling/v1/general/advanced-custom-elements",
        body: await buildElementRequestBody(input, options),
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
        provider: KLING_OMNI_PROVIDER_NAME,
        rawResponse: JSON.stringify(payload),
      };
    },

    async getElement(input) {
      const payload = await requestJson({
        ...createRequestContext(),
        method: "GET",
        path: `/kling/v1/general/advanced-custom-elements/${encodeURIComponent(input.taskId)}`,
      });

      return normalizeElementTaskResult(payload, input.taskId);
    },

    async listElements(input = {}) {
      const pageNum = normalizeBoundedInteger(input.pageNum, 1, 1, 1000);
      const pageSize = normalizeBoundedInteger(input.pageSize, 30, 1, 500);
      const payload = await requestJson({
        ...createRequestContext(),
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

export function createKlingOmniStageVideoProvider(
  options: CreateKlingOmniStageVideoProviderOptions = {},
): VideoProvider {
  const provider = createKlingOmniProvider(options);
  const durationSeconds = isPositiveNumber(options.durationSeconds)
    ? Number(options.durationSeconds)
    : DEFAULT_STAGE_DURATION_SECONDS;
  const aspectRatio = options.aspectRatio ?? null;
  const sound = options.sound?.trim() || DEFAULT_STAGE_SOUND;
  const pollIntervalMs = options.pollIntervalMs;
  const pollTimeoutMs = options.pollTimeoutMs;

  return {
    async generateSegmentVideo(input) {
      const submittedDurationSeconds = normalizeStageDurationSeconds(input.durationSec, durationSeconds);
      const submitted = input.endFramePath
        ? await provider.submitOmniVideoWithFrames({
            promptText: input.promptText,
            startImage: input.startFramePath,
            endImage: input.endFramePath,
            durationSeconds: submittedDurationSeconds,
            aspectRatio,
            sound,
          })
        : await provider.submitOmniVideoWithStartFrame({
            promptText: input.promptText,
            startImage: input.startFramePath,
            durationSeconds: submittedDurationSeconds,
            aspectRatio,
            sound,
          });
      const completed = await waitForOmniTask(provider, {
        taskId: submitted.taskId,
        pollIntervalMs,
        timeoutMs: pollTimeoutMs,
      });

      if (completed.failed) {
        throw new Error(
          completed.errorMessage
            ? `Kling omni video generation failed: ${completed.errorMessage}`
            : `Kling omni video generation failed for task ${completed.taskId}`,
        );
      }

      if (!completed.videoUrl) {
        throw new Error(
          `Kling omni video generation completed without video url for task ${completed.taskId}`,
        );
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
        durationSec: submittedDurationSeconds,
      };
    },
  };
}

async function buildElementRequestBody(
  input: CreateElementInput,
  options: CreateKlingOmniProviderOptions,
) {
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

  return requestBody;
}

function normalizeStageDurationSeconds(
  requestedDurationSeconds: number | null | undefined,
  fallbackDurationSeconds: number,
) {
  if (!isPositiveNumber(requestedDurationSeconds)) {
    return fallbackDurationSeconds;
  }

  return Math.max(MIN_STAGE_DURATION_SECONDS, Number(requestedDurationSeconds));
}

async function submitOmniVideoRequest(
  request: KlingOmniRequestContext,
  input: SubmitOmniVideoRequestInput,
) {
  const prompt = readRequiredText(input.promptText, "promptText");
  const requestBody: Record<string, unknown> = {
    model_name: input.modelName,
    mode: input.mode,
    prompt,
    duration: normalizeDurationSeconds(input.durationSeconds),
  };

  assignOptionalString(requestBody, "aspect_ratio", input.aspectRatio);
  assignOptionalString(requestBody, "sound", input.sound);
  assignOptionalString(requestBody, "callback_url", input.callbackUrl);
  assignOptionalString(requestBody, "external_task_id", input.externalTaskId);

  if (input.imageList && input.imageList.length > 0) {
    requestBody.image_list = input.imageList;
  }

  console.info("[video-provider:kling-omni] submit", {
    modelName: input.modelName,
    mode: input.mode,
    duration: requestBody.duration,
    sound: input.sound ?? null,
    aspectRatio: input.aspectRatio ?? null,
    imageCount: input.imageList?.length ?? 0,
    hasEndFrame: Boolean(input.imageList?.some((image) => image.type === "end_frame")),
    promptLength: prompt.length,
  });

  return requestJson({
    ...request,
    method: "POST",
    path: "/kling/v1/videos/omni-video",
    body: requestBody,
  });
}

async function waitForOmniTask(
  provider: KlingOmniProvider,
  input: { taskId: string; pollIntervalMs?: number; timeoutMs?: number },
): Promise<GetOmniVideoTaskResult> {
  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? 600_000;
  const pollIntervalMs = input.pollIntervalMs ?? 5_000;

  while (true) {
    const result = await provider.getOmniVideoTask({
      taskId: input.taskId,
    });

    if (result.completed || result.failed) {
      return result;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(
        `Kling omni provider polling timed out after ${timeoutMs}ms for task ${input.taskId}`,
      );
    }

    await delay(pollIntervalMs);
  }
}
