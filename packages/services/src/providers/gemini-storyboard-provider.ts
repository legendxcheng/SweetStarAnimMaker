import type {
  GenerateStoryboardInput,
  GenerateStoryboardResult,
  LlmStoryboardProvider,
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
): LlmStoryboardProvider {
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
                    "You generate concise JSON storyboard documents with a summary and scene list.",
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
          rawResponse,
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
  const sections = [
    `Project: ${input.projectId}`,
    "Generate a storyboard for this script.",
    input.script,
  ];

  if (input.reviewContext) {
    sections.push(
      [
        "Regeneration guidance:",
        input.reviewContext.reason,
        `Rejected version id: ${input.reviewContext.rejectedVersionId}`,
      ].join("\n"),
    );
  }

  return sections.join("\n\n");
}

const storyboardResponseJsonSchema = {
  type: "object",
  required: ["summary", "scenes"],
  properties: {
    summary: { type: "string" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        required: ["sceneIndex", "description", "camera", "characters", "prompt"],
        properties: {
          sceneIndex: { type: "integer" },
          description: { type: "string" },
          camera: { type: "string" },
          characters: {
            type: "array",
            items: { type: "string" },
          },
          prompt: { type: "string" },
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

  const summary = readNonEmptyString((payload as { summary?: unknown }).summary, "summary");
  const scenes = (payload as { scenes?: unknown }).scenes;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("Gemini storyboard provider returned invalid storyboard scenes");
  }

  return {
    summary,
    scenes: scenes.map((scene, index) => {
      if (!scene || typeof scene !== "object") {
        throw new Error("Gemini storyboard provider returned invalid storyboard scenes");
      }

      const sceneIndex = Number((scene as { sceneIndex?: unknown }).sceneIndex ?? index + 1);

      if (!Number.isInteger(sceneIndex) || sceneIndex <= 0) {
        throw new Error("Gemini storyboard provider returned invalid sceneIndex");
      }

      const characters = (scene as { characters?: unknown }).characters;

      if (!Array.isArray(characters) || !characters.every((value) => typeof value === "string")) {
        throw new Error("Gemini storyboard provider returned invalid scene characters");
      }

      return {
        id: `scene_${sceneIndex}`,
        sceneIndex,
        description: readNonEmptyString(
          (scene as { description?: unknown }).description,
          "description",
        ),
        camera: readNonEmptyString((scene as { camera?: unknown }).camera, "camera"),
        characters,
        prompt: readNonEmptyString((scene as { prompt?: unknown }).prompt, "prompt"),
      };
    }),
  };
}

function readNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Gemini storyboard provider returned invalid ${fieldName}`);
  }

  return value;
}
