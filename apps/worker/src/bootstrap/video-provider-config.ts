import type { VideoProvider } from "@sweet-star/core";
import {
  createKlingOmniStageVideoProvider,
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
    const modelName = readPreferredModel(env, "KLING_VIDEO_MODEL");
    const durationSeconds = readPositiveInteger(env.KLING_VIDEO_DURATION) ?? 10;

    console.info("[video-provider-config] selected", {
      providerName,
      modelName,
      durationSeconds,
      baseUrlConfigured: Boolean(baseUrl?.trim()),
      apiTokenConfigured: Boolean(apiToken?.trim()),
    });

    return createKlingOmniStageVideoProvider({
      baseUrl,
      apiToken,
      modelName,
      durationSeconds,
      referenceImageUploader: options.referenceImageUploader,
    });
  }

  if (providerName === "sora") {
    const modelName = readPreferredModel(env, "SORA_VIDEO_MODEL");

    console.info("[video-provider-config] selected", {
      providerName,
      modelName,
      baseUrlConfigured: Boolean(baseUrl?.trim()),
      apiTokenConfigured: Boolean(apiToken?.trim()),
    });

    return createSoraStageVideoProvider({
      baseUrl,
      apiToken,
      modelName,
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
