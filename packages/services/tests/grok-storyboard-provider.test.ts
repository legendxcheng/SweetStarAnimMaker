import { afterEach, describe, expect, it, vi } from "vitest";

import { createGrokStoryboardProvider } from "../src/index";

describe("grok storyboard provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls chat completions for master-plot JSON output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "The Last Sky Choir",
                logline: "A disgraced pilot chases a cosmic song to save her flooded home.",
                synopsis:
                  "A fallen courier hears a comet sing and discovers the drowned city can still be lifted.",
                mainCharacters: ["Rin", "Ivo"],
                coreConflict: "Rin must choose between escape and saving the city.",
                emotionalArc: "She moves from bitterness to hope.",
                endingBeat: "The city rises on a final chorus of light.",
                targetDurationSec: 120,
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGrokStoryboardProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
    });

    const result = await provider.generateMasterPlot({
      projectId: "proj_20260321_ab12cd",
      premiseText: "A washed-up pilot discovers a singing comet above a drowned city.",
      promptText: "Turn this premise into one cohesive master plot.",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.messages[0].content).toContain("master plot");
    expect(request.response_format).toEqual({
      type: "json_object",
    });
    expect(result.masterPlot.title).toBe("The Last Sky Choir");
    expect(result.masterPlot.mainCharacters).toEqual(["Rin", "Ivo"]);
    expect(result.provider).toBe("grok");
    expect(result.rawResponse).toContain("The Last Sky Choir");
  });

  it("calls chat completions for storyboard JSON output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "The Last Sky Choir",
                episodeTitle: "Episode 1",
                scenes: [
                  {
                    name: "Rin Hears The Sky",
                    dramaticPurpose: "Trigger the inciting beat.",
                    segments: [
                      {
                        durationSec: 9,
                        visual: "Rain shakes across the cockpit glass.",
                        characterAction: "Rin looks up.",
                        dialogue: "",
                        voiceOver: "That sound again.",
                        audio: "",
                        purpose: "Start the mystery.",
                      },
                    ],
                  },
                ],
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGrokStoryboardProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
    });

    const result = await provider.generateStoryboard({
      projectId: "proj_20260321_ab12cd",
      masterPlot: {
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
      },
      promptText: "Turn this master plot into storyboard scenes.",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.messages[0].content).toContain("storyboard");
    expect(request.response_format).toEqual({
      type: "json_object",
    });
    expect(result.model).toBe("grok-4.2");
    expect(result.storyboard.title).toBe("The Last Sky Choir");
    expect(result.storyboard.scenes[0]?.segments[0]?.voiceOver).toBe("That sound again.");
    expect(result.rawResponse).toContain("The Last Sky Choir");
  });
});
