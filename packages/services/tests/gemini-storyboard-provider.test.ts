import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiStoryboardProvider } from "../src/index";

describe("gemini storyboard provider", () => {
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
                    summary: "A short story summary",
                    scenes: [
                      {
                        sceneIndex: 1,
                        description: "A enters the room",
                        camera: "medium shot",
                        characters: ["A"],
                        prompt: "medium shot, character A entering a dim room",
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

    const provider = createGeminiStoryboardProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    const result = await provider.generateStoryboard({
      projectId: "proj_20260317_ab12cd",
      script: "Scene 1: A enters the room",
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

    expect(request.systemInstruction.parts[0].text).toContain("storyboard");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseJsonSchema.properties.scenes).toBeDefined();
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-3.1-pro-preview");
    expect(result.storyboard.scenes[0]?.id).toBe("scene_1");
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

    const provider = createGeminiStoryboardProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateStoryboard({
        projectId: "proj_20260317_ab12cd",
        script: "Scene 1",
      }),
    ).rejects.toThrow("Gemini storyboard provider request failed with status 401");
  });

  it("rejects responses without usable storyboard content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      }),
    );

    const provider = createGeminiStoryboardProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateStoryboard({
        projectId: "proj_20260317_ab12cd",
        script: "Scene 1",
      }),
    ).rejects.toThrow("Gemini storyboard provider returned no usable content");
  });

  it("adds regeneration guidance when review context is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "A short story summary",
                    scenes: [
                      {
                        sceneIndex: 1,
                        description: "A enters the room",
                        camera: "medium shot",
                        characters: ["A"],
                        prompt: "medium shot, character A entering a dim room",
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

    const provider = createGeminiStoryboardProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await provider.generateStoryboard({
      projectId: "proj_20260317_ab12cd",
      script: "Scene 1: A enters the room",
      reviewContext: {
        reason: "Need stronger scene transitions.",
        rejectedVersionId: "sbv_20260317_prev",
      },
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0].parts[0].text as string;

    expect(promptText).toContain("Regeneration guidance:");
    expect(promptText).toContain("Need stronger scene transitions.");
    expect(promptText).toContain("sbv_20260317_prev");
  });
});
