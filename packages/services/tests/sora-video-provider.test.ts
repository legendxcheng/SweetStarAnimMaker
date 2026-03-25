import { afterEach, describe, expect, it, vi } from "vitest";

import { createSoraVideoProvider } from "../src/index";

describe("sora video provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("submits a double-image sora task with the expected payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "sora-2:task_123",
        status: "pending",
        status_update_time: 1762010645686,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSoraVideoProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      modelName: "sora-2-all",
    });

    const result = await provider.submitImageToVideo({
      image: "https://cdn.example/start.png",
      imageTail: "https://cdn.example/end.png",
      promptText: "让首尾帧之间平滑转场，角色向镜头缓慢靠近。",
      orientation: "portrait",
      size: "large",
      durationSeconds: 15,
      watermark: false,
      private: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/video/create",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.images).toEqual([
      "https://cdn.example/start.png",
      "https://cdn.example/end.png",
    ]);
    expect(request.model).toBe("sora-2-all");
    expect(request.orientation).toBe("portrait");
    expect(request.prompt).toBe("让首尾帧之间平滑转场，角色向镜头缓慢靠近。");
    expect(request.size).toBe("large");
    expect(request.duration).toBe(15);
    expect(request.watermark).toBe(false);
    expect(request.private).toBe(true);
    expect(result.taskId).toBe("sora-2:task_123");
    expect(result.status).toBe("pending");
    expect(result.modelName).toBe("sora-2-all");
  });

  it("defaults to sora-2-all landscape large 15s when optional settings are omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "sora-2:task_defaults",
        status: "pending",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSoraVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.submitImageToVideo({
      image: "https://cdn.example/start.png",
      imageTail: "https://cdn.example/end.png",
      promptText: "make animate",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("sora-2-all");
    expect(request.orientation).toBe("landscape");
    expect(request.size).toBe("large");
    expect(request.duration).toBe(15);
    expect(request.watermark).toBeUndefined();
    expect(request.private).toBeUndefined();
    expect(result.modelName).toBe("sora-2-all");
  });

  it("uploads local image paths before submitting the task", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "sora-2:task_uploaded",
        status: "pending",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const uploader = {
      uploadReferenceImage: vi
        .fn()
        .mockResolvedValueOnce("https://cdn.example/uploaded-start.png")
        .mockResolvedValueOnce("https://cdn.example/uploaded-end.png"),
    };

    const provider = createSoraVideoProvider({
      apiToken: "test-token",
      referenceImageUploader: uploader,
    });

    await provider.submitImageToVideo({
      image: "E:/tmp/start.png",
      imageTail: "E:/tmp/end.png",
      promptText: "make animate",
    });

    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(1, {
      localFilePath: "E:/tmp/start.png",
    });
    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(2, {
      localFilePath: "E:/tmp/end.png",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.images).toEqual([
      "https://cdn.example/uploaded-start.png",
      "https://cdn.example/uploaded-end.png",
    ]);
  });

  it("queries a sora task and normalizes video and thumbnail urls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "sora-2:task_123",
        status: "completed",
        video_url: "https://cdn.example/output.mp4",
        thumbnail_url: "https://cdn.example/output.webp",
        enhanced_prompt: "enhanced prompt text",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSoraVideoProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
    });

    const result = await provider.getImageToVideoTask({
      taskId: "sora-2:task_123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/video/query?id=sora-2%3Atask_123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result.taskId).toBe("sora-2:task_123");
    expect(result.status).toBe("completed");
    expect(result.videoUrl).toBe("https://cdn.example/output.mp4");
    expect(result.thumbnailUrl).toBe("https://cdn.example/output.webp");
    expect(result.enhancedPrompt).toBe("enhanced prompt text");
    expect(result.completed).toBe(true);
    expect(result.failed).toBe(false);
    expect(result.errorMessage).toBeNull();
  });

  it("polls until the sora task reaches a terminal state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "sora-2:task_123",
          status: "pending",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "sora-2:task_123",
          status: "processing",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "sora-2:task_123",
          status: "completed",
          video_url: "https://cdn.example/output.mp4",
          thumbnail_url: "https://cdn.example/output.webp",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSoraVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.waitForImageToVideoTask({
      taskId: "sora-2:task_123",
      pollIntervalMs: 0,
      timeoutMs: 5_000,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.status).toBe("completed");
    expect(result.videoUrl).toBe("https://cdn.example/output.mp4");
    expect(result.thumbnailUrl).toBe("https://cdn.example/output.webp");
  });

  it("uses a 2 hour default polling timeout for long-running video generation tasks", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "sora-2:task_123",
        status: "pending",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSoraVideoProvider({
      apiToken: "test-token",
    });

    const resultPromise = provider.waitForImageToVideoTask({
      taskId: "sora-2:task_123",
      pollIntervalMs: 600_000,
    });
    const expectation = expect(resultPromise).rejects.toThrow(
      "Sora video provider polling timed out after 7200000ms for task sora-2:task_123",
    );

    await vi.advanceTimersByTimeAsync(7_200_001);

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(13);
  });

  it("surfaces response body and request id on failed submit requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"message":"bad images"}',
        headers: {
          get(name: string) {
            return name.toLowerCase() === "x-request-id" ? "req_sora_400" : null;
          },
        },
      }),
    );

    const provider = createSoraVideoProvider({
      apiToken: "test-token",
    });

    await expect(
      provider.submitImageToVideo({
        image: "https://cdn.example/start.png",
        imageTail: "https://cdn.example/end.png",
        promptText: "make animate",
      }),
    ).rejects.toThrow(
      'Sora video provider request failed with status 400; requestId=req_sora_400; body={"message":"bad images"}',
    );
  });

  it("aborts hung requests with the default timeout even when timeoutMs is omitted", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSoraVideoProvider({
      apiToken: "test-token",
    });

    const resultPromise = provider.getImageToVideoTask({
      taskId: "sora-2:task_hung",
    });
    const expectation = expect(resultPromise).rejects.toThrow(
      "Sora video provider request timed out",
    );

    await vi.advanceTimersByTimeAsync(60_001);

    await expectation;
  });
});
