import type {
  CharacterSheetImageProvider,
  GenerateCharacterSheetImageInput,
  GenerateCharacterSheetImageResult,
  GenerateShotImageInput,
  GenerateShotImageResult,
  ShotImageProvider,
} from "@sweet-star/core";

import type { ReferenceImageUploader } from "../image-upload/reference-image-uploader";

export interface CreateTurnaroundImageProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  size?: string;
  timeoutMs?: number;
  referenceImageUploader?: ReferenceImageUploader;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "doubao-seedream-5-0-260128";

export function createTurnaroundImageProvider(
  options: CreateTurnaroundImageProviderOptions,
): CharacterSheetImageProvider & ShotImageProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;
  const size = options.size?.trim() || null;
  const requestedDimensions = parseRequestedSize(size);

  return {
    async generateCharacterSheetImage(
      input: GenerateCharacterSheetImageInput,
    ): Promise<GenerateCharacterSheetImageResult> {
      return generateImage({
        promptText: input.promptText,
        negativePromptText: null,
        referenceImagePaths: input.referenceImagePaths ?? [],
        missingTokenMessage:
          "VECTORENGINE_API_TOKEN is required for character sheet image generation",
      });
    },
    async generateShotImage(input: GenerateShotImageInput): Promise<GenerateShotImageResult> {
      return generateImage({
        promptText: input.promptText,
        negativePromptText: input.negativePromptText,
        referenceImagePaths: input.referenceImagePaths,
        missingTokenMessage: "VECTORENGINE_API_TOKEN is required for shot image generation",
      });
    },
  };

  async function generateImage(input: {
    promptText: string;
    negativePromptText: string | null;
    referenceImagePaths: string[];
    missingTokenMessage: string;
  }) {
    const apiToken = options.apiToken?.trim();
    const referenceImagePaths = input.referenceImagePaths ?? [];

    if (!apiToken) {
      throw new Error(input.missingTokenMessage);
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
        size?: string;
        image?: string[];
      } = {
        model,
        prompt: buildPrompt(input.promptText, input.negativePromptText),
        response_format: "b64_json",
      };

      if (size) {
        requestBody.size = size;
      }

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
      assertMatchesRequestedSize(parsed, requestedDimensions, size);

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
  }
}

function buildPrompt(promptText: string, negativePromptText: string | null) {
  const trimmedPrompt = promptText.trim();
  const trimmedNegativePrompt = negativePromptText?.trim();

  if (!trimmedNegativePrompt) {
    return trimmedPrompt;
  }

  return `${trimmedPrompt}\n\nNegative prompt:\n${trimmedNegativePrompt}`;
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

function assertMatchesRequestedSize(
  parsed: { width: number; height: number },
  requestedDimensions: { width: number; height: number } | null,
  requestedSize: string | null,
) {
  if (
    !requestedDimensions ||
    (parsed.width === requestedDimensions.width && parsed.height === requestedDimensions.height)
  ) {
    return;
  }

  throw new Error(
    `Turnaround image provider returned ${parsed.width}x${parsed.height}, expected ${requestedDimensions.width}x${requestedDimensions.height} for requested size ${requestedSize}`,
  );
}

function parseImagePayload(payload: unknown) {
  const first = (payload as { data?: Array<Record<string, unknown>> })?.data?.[0];
  const b64 = normalizeBase64Payload(first?.b64_json);

  if (typeof b64 !== "string") {
    throw new Error("Turnaround image provider returned no usable image");
  }

  const imageBytes = new Uint8Array(Buffer.from(b64, "base64"));
  const dimensions = parseImageDimensions(first) ?? parseImageDimensionsFromBytes(imageBytes);

  if (!dimensions) {
    throw new Error("Turnaround image provider returned no usable image");
  }

  return {
    imageBytes,
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

function parseRequestedSize(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d+)x(\d+)$/i);

  if (!match) {
    return null;
  }

  const width = Number.parseInt(match[1]!, 10);
  const height = Number.parseInt(match[2]!, 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function parseImageDimensionsFromBytes(bytes: Uint8Array) {
  return parsePngDimensions(bytes) ?? parseJpegDimensions(bytes);
}

function parsePngDimensions(bytes: Uint8Array) {
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  if (
    bytes.length < 24 ||
    !pngSignature.every((value, index) => bytes[index] === value)
  ) {
    return null;
  }

  const width = readUInt32BE(bytes, 16);
  const height = readUInt32BE(bytes, 20);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function parseJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 3 < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.length) {
      return null;
    }

    const marker = bytes[offset]!;
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }

    if (offset + 1 >= bytes.length) {
      return null;
    }

    const segmentLength = readUInt16BE(bytes, offset);

    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (isJpegStartOfFrameMarker(marker)) {
      if (segmentLength < 7 || offset + 6 >= bytes.length) {
        return null;
      }

      const height = readUInt16BE(bytes, offset + 3);
      const width = readUInt16BE(bytes, offset + 5);

      if (width > 0 && height > 0) {
        return { width, height };
      }

      return null;
    }

    offset += segmentLength;
  }

  return null;
}

function isJpegStartOfFrameMarker(marker: number) {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function readUInt16BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUInt32BE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset]! * 0x1000000 +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  );
}
