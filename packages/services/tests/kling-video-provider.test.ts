import { afterEach, describe, expect, it, vi } from "vitest";

import { createKlingVideoProvider } from "../src/index";

describe("kling video provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("submits an image-to-video task with image and image_tail", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "kling_task_123",
          task_status: "submitted",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingVideoProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
    });

    const result = await provider.submitImageToVideo({
      image: "https://cdn.example/start.png",
      imageTail: "https://cdn.example/end.png",
      promptText: "镜头从雨夜街头推进到角色回头。",
      negativePromptText: "低清晰度，闪烁，畸变",
      durationSeconds: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/kling/v1/videos/image2video",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model_name).toBe("kling-v3");
    expect(request.mode).toBe("pro");
    expect(request.image).toBe("https://cdn.example/start.png");
    expect(request.image_tail).toBe("https://cdn.example/end.png");
    expect(request.prompt).toBe("镜头从雨夜街头推进到角色回头。");
    expect(request.negative_prompt).toBe("低清晰度，闪烁，畸变");
    expect(request.duration).toBe(5);
    expect(result.taskId).toBe("kling_task_123");
    expect(result.status).toBe("submitted");
    expect(result.modelName).toBe("kling-v3");
    expect(result.mode).toBe("pro");
  });

  it("defaults duration to 5 seconds when none is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "kling_task_default_duration",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingVideoProvider({
      apiToken: "test-token",
    });

    await provider.submitImageToVideo({
      image: "https://cdn.example/start.png",
      imageTail: "https://cdn.example/end.png",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.duration).toBe(5);
  });

  it("uploads local image paths before submitting the task", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "kling_task_upload",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const uploader = {
      uploadReferenceImage: vi
        .fn()
        .mockResolvedValueOnce("https://cdn.example/local-start.png")
        .mockResolvedValueOnce("https://cdn.example/local-end.png"),
    };

    const provider = createKlingVideoProvider({
      apiToken: "test-token",
      referenceImageUploader: uploader,
    });

    await provider.submitImageToVideo({
      image: "E:/tmp/start.png",
      imageTail: "E:/tmp/end.png",
    });

    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(1, {
      localFilePath: "E:/tmp/start.png",
    });
    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(2, {
      localFilePath: "E:/tmp/end.png",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.image).toBe("https://cdn.example/local-start.png");
    expect(request.image_tail).toBe("https://cdn.example/local-end.png");
  });

  it("queries a single task and normalizes status and video url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "kling_task_123",
          task_status: "succeed",
          video_url: "https://cdn.example/output.mp4",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingVideoProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
    });

    const result = await provider.getImageToVideoTask({
      taskId: "kling_task_123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/kling/v1/videos/image2video/kling_task_123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result.taskId).toBe("kling_task_123");
    expect(result.status).toBe("succeed");
    expect(result.videoUrl).toBe("https://cdn.example/output.mp4");
    expect(result.errorMessage).toBeNull();
    expect(result.completed).toBe(true);
    expect(result.failed).toBe(false);
  });

  it("does not treat a top-level success message as an error message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          task_id: "kling_task_queued",
          task_status: "submitted",
        },
        message: "SUCCEED",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.getImageToVideoTask({
      taskId: "kling_task_queued",
    });

    expect(result.status).toBe("submitted");
    expect(result.errorMessage).toBeNull();
    expect(result.completed).toBe(false);
    expect(result.failed).toBe(false);
  });

  it("polls until the task reaches a terminal state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_123",
            task_status: "submitted",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_123",
            task_status: "processing",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_123",
            task_status: "succeed",
            video_url: "https://cdn.example/output.mp4",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.waitForImageToVideoTask({
      taskId: "kling_task_123",
      pollIntervalMs: 0,
      timeoutMs: 5_000,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.status).toBe("succeed");
    expect(result.videoUrl).toBe("https://cdn.example/output.mp4");
  });

  it("surfaces response body and request id on failed submit requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"message":"bad image"}',
        headers: {
          get(name: string) {
            return name.toLowerCase() === "x-request-id" ? "req_kling_400" : null;
          },
        },
      }),
    );

    const provider = createKlingVideoProvider({
      apiToken: "test-token",
    });

    await expect(
      provider.submitImageToVideo({
        image: "https://cdn.example/start.png",
        imageTail: "https://cdn.example/end.png",
      }),
    ).rejects.toThrow(
      'Kling video provider request failed with status 400; requestId=req_kling_400; body={"message":"bad image"}',
    );
  });
});
