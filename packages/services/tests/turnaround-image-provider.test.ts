import { afterEach, describe, expect, it, vi } from "vitest";

import { createTurnaroundImageProvider } from "../src/index";

describe("turnaround image provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the image generation endpoint and returns a combined turnaround payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: "AQID",
            width: 1536,
            height: 1024,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createTurnaroundImageProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "imagen-4.0-generate-preview",
    });

    const result = await provider.generateCharacterSheetImage({
      projectId: "proj_20260321_ab12cd",
      characterId: "char_rin_1",
      promptText: "Create a combined turnaround sheet for Rin with pilot gear and comet motifs.",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.model).toBe("imagen-4.0-generate-preview");
    expect(request.prompt).toContain("combined turnaround sheet for Rin");
    expect(request.response_format).toBe("b64_json");
    expect(Array.from(result.imageBytes)).toEqual([1, 2, 3]);
    expect(result.width).toBe(1536);
    expect(result.height).toBe(1024);
    expect(result.provider).toBe("turnaround-image");
    expect(result.model).toBe("imagen-4.0-generate-preview");
  });

  it("rejects responses without image data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              b64_json: "AQID",
            },
          ],
        }),
      }),
    );

    const provider = createTurnaroundImageProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "imagen-4.0-generate-preview",
    });

    await expect(
      provider.generateCharacterSheetImage({
        projectId: "proj_20260321_ab12cd",
        characterId: "char_rin_1",
        promptText: "Create a combined turnaround sheet for Rin.",
      }),
    ).rejects.toThrow("Turnaround image provider returned no usable image");
  });
});
