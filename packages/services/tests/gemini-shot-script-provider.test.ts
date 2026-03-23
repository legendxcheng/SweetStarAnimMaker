import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiShotScriptProvider } from "../src/index";

describe("gemini shot script provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the Gemini generateContent endpoint with schema-constrained JSON output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: "Episode 1 Shot Script",
                    shots: [
                      {
                        sceneId: "scene_1",
                        segmentId: "segment_1",
                        shotCode: "S01-SG01",
                        shotPurpose: "Establish the flooded market",
                        subjectCharacters: ["Rin"],
                        environment: "Flooded dawn market",
                        framing: "medium wide shot",
                        cameraAngle: "eye level",
                        composition: "Rin framed by hanging lanterns",
                        actionMoment: "Rin pauses at the waterline",
                        emotionTone: "uneasy anticipation",
                        continuityNotes: "Keep soaked satchel on left shoulder",
                        imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
                        negativePrompt: null,
                        motionHint: null,
                        durationSec: 4,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    const result = await provider.generateShotScript({
      promptText: "Turn storyboard segments into shot script JSON.",
      variables: {
        storyboard: {
          title: "The Last Sky Choir",
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1beta/models/gemini-3.1-pro-preview:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.systemInstruction.parts[0].text).toContain("shot script");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseJsonSchema.properties.shots).toBeDefined();
    expect(result.shotScript.title).toBe("Episode 1 Shot Script");
    expect(result.shotScript.shots[0]?.segmentId).toBe("segment_1");
    expect(result.rawResponse).toContain("S01-SG01");
  });

  it("rejects non-2xx provider responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "unauthorized",
      }),
    );

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateShotScript({
        promptText: "Turn storyboard segments into shot script JSON.",
        variables: {},
      }),
    ).rejects.toThrow("Gemini shot script provider request failed with status 401");
  });

  it("rejects responses without usable shot script content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      }),
    );

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateShotScript({
        promptText: "Turn storyboard segments into shot script JSON.",
        variables: {},
      }),
    ).rejects.toThrow("Gemini shot script provider returned no usable content");
  });

  it("includes the prompt text in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: null,
                    shots: [
                      {
                        sceneId: "scene_1",
                        segmentId: "segment_1",
                        shotCode: "S01-SG01",
                        shotPurpose: "Establish the flooded market",
                        subjectCharacters: ["Rin"],
                        environment: "Flooded dawn market",
                        framing: "medium wide shot",
                        cameraAngle: "eye level",
                        composition: "Rin framed by hanging lanterns",
                        actionMoment: "Rin pauses at the waterline",
                        emotionTone: "uneasy anticipation",
                        continuityNotes: "Keep soaked satchel on left shoulder",
                        imagePrompt: "anime storyboard frame of Rin in a flooded market at dawn",
                        negativePrompt: null,
                        motionHint: null,
                        durationSec: 4,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await provider.generateShotScript({
      promptText: "Focus on atmospheric anime cinematic prompts.",
      variables: {
        storyboard: {
          title: "The Last Sky Choir",
        },
      },
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0].parts[0].text as string;

    expect(promptText).toContain("Focus on atmospheric anime cinematic prompts.");
  });
});
