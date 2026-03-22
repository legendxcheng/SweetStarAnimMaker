import type {
  CharacterSheetImageProvider,
  GenerateCharacterSheetImageInput,
  GenerateCharacterSheetImageResult,
} from "@sweet-star/core";

import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";

export interface CreateTurnaroundImageProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
  referenceImageUploader?: ReferenceImageUploader;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "doubao-seedream-5-0-260128";

export function createTurnaroundImageProvider(
  options: CreateTurnaroundImageProviderOptions,
): CharacterSheetImageProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;

  return {
    async generateCharacterSheetImage(
      input: GenerateCharacterSheetImageInput,
    ): Promise<GenerateCharacterSheetImageResult> {
      const apiToken = options.apiToken?.trim();
      const referenceImagePaths = input.referenceImagePaths ?? [];

      if (!apiToken) {
        throw new Error("VECTORENGINE_API_TOKEN is required for character sheet image generation");
      }

      if (referenceImagePaths.length > 0 && !options.referenceImageUploader) {
        throw new Error(
          "Reference image uploader is required when referenceImagePaths are provided",
        );
      }

      const uploadedReferenceUrls =
        referenceImagePaths.length > 0
          ? await Promise.all(
              referenceImagePaths.map((localFilePath) =>
                options.referenceImageUploader!.uploadReferenceImage({ localFilePath }),
              ),
            )
          : [];

      const controller = options.timeoutMs ? new AbortController() : null;
      const timeout =
        options.timeoutMs && controller
          ? setTimeout(() => controller.abort(), options.timeoutMs)
          : null;

      try {
        const requestBody: {
          model: string;
          prompt: string;
          response_format: "b64_json";
          image?: string[];
        } = {
          model,
          prompt: input.promptText,
          response_format: "b64_json",
        };

        if (uploadedReferenceUrls.length > 0) {
          requestBody.image = uploadedReferenceUrls;
        }

        const response = await fetch(`${baseUrl}/v1/images/generations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
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
            `Turnaround image provider request failed with status ${response.status}${details ? `; ${details}` : ""}`,
          );
        }

        const rawPayload = await response.json();
        const parsed = parseImagePayload(rawPayload);

        return {
          imageBytes: parsed.imageBytes,
          width: parsed.width,
          height: parsed.height,
          rawResponse: JSON.stringify(rawPayload),
          provider: "turnaround-image",
          model,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Turnaround image provider request timed out");
        }

        throw error;
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    },
  };
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

function parseImagePayload(payload: unknown) {
  const first = (payload as { data?: Array<Record<string, unknown>> })?.data?.[0];
  const b64 = normalizeBase64Payload(first?.b64_json);
  const dimensions = parseImageDimensions(first);

  if (
    typeof b64 !== "string" ||
    !dimensions
  ) {
    throw new Error("Turnaround image provider returned no usable image");
  }

  return {
    imageBytes: new Uint8Array(Buffer.from(b64, "base64")),
    width: dimensions.width,
    height: dimensions.height,
  };
}

function normalizeBase64Payload(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const dataUrlMatch = trimmed.match(/^data:[^;]+;base64,(.+)$/);
  return dataUrlMatch ? dataUrlMatch[1]! : trimmed;
}

function parseImageDimensions(first: Record<string, unknown> | undefined) {
  const width = asPositiveNumber(first?.width);
  const height = asPositiveNumber(first?.height);

  if (width && height) {
    return { width, height };
  }

  const size = first?.size;

  if (typeof size === "string") {
    const match = size.trim().match(/^(\d+)x(\d+)$/i);

    if (match) {
      const parsedWidth = Number(match[1]);
      const parsedHeight = Number(match[2]);

      if (parsedWidth > 0 && parsedHeight > 0) {
        return {
          width: parsedWidth,
          height: parsedHeight,
        };
      }
    }
  }

  return null;
}

function asPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
