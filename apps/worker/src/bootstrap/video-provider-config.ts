import type { VideoProvider } from "@sweet-star/core";
import {
  createSeedanceStageVideoProvider,
  type ReferenceImageUploader,
} from "@sweet-star/services";

const DEFAULT_SEEDANCE_ASPECT_RATIO = "16:9";

export interface CreateConfiguredVideoProviderOptions {
  env?: Record<string, string | undefined>;
  referenceImageUploader: ReferenceImageUploader;
}

export function createConfiguredVideoProvider(
  options: CreateConfiguredVideoProviderOptions,
): VideoProvider {
  const env = options.env ?? process.env;
  const seedanceBaseUrl = env.SEEDANCE_API_BASE_URL;
  const seedanceApiKey = env.SEEDANCE_API_KEY;
  const modelName = env.SEEDANCE_MODEL?.trim() || undefined;
  const durationSeconds = readPositiveInteger(env.SEEDANCE_DURATION_SEC) ?? undefined;
  const ratio = env.SEEDANCE_ASPECT_RATIO?.trim() || DEFAULT_SEEDANCE_ASPECT_RATIO;

  console.info("[video-provider-config] selected", {
    providerName: "seedance",
    modelName,
    durationSeconds,
    ratio,
    baseUrlConfigured: Boolean(seedanceBaseUrl?.trim()),
    apiKeyConfigured: Boolean(seedanceApiKey?.trim()),
  });

  return createSeedanceStageVideoProvider({
    baseUrl: seedanceBaseUrl,
    apiToken: seedanceApiKey,
    modelName,
    durationSeconds,
    ratio,
  });
}

function readPositiveInteger(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
