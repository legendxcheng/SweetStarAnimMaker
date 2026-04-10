import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";
import { DEFAULT_DURATION_SECONDS } from "./kling-omni-provider.constants";
import type { KlingOmniRequestJsonInput } from "./kling-omni-provider.types";

export function readApiToken(apiToken: string | undefined) {
  const normalizedToken = apiToken?.trim();

  if (!normalizedToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for Kling omni generation");
  }

  return normalizedToken;
}

export function readRequiredText(value: string, fieldName: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmedValue;
}

export function normalizeRequiredStringArray(value: string[], fieldName: string) {
  const items = normalizeStringArray(value);

  if (items.length === 0) {
    throw new Error(`${fieldName} must include at least one item`);
  }

  return items;
}

export function normalizeStringArray(value: string[] | null | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export function normalizeDurationSeconds(value: number | null | undefined) {
  return String(isPositiveNumber(value) ? value : DEFAULT_DURATION_SECONDS);
}

export function normalizeBoundedInteger(
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

export async function resolveAssetUrl(
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

export async function resolveAssetUrls(
  values: string[],
  referenceImageUploader: ReferenceImageUploader | undefined,
) {
  const results: string[] = [];

  for (const value of values) {
    results.push(await resolveAssetUrl(value, referenceImageUploader));
  }

  return results;
}

export function assignOptionalString(
  target: Record<string, unknown>,
  key: string,
  value: string | null | undefined,
) {
  const trimmedValue = value?.trim();

  if (trimmedValue) {
    target[key] = trimmedValue;
  }
}

export function isRemoteUrl(value: string) {
  return /^https?:\/\//iu.test(value);
}

export function isPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export async function requestJson(input: KlingOmniRequestJsonInput) {
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

export async function safeReadResponseText(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

export function truncateForError(value: string, maxLength = 500) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export function readFirstString(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function readStringLike(payload: unknown, paths: string[][]) {
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

export function readFirstArrayItem(payload: unknown, paths: string[][]) {
  for (const path of paths) {
    const candidate = readPath(payload, path);

    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate[0];
    }
  }

  return null;
}

export function readPath(value: unknown, path: string[]) {
  let current = value;

  for (const key of path) {
    if (typeof current !== "object" || current === null) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

export function delay(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
