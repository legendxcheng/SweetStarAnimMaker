import type {
  CharacterSheetImageProvider,
  GenerateCharacterSheetImageInput,
  GenerateCharacterSheetImageResult,
} from "@sweet-star/core";

export interface CreateTurnaroundImageProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "turnaround-v1";

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

      if (!apiToken) {
        throw new Error("VECTORENGINE_API_TOKEN is required for character sheet image generation");
      }

      const controller = options.timeoutMs ? new AbortController() : null;
      const timeout =
        options.timeoutMs && controller
          ? setTimeout(() => controller.abort(), options.timeoutMs)
          : null;

      try {
        const response = await fetch(`${baseUrl}/v1/images/generations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            prompt: input.promptText,
            response_format: "b64_json",
          }),
          signal: controller?.signal,
        });

        if (!response.ok) {
          throw new Error(`Turnaround image provider request failed with status ${response.status}`);
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

function parseImagePayload(payload: unknown) {
  const first = (payload as { data?: Array<Record<string, unknown>> })?.data?.[0];
  const b64 = first?.b64_json;
  const width = first?.width;
  const height = first?.height;

  if (
    typeof b64 !== "string" ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new Error("Turnaround image provider returned no usable image");
  }

  return {
    imageBytes: new Uint8Array(Buffer.from(b64, "base64")),
    width,
    height,
  };
}
