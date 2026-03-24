import type {
  GenerateMasterPlotInput,
  GenerateMasterPlotResult,
  MasterPlotProvider,
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
): MasterPlotProvider & StoryboardProvider {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiToken = options.apiToken?.trim();
  const model = options.model?.trim() || DEFAULT_MODEL;

  if (!apiToken) {
    throw new Error("VECTORENGINE_API_TOKEN is required for storyboard generation");
  }

  return {
    async generateMasterPlot(input: GenerateMasterPlotInput): Promise<GenerateMasterPlotResult> {
      const rawText = await requestGeminiJson({
        baseUrl,
        apiToken,
        model,
        timeoutMs: options.timeoutMs,
        errorLabel: "master plot",
        systemText:
          "You generate concise JSON master plot documents for short animated stories.",
        promptText: buildMasterPlotPromptText(input),
        responseJsonSchema: masterPlotResponseJsonSchema,
      });
      const masterPlot = normalizeMasterPlotPayload(JSON.parse(rawText));

      return {
        rawResponse: rawText,
        provider: "gemini",
        model,
        masterPlot,
      };
    },
    async generateStoryboard(input: GenerateStoryboardInput): Promise<GenerateStoryboardResult> {
      const rawText = await requestGeminiJson({
        baseUrl,
        apiToken,
        model,
        timeoutMs: options.timeoutMs,
        errorLabel: "storyboard",
        systemText: "You generate concise JSON storyboard documents for short animated stories.",
        promptText: buildStoryboardPromptText(input),
        responseJsonSchema: storyboardResponseJsonSchema,
      });
      const storyboard = normalizeStoryboardPayload(JSON.parse(rawText));

      return {
        rawResponse: rawText,
        provider: "gemini",
        model,
        storyboard,
      };
    },
  };
}

async function requestGeminiJson(input: {
  baseUrl: string;
  apiToken: string;
  model: string;
  timeoutMs?: number;
  errorLabel: string;
  systemText: string;
  promptText: string;
  responseJsonSchema: object;
}) {
  const controller = input.timeoutMs ? new AbortController() : null;
  const timeout =
    input.timeoutMs && controller ? setTimeout(() => controller.abort(), input.timeoutMs) : null;

  try {
    const response = await fetch(`${input.baseUrl}/v1beta/models/${input.model}:generateContent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: input.systemText }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.promptText }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: input.responseJsonSchema,
        },
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Gemini ${input.errorLabel} provider request failed with status ${response.status}`,
      );
    }

    const rawResponse = await response.json();
    return extractCandidateText(rawResponse);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Gemini ${input.errorLabel} provider request timed out`);
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function buildMasterPlotPromptText(input: GenerateMasterPlotInput) {
  return [`Project: ${input.projectId}`, `Premise: ${input.premiseText}`, "", "Prompt:", input.promptText].join(
    "\n",
  );
}

function buildStoryboardPromptText(input: GenerateStoryboardInput) {
  return [
    `Project: ${input.projectId}`,
    `Master Plot: ${input.masterPlot.logline}`,
    "",
    "Prompt:",
    input.promptText,
  ].join("\n");
}

const masterPlotResponseJsonSchema = {
  type: "object",
  required: [
    "title",
    "logline",
    "synopsis",
    "mainCharacters",
    "coreConflict",
    "emotionalArc",
    "endingBeat",
    "targetDurationSec",
  ],
  properties: {
    title: { type: ["string", "null"] },
    logline: { type: "string" },
    synopsis: { type: "string" },
    mainCharacters: {
      type: "array",
      items: { type: "string" },
    },
    coreConflict: { type: "string" },
    emotionalArc: { type: "string" },
    endingBeat: { type: "string" },
    targetDurationSec: { type: ["integer", "null"] },
  },
} as const;

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

function normalizeMasterPlotPayload(payload: unknown): GenerateMasterPlotResult["masterPlot"] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini master plot provider returned invalid master plot JSON");
  }

  const mainCharacters = (payload as { mainCharacters?: unknown }).mainCharacters;

  if (!Array.isArray(mainCharacters) || mainCharacters.length === 0) {
    throw new Error("Gemini master plot provider returned invalid mainCharacters");
  }

  const targetDurationSec = (payload as { targetDurationSec?: unknown }).targetDurationSec;

  return {
    title: readNullableString((payload as { title?: unknown }).title, "title"),
    logline: readNonEmptyString((payload as { logline?: unknown }).logline, "logline"),
    synopsis: readNonEmptyString((payload as { synopsis?: unknown }).synopsis, "synopsis"),
    mainCharacters: mainCharacters.map((character, index) =>
      readNonEmptyString(character, `mainCharacters[${index}]`),
    ),
    coreConflict: readNonEmptyString(
      (payload as { coreConflict?: unknown }).coreConflict,
      "coreConflict",
    ),
    emotionalArc: readNonEmptyString(
      (payload as { emotionalArc?: unknown }).emotionalArc,
      "emotionalArc",
    ),
    endingBeat: readNonEmptyString(
      (payload as { endingBeat?: unknown }).endingBeat,
      "endingBeat",
    ),
    targetDurationSec: typeof targetDurationSec === "number" ? targetDurationSec : null,
  };
}

function normalizeStoryboardPayload(payload: unknown): GenerateStoryboardResult["storyboard"] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini storyboard provider returned invalid storyboard JSON");
  }

  const scenes = (payload as { scenes?: unknown }).scenes;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("Gemini storyboard provider returned invalid scenes");
  }

  const normalizedScenes = scenes.map((scene, sceneIndex) => normalizeScene(scene, sceneIndex));
  assertStoryboardSegmentDurations(normalizedScenes);

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
    scenes: normalizedScenes,
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

function assertStoryboardSegmentDurations(
  scenes: GenerateStoryboardResult["storyboard"]["scenes"],
) {
  const segments = scenes.flatMap((scene) => scene.segments);

  if (segments.length === 0) {
    return;
  }

  segments.forEach((segment, index) => {
    if (segment.durationSec === null) {
      throw new Error("Gemini storyboard provider requires every segment to include durationSec");
    }

    if (segment.durationSec > 15) {
      throw new Error(
        "Gemini storyboard provider requires every segment to stay within 15 seconds",
      );
    }

    const isLastSegment = index === segments.length - 1;
    if (!isLastSegment && segment.durationSec < 10) {
      throw new Error(
        "Gemini storyboard provider requires non-final segments to be 10 to 15 seconds",
      );
    }
  });
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
