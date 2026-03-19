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
                    title: "The Last Sky Choir",
                    logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
                    synopsis:
                      "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
                    mainCharacters: ["Rin", "Ivo"],
                    coreConflict:
                      "Rin must choose between private escape and saving the city that exiled her.",
                    emotionalArc: "She moves from bitterness to sacrificial hope.",
                    endingBeat: "Rin turns the comet's music into a rising tide of light.",
                    targetDurationSec: 480,
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

    const result = await provider.generateMasterPlot({
      projectId: "proj_20260317_ab12cd",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptText: "Turn this premise into a master plot:\n{{premiseText}}",
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

    expect(request.systemInstruction.parts[0].text).toContain("master plot");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseJsonSchema.properties.mainCharacters).toBeDefined();
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-3.1-pro-preview");
    expect(result.masterPlot.title).toBe("The Last Sky Choir");
    expect(result.rawResponse).toContain("The Last Sky Choir");
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
      provider.generateMasterPlot({
        projectId: "proj_20260317_ab12cd",
        premiseText: "Scene 1",
        promptText: "Turn this premise into a master plot.",
      }),
    ).rejects.toThrow("Gemini master plot provider request failed with status 401");
  });

  it("rejects responses without usable master-plot content", async () => {
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
      provider.generateMasterPlot({
        projectId: "proj_20260317_ab12cd",
        premiseText: "Scene 1",
        promptText: "Turn this premise into a master plot.",
      }),
    ).rejects.toThrow("Gemini master plot provider returned no usable content");
  });

  it("includes premise and prompt text in the request body", async () => {
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
                    logline: "A lonely mechanic bargains with a star trapped in iron.",
                    synopsis:
                      "She must free the star before the empire turns it into a weapon.",
                    mainCharacters: ["Mara", "The Star"],
                    coreConflict: "Mercy collides with survival under occupation.",
                    emotionalArc: "Mara learns that intimacy requires risk.",
                    endingBeat: "She opens the foundry roof and lets dawn choose for her.",
                    targetDurationSec: null,
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

    await provider.generateMasterPlot({
      projectId: "proj_20260317_ab12cd",
      premiseText: "A lonely mechanic bargains with a star trapped in iron.",
      promptText: "Expand this premise into a romantic tragedy.",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0].parts[0].text as string;

    expect(promptText).toContain("Premise: A lonely mechanic bargains with a star trapped in iron.");
    expect(promptText).toContain("Expand this premise into a romantic tragedy.");
  });
});
