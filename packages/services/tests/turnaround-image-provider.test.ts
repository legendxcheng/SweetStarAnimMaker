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
    const uploader = {
      uploadReferenceImage: vi.fn(),
    };

    const provider = createTurnaroundImageProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "imagen-4.0-generate-preview",
      referenceImageUploader: uploader,
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
    expect(request.image).toBeUndefined();
    expect(uploader.uploadReferenceImage).not.toHaveBeenCalled();
    expect(Array.from(result.imageBytes)).toEqual([1, 2, 3]);
    expect(result.width).toBe(1536);
    expect(result.height).toBe(1024);
    expect(result.provider).toBe("turnaround-image");
    expect(result.model).toBe("imagen-4.0-generate-preview");
  });

  it("uses doubao-seedream-5-0-260128 when no explicit model is provided", async () => {
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
    });

    const result = await provider.generateCharacterSheetImage({
      projectId: "proj_20260321_ab12cd",
      characterId: "char_rin_1",
      promptText: "Create a combined turnaround sheet for Rin with pilot gear and comet motifs.",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("doubao-seedream-5-0-260128");
    expect(result.model).toBe("doubao-seedream-5-0-260128");
  });

  it("accepts VectorEngine responses that use size and a data URL b64_json payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              b64_json: "data:image/jpeg;base64,AQID",
              size: "3200x3200",
            },
          ],
        }),
      }),
    );

    const provider = createTurnaroundImageProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "doubao-seedream-5-0-260128",
    });

    const result = await provider.generateCharacterSheetImage({
      projectId: "proj_20260321_ab12cd",
      characterId: "char_rin_1",
      promptText: "Create a combined turnaround sheet for Rin.",
    });

    expect(Array.from(result.imageBytes)).toEqual([1, 2, 3]);
    expect(result.width).toBe(3200);
    expect(result.height).toBe(3200);
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

  it("uploads reference images and sends their URLs to VectorEngine", async () => {
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
    const uploader = {
      uploadReferenceImage: vi
        .fn()
        .mockResolvedValueOnce("https://cdn.example/ref-1.png")
        .mockResolvedValueOnce("https://cdn.example/ref-2.png"),
    };

    const provider = createTurnaroundImageProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "imagen-4.0-generate-preview",
      referenceImageUploader: uploader,
    });

    await provider.generateCharacterSheetImage({
      projectId: "proj_20260321_ab12cd",
      characterId: "char_rin_1",
      promptText: "Create a combined turnaround sheet for Rin.",
      referenceImagePaths: ["E:/tmp/ref-1.png", "E:/tmp/ref-2.png"],
    });

    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(1, {
      localFilePath: "E:/tmp/ref-1.png",
    });
    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(2, {
      localFilePath: "E:/tmp/ref-2.png",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.image).toEqual([
      "https://cdn.example/ref-1.png",
      "https://cdn.example/ref-2.png",
    ]);
  });

  it("fails before calling VectorEngine when reference image upload fails", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const uploader = {
      uploadReferenceImage: vi
        .fn()
        .mockRejectedValue(new Error("Reference image upload failed: psda1: HTTP 500: Backend error")),
    };

    const provider = createTurnaroundImageProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "imagen-4.0-generate-preview",
      referenceImageUploader: uploader,
    });

    await expect(
      provider.generateCharacterSheetImage({
        projectId: "proj_20260321_ab12cd",
        characterId: "char_rin_1",
        promptText: "Create a combined turnaround sheet for Rin.",
        referenceImagePaths: ["E:/tmp/ref-1.png"],
      }),
    ).rejects.toThrow("Reference image upload failed: psda1: HTTP 500: Backend error");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("includes the response body and request id when VectorEngine returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => '{"error":"service overloaded"}',
        headers: {
          get(name: string) {
            return name.toLowerCase() === "x-request-id" ? "req_503_debug" : null;
          },
        },
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
    ).rejects.toThrow(
      'Turnaround image provider request failed with status 503; requestId=req_503_debug; body={"error":"service overloaded"}',
    );
  });
});
