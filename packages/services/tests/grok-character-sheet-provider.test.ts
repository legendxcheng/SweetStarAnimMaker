import { afterEach, describe, expect, it, vi } from "vitest";

import { createGrokCharacterSheetProvider } from "../src/index";

describe("grok character-sheet provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls chat completions and returns editable prompt text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Silver flight jacket, comet-glass visor, rain-scarred boots.",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGrokCharacterSheetProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
    });

    const result = await provider.generateCharacterPrompt({
      projectId: "proj_20260321_ab12cd",
      characterName: "Rin",
      masterPlot: {
        id: "mp_20260321_ab12cd",
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
        sourceTaskId: "task_master_plot",
        updatedAt: "2026-03-21T12:00:00.000Z",
        approvedAt: "2026-03-21T12:05:00.000Z",
      },
      promptText: "Design Rin's appearance prompt from the approved master plot.",
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

    expect(request.messages[0].content).toContain("character turnaround sheets");
    expect(request.messages[1].content).toContain("Design Rin's appearance prompt");
    expect(result).toEqual({
      promptText: "Silver flight jacket, comet-glass visor, rain-scarred boots.",
      rawResponse: "Silver flight jacket, comet-glass visor, rain-scarred boots.",
      provider: "grok",
      model: "grok-4.2",
    });
  });

  it("rejects responses without usable prompt text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      }),
    );

    const provider = createGrokCharacterSheetProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
    });

    await expect(
      provider.generateCharacterPrompt({
        projectId: "proj_20260321_ab12cd",
        characterName: "Rin",
        masterPlot: {
          id: "mp_20260321_ab12cd",
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
          sourceTaskId: "task_master_plot",
          updatedAt: "2026-03-21T12:00:00.000Z",
          approvedAt: "2026-03-21T12:05:00.000Z",
        },
        promptText: "Design Rin's appearance prompt from the approved master plot.",
      }),
    ).rejects.toThrow("Grok character sheet provider returned no usable content");
  });
});
