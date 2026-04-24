import type {
  CharacterSheetImageProvider,
  GenerateCharacterSheetImageInput,
  GenerateCharacterSheetImageResult,
} from "@sweet-star/core";

export interface CreateArkCharacterSheetImageProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com";
const DEFAULT_MODEL = "doubao-seedream-5-0-260128";
const DEFAULT_SIZE = "2K";
const DEFAULT_OUTPUT_FORMAT = "png";

export function createArkCharacterSheetImageProvider(
  options: CreateArkCharacterSheetImageProviderOptions,
): CharacterSheetImageProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = options.model?.trim() || DEFAULT_MODEL;

  return {
    async generateCharacterSheetImage(
      input: GenerateCharacterSheetImageInput,
    ): Promise<GenerateCharacterSheetImageResult> {
      const apiToken = options.apiToken?.trim();

      if (!apiToken) {
        throw new Error("SEEDANCE_API_KEY is required for character sheet image generation");
      }

      const response = await requestArkImageGeneration({
        apiToken,
        baseUrl,
        model,
        promptText: input.promptText,
        timeoutMs: options.timeoutMs,
      });
      const firstImage = readFirstImage(response);

      if (!firstImage?.url) {
        throw new Error("Ark character sheet image provider returned no usable image");
      }

      const imageBytes = await downloadImageBytes(firstImage.url, options.timeoutMs);
      const dimensions =
        parseDimensionsFromSize(firstImage.size) ?? parseImageDimensionsFromBytes(imageBytes);

      if (!dimensions) {
        throw new Error("Ark character sheet image provider returned no usable image");
      }

      return {
        imageBytes,
        width: dimensions.width,
        height: dimensions.height,
        rawResponse: JSON.stringify(response),
        provider: "ark-character-sheet-image",
        model,
      };
    },
  };
}

async function requestArkImageGeneration(input: {
  apiToken: string;
  baseUrl: string;
  model: string;
  promptText: string;
  timeoutMs?: number;
}) {
  const controller = input.timeoutMs ? new AbortController() : null;
  const timeout =
    input.timeoutMs && controller ? setTimeout(() => controller.abort(), input.timeoutMs) : null;

  try {
    const response = await fetch(`${input.baseUrl}/api/v3/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        prompt: input.promptText.trim(),
        size: DEFAULT_SIZE,
        output_format: DEFAULT_OUTPUT_FORMAT,
        watermark: false,
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      const bodyText = await safeReadResponseText(response);
      throw new Error(
        `Ark character sheet image provider request failed with status ${response.status}${bodyText ? `; body=${truncateForError(bodyText)}` : ""}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Ark character sheet image provider request timed out");
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function downloadImageBytes(url: string, timeoutMs?: number) {
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = timeoutMs && controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(url, {
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Ark character sheet image provider failed to download generated image with status ${response.status}`,
      );
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Ark character sheet image download timed out");
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function readFirstImage(payload: unknown) {
  const data = (payload as { data?: Array<Record<string, unknown>> })?.data;
  return Array.isArray(data) ? data[0] : null;
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

function parseDimensionsFromSize(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d+)x(\d+)$/i);

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

  if (bytes.length < 24 || !pngSignature.every((value, index) => bytes[index] === value)) {
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
