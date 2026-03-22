import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createReferenceImageUploader } from "../src/index";

describe("reference image uploader", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("exports the uploader factory from services index", () => {
    expect(createReferenceImageUploader).toBeTypeOf("function");
  });

  it("uses default provider order when the configured list is empty", async () => {
    const localFilePath = await createTempImageFile(tempDirs);
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        status: 200,
        payload: {
          data: {
            url: "https://cdn.example/default-order.png",
          },
        },
      }),
    );
    const uploader = createReferenceImageUploader({
      providerOrder: [],
      fetchFn: fetchMock as typeof fetch,
    });

    const url = await uploader.uploadReferenceImage({ localFilePath });

    expect(url).toBe("https://cdn.example/default-order.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://p.sda1.dev/api/v1/upload_external_noform?filename=reference.png",
    );
  });

  it("uploads via psda1 when psda1 succeeds", async () => {
    const localFilePath = await createTempImageFile(tempDirs);
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        status: 200,
        payload: {
          data: {
            url: "https://cdn.example/psda1.png",
          },
        },
      }),
    );
    const uploader = createReferenceImageUploader({
      providerOrder: ["psda1"],
      fetchFn: fetchMock as typeof fetch,
    });

    const url = await uploader.uploadReferenceImage({ localFilePath });

    expect(url).toBe("https://cdn.example/psda1.png");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://p.sda1.dev/api/v1/upload_external_noform?filename=reference.png",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: expect.any(Uint8Array),
      }),
    );
  });

  it("falls back to picgo when psda1 fails", async () => {
    const localFilePath = await createTempImageFile(tempDirs);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: false,
          status: 500,
          payload: { error: "Backend error" },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: true,
          status: 200,
          payload: {
            image: {
              url: "https://cdn.example/picgo.png",
            },
          },
        }),
      );
    const uploader = createReferenceImageUploader({
      providerOrder: ["psda1", "picgo"],
      picgoApiKey: "test-key",
      fetchFn: fetchMock as typeof fetch,
    });

    const url = await uploader.uploadReferenceImage({ localFilePath });

    expect(url).toBe("https://cdn.example/picgo.png");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://www.picgo.net/api/1/upload");
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: {
          "X-API-Key": "test-key",
        },
      }),
    );
  });

  it("errors when picgo is configured without PICGO_API_KEY", async () => {
    const localFilePath = await createTempImageFile(tempDirs);
    const uploader = createReferenceImageUploader({
      providerOrder: ["picgo"],
      fetchFn: vi.fn() as typeof fetch,
    });

    await expect(uploader.uploadReferenceImage({ localFilePath })).rejects.toThrow(
      "Reference image upload failed: picgo: PICGO_API_KEY is not set",
    );
  });

  it("aggregates errors when all providers fail", async () => {
    const localFilePath = await createTempImageFile(tempDirs);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: false,
          status: 500,
          payload: { error: "Backend error" },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: false,
          status: 503,
          payload: { error: { message: "PicGo unavailable" } },
        }),
      );
    const uploader = createReferenceImageUploader({
      providerOrder: ["psda1", "picgo"],
      picgoApiKey: "test-key",
      fetchFn: fetchMock as typeof fetch,
    });

    await expect(uploader.uploadReferenceImage({ localFilePath })).rejects.toThrow(
      "Reference image upload failed: psda1: HTTP 500: Backend error; picgo: HTTP 503: PicGo unavailable",
    );
  });

  it("rejects when the local file path does not exist", async () => {
    const fetchMock = vi.fn();
    const uploader = createReferenceImageUploader({
      providerOrder: ["psda1"],
      fetchFn: fetchMock as typeof fetch,
    });

    await expect(
      uploader.uploadReferenceImage({ localFilePath: "E:/tmp/missing-reference.png" }),
    ).rejects.toThrow(/ENOENT|no such file or directory/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

async function createTempImageFile(tempDirs: string[]) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-reference-image-"));
  const localFilePath = path.join(tempDir, "reference.png");
  tempDirs.push(tempDir);
  await fs.writeFile(localFilePath, new Uint8Array([1, 2, 3]));
  return localFilePath;
}

function createJsonResponse(input: {
  ok: boolean;
  status: number;
  payload: unknown;
}) {
  return {
    ok: input.ok,
    status: input.status,
    json: async () => input.payload,
    text: async () => JSON.stringify(input.payload),
  };
}
