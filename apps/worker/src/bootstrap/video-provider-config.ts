import type { VideoProvider } from "@sweet-star/core";
import {
  createKlingStageVideoProvider,
  createSoraStageVideoProvider,
  type ReferenceImageUploader,
} from "@sweet-star/services";

export interface CreateConfiguredVideoProviderOptions {
  env?: Record<string, string | undefined>;
  referenceImageUploader: ReferenceImageUploader;
}

export function createConfiguredVideoProvider(
  options: CreateConfiguredVideoProviderOptions,
): VideoProvider {
  const env = options.env ?? process.env;
  const providerName = env.VIDEO_PROVIDER?.trim().toLowerCase() || "kling";
  const baseUrl = env.VECTORENGINE_BASE_URL;
  const apiToken = env.VECTORENGINE_API_TOKEN;

  if (providerName === "kling") {
    return createKlingStageVideoProvider({
      baseUrl,
      apiToken,
      modelName: readPreferredModel(env, "KLING_VIDEO_MODEL"),
      mode: env.KLING_VIDEO_MODE?.trim() || "std",
      sound: env.KLING_VIDEO_SOUND?.trim() || "on",
      multiShot: readBoolean(env.KLING_VIDEO_MULTI_SHOT) ?? true,
      durationSeconds: readPositiveInteger(env.KLING_VIDEO_DURATION) ?? 10,
      referenceImageUploader: options.referenceImageUploader,
    });
  }

  if (providerName === "sora") {
    return createSoraStageVideoProvider({
      baseUrl,
      apiToken,
      modelName: readPreferredModel(env, "SORA_VIDEO_MODEL"),
      referenceImageUploader: options.referenceImageUploader,
    });
  }

  throw new Error(`Unsupported VIDEO_PROVIDER: ${providerName}`);
}

function readPreferredModel(env: Record<string, string | undefined>, providerModelKey: string) {
  const genericModel = env.VIDEO_MODEL?.trim();

  if (genericModel) {
    return genericModel;
  }

  const providerModel = env[providerModelKey]?.trim();
  return providerModel || undefined;
}

function readPositiveInteger(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readBoolean(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}
