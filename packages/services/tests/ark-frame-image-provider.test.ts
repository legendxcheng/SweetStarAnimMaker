import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createArkFrameImageProvider } from "../src/index";

describe("ark frame image provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls Ark image generation and downloads the returned frame image", async () => {
    const pngBytes = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x04, 0x80,
    ]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "doubao-seedream-5-0-260128",
          created: 1777000000,
          data: [
            {
              url: "https://cdn.ark.example/frame.png",
              size: "2048x1152",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => pngBytes.buffer.slice(0),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createArkFrameImageProvider({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "test-token",
      model: "doubao-seedream-5-0-260128",
    });

    const result = await provider.generateShotImage({
      projectId: "proj_20260424_ab12cd",
      frameId: "frame_start_1",
      promptText: "雨夜市场的开场定格，角色站在反光水面前。",
      negativePromptText: "低清晰度、崩坏手部",
      referenceImagePaths: [],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://cdn.ark.example/frame.png",
      expect.objectContaining({ signal: undefined }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("doubao-seedream-5-0-260128");
    expect(request.prompt).toContain("雨夜市场的开场定格");
    expect(request.prompt).toContain("Negative prompt:");
    expect(request.size).toBe("2848x1600");
    expect(request.output_format).toBe("png");
    expect(request.watermark).toBe(false);

    expect(Array.from(result.imageBytes)).toEqual(Array.from(pngBytes));
    expect(result.width).toBe(2048);
    expect(result.height).toBe(1152);
    expect(result.provider).toBe("ark-frame-image");
    expect(result.model).toBe("doubao-seedream-5-0-260128");
  });

  it("uses doubao-seedream-5-0-260128 by default", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              url: "https://cdn.ark.example/default-frame.png",
              size: "1024x1024",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () =>
          Uint8Array.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04, 0x00,
          ]).buffer.slice(0),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createArkFrameImageProvider({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "test-token",
    });

    const result = await provider.generateShotImage({
      projectId: "proj_20260424_ab12cd",
      frameId: "frame_start_1",
      promptText: "雨夜市场的开场定格，角色站在反光水面前。",
      negativePromptText: null,
      referenceImagePaths: [],
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("doubao-seedream-5-0-260128");
    expect(result.model).toBe("doubao-seedream-5-0-260128");
  });

  it("reads and sends all reference images to Ark as base64 data URLs", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "ark-frame-ref-"));
    const pngBytes = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x04, 0x80,
    ]);
    const scenePngPath = path.join(tempDir, "scene-1.png");
    const sceneJpegPath = path.join(tempDir, "scene-2.JPG");
    const characterWebpPath = path.join(tempDir, "char-1.webp");
    await writeFile(scenePngPath, Uint8Array.from([1, 2, 3]));
    await writeFile(sceneJpegPath, Uint8Array.from([4, 5, 6]));
    await writeFile(characterWebpPath, Uint8Array.from([7, 8, 9]));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              url: "https://cdn.ark.example/frame.png",
              size: "2848x1600",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => pngBytes.buffer.slice(0),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createArkFrameImageProvider({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "test-token",
    });

    try {
      await provider.generateShotImage({
        projectId: "proj_20260424_ab12cd",
        frameId: "frame_start_1",
        promptText: "雨夜市场的开场定格，角色站在反光水面前。",
        negativePromptText: null,
        referenceImagePaths: [scenePngPath, sceneJpegPath, characterWebpPath],
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://ark.cn-beijing.volces.com/api/v3/images/generations",
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.image).toEqual([
      "data:image/png;base64,AQID",
      "data:image/jpeg;base64,BAUG",
      "data:image/webp;base64,BwgJ",
    ]);
  });

  it("fails when a reference image format is unsupported by Ark", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "ark-frame-ref-"));
    const unsupportedPath = path.join(tempDir, "scene.avif");
    await writeFile(unsupportedPath, Uint8Array.from([1, 2, 3]));

    const provider = createArkFrameImageProvider({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "test-token",
    });

    try {
      await expect(
        provider.generateShotImage({
          projectId: "proj_20260424_ab12cd",
          frameId: "frame_start_1",
          promptText: "雨夜市场的开场定格，角色站在反光水面前。",
          negativePromptText: null,
          referenceImagePaths: [unsupportedPath],
        }),
      ).rejects.toThrow("Unsupported Ark reference image format: .avif");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when SEEDANCE_API_KEY is missing", async () => {
    const provider = createArkFrameImageProvider({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "",
    });

    await expect(
      provider.generateShotImage({
        projectId: "proj_20260424_ab12cd",
        frameId: "frame_start_1",
        promptText: "雨夜市场的开场定格，角色站在反光水面前。",
        negativePromptText: null,
        referenceImagePaths: [],
      }),
    ).rejects.toThrow("SEEDANCE_API_KEY is required for frame image generation");
  });

  it("includes the response body when Ark returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error":{"message":"bad request"}}',
      }),
    );

    const provider = createArkFrameImageProvider({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "test-token",
    });

    await expect(
      provider.generateShotImage({
        projectId: "proj_20260424_ab12cd",
        frameId: "frame_start_1",
        promptText: "雨夜市场的开场定格，角色站在反光水面前。",
        negativePromptText: null,
        referenceImagePaths: [],
      }),
    ).rejects.toThrow(
      'Ark frame image provider request failed with status 400; body={"error":{"message":"bad request"}}',
    );
  });

  it("fails when Ark returns no usable image URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              size: "2048x1152",
            },
          ],
        }),
      }),
    );

    const provider = createArkFrameImageProvider({
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiToken: "test-token",
    });

    await expect(
      provider.generateShotImage({
        projectId: "proj_20260424_ab12cd",
        frameId: "frame_start_1",
        promptText: "雨夜市场的开场定格，角色站在反光水面前。",
        negativePromptText: null,
        referenceImagePaths: [],
      }),
    ).rejects.toThrow("Ark frame image provider returned no usable image");
  });
});
