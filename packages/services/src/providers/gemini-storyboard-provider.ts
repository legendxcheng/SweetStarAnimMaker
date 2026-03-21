import type {
  GenerateStoryboardInput,
  GenerateStoryboardResult,
  StoryboardProvider,
} from "@sweet-star/core";

export interface CreateGeminiStoryboardProviderOptions {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";

export function createGeminiStoryboardProvider(
  options: CreateGeminiStoryboardProviderOptions,
): StoryboardProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiToken = options.apiToken?.trim();
  const model = options.model?.trim() || DEFAULT_MODEL;

  if (!apiToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for storyboard generation");
  }

  return {
    async generateStoryboard(input: GenerateStoryboardInput): Promise<GenerateStoryboardResult> {
      const controller = options.timeoutMs ? new AbortController() : null;
      const timeout =
        options.timeoutMs && controller
          ? setTimeout(() => controller.abort(), options.timeoutMs)
          : null;

      try {
        const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "You generate concise JSON storyboard documents for short animated stories.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: buildPromptText(input),
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: storyboardResponseJsonSchema,
            },
          }),
          signal: controller?.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Gemini storyboard provider request failed with status ${response.status}`,
          );
        }

        const rawResponse = await response.json();
        const rawText = extractCandidateText(rawResponse);
        const storyboard = normalizeStoryboardPayload(JSON.parse(rawText));

        return {
          rawResponse: rawText,
          provider: "gemini",
          model,
          storyboard,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Gemini storyboard provider request timed out");
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

function buildPromptText(input: GenerateStoryboardInput) {
  return [
    `Project: ${input.projectId}`,
    `Master Plot: ${input.masterPlot.logline}`,
    "",
    "Prompt:",
    input.promptText,
  ].join("\n");
}

const storyboardResponseJsonSchema = {
  type: "object",
  required: ["title", "episodeTitle", "scenes"],
  properties: {
    title: { type: ["string", "null"] },
    episodeTitle: { type: ["string", "null"] },
    scenes: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "dramaticPurpose", "segments"],
        properties: {
          name: { type: "string" },
          dramaticPurpose: { type: "string" },
          segments: {
            type: "array",
            items: {
              type: "object",
              required: ["visual", "characterAction", "dialogue", "voiceOver", "audio", "purpose"],
              properties: {
                durationSec: { type: ["integer", "null"] },
                visual: { type: "string" },
                characterAction: { type: "string" },
                dialogue: { type: "string" },
                voiceOver: { type: "string" },
                audio: { type: "string" },
                purpose: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

function extractCandidateText(rawResponse: unknown) {
  const text = (rawResponse as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  })?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini storyboard provider returned no usable content");
  }

  return text;
}

function normalizeStoryboardPayload(payload: unknown): GenerateStoryboardResult["storyboard"] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini storyboard provider returned invalid storyboard JSON");
  }

  const scenes = (payload as { scenes?: unknown }).scenes;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("Gemini storyboard provider returned invalid scenes");
  }

  return {
    id: "storyboard_generated",
    title: readNullableString((payload as { title?: unknown }).title, "title"),
    episodeTitle: readNullableString(
      (payload as { episodeTitle?: unknown }).episodeTitle,
      "episodeTitle",
    ),
    sourceMasterPlotId: "pending_source_master_plot_id",
    sourceTaskId: null,
    updatedAt: "pending_updated_at",
    approvedAt: null,
    scenes: scenes.map((scene, sceneIndex) => normalizeScene(scene, sceneIndex)),
  };
}

function normalizeScene(scene: unknown, sceneIndex: number) {
  if (!scene || typeof scene !== "object") {
    throw new Error("Gemini storyboard provider returned invalid scene");
  }

  const segments = (scene as { segments?: unknown }).segments;

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Gemini storyboard provider returned invalid segments");
  }

  return {
    id: `scene_${sceneIndex + 1}`,
    order: sceneIndex + 1,
    name: readNonEmptyString((scene as { name?: unknown }).name, "name"),
    dramaticPurpose: readNonEmptyString(
      (scene as { dramaticPurpose?: unknown }).dramaticPurpose,
      "dramaticPurpose",
    ),
    segments: segments.map((segment, segmentIndex) => normalizeSegment(segment, segmentIndex)),
  };
}

function normalizeSegment(segment: unknown, segmentIndex: number) {
  if (!segment || typeof segment !== "object") {
    throw new Error("Gemini storyboard provider returned invalid segment");
  }

  const durationSec = (segment as { durationSec?: unknown }).durationSec;

  return {
    id: `segment_${segmentIndex + 1}`,
    order: segmentIndex + 1,
    durationSec: typeof durationSec === "number" ? durationSec : null,
    visual: readNonEmptyString((segment as { visual?: unknown }).visual, "visual"),
    characterAction: readNonEmptyString(
      (segment as { characterAction?: unknown }).characterAction,
      "characterAction",
    ),
    dialogue: readString((segment as { dialogue?: unknown }).dialogue, "dialogue"),
    voiceOver: readString((segment as { voiceOver?: unknown }).voiceOver, "voiceOver"),
    audio: readString((segment as { audio?: unknown }).audio, "audio"),
    purpose: readNonEmptyString((segment as { purpose?: unknown }).purpose, "purpose"),
  };
}

function readNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini storyboard provider returned invalid ${fieldName}`);
  }

  return value;
}

function readString(value: unknown, fieldName: string) {
  if (typeof value !== "string") {
    throw new Error(`Gemini storyboard provider returned invalid ${fieldName}`);
  }

  return value;
}

function readNullableString(value: unknown, fieldName: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini storyboard provider returned invalid ${fieldName}`);
  }

  return value;
}
