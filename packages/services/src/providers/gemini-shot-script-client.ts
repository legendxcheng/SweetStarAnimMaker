import { buildProviderRequestError } from "./provider-request-error";

export interface RequestGeminiShotScriptJsonInput {
  apiToken: string;
  baseUrl: string;
  model: string;
  promptText: string;
  timeoutMs?: number;
}

const shotScriptSegmentResponseJsonSchema = {
  type: "object",
  required: ["name", "summary", "anchors", "segments", "shots"],
  properties: {
    name: { type: ["string", "null"] },
    summary: { type: "string" },
    anchors: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "label", "isRequired"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          isRequired: { type: "boolean" },
        },
      },
    },
    segments: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "fromAnchorId",
          "toAnchorId",
          "strategy",
          "transitionSmooth",
          "reason",
        ],
        properties: {
          id: { type: "string" },
          fromAnchorId: { type: "string" },
          toAnchorId: { type: "string" },
          strategy: {
            type: "string",
            enum: ["start_frame_only", "start_and_end_frame"],
          },
          transitionSmooth: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
    shots: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "sceneId",
          "segmentId",
          "order",
          "shotCode",
          "durationSec",
          "purpose",
          "visual",
          "subject",
          "action",
          "frameDependency",
          "dialogue",
          "os",
          "audio",
          "transitionHint",
          "continuityNotes",
        ],
        properties: {
          id: { type: "string" },
          sceneId: { type: "string" },
          segmentId: { type: "string" },
          order: { type: "integer" },
          shotCode: { type: "string" },
          durationSec: { type: ["integer", "null"] },
          purpose: { type: "string" },
          visual: { type: "string" },
          subject: { type: "string" },
          action: { type: "string" },
          frameDependency: { type: "string" },
          dialogue: { type: ["string", "null"] },
          os: { type: ["string", "null"] },
          audio: { type: ["string", "null"] },
          transitionHint: { type: ["string", "null"] },
          continuityNotes: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

export async function requestGeminiShotScriptJson(
  input: RequestGeminiShotScriptJsonInput,
) {
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
          parts: [
            {
              text: "You generate structured JSON shot scripts for exactly one storyboard segment. All reviewable narrative fields must be in Simplified Chinese.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.promptText }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: shotScriptSegmentResponseJsonSchema,
        },
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      const bodyText = typeof response.text === "function" ? await response.text() : null;
      throw buildProviderRequestError("Gemini shot script", response.status, bodyText);
    }

    const rawResponse = await response.json();
    return extractCandidateText(rawResponse);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini shot script provider request timed out");
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

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
    throw new Error("Gemini shot script provider returned no usable content");
  }

  return text;
}
