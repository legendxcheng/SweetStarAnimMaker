import { afterEach, describe, expect, it, vi } from "vitest";

import { createWanVideoProvider } from "../src/index";

describe("wan video provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("submits an image-to-video task with the expected payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        request_id: "req_wan_submit",
        output: {
          task_id: "wan_task_123",
          task_status: "PENDING",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createWanVideoProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      modelName: "wan2.6-i2v",
    });

    const result = await provider.submitImageToVideo({
      image: "https://cdn.example/start.png",
      promptText: "让角色轻微眨眼，发丝随风摆动，镜头缓慢推进。",
      resolution: "480P",
      promptExtend: true,
      audio: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/alibailian/api/v1/services/aigc/video-generation/video-synthesis",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("wan2.6-i2v");
    expect(request.input.prompt).toBe("让角色轻微眨眼，发丝随风摆动，镜头缓慢推进。");
    expect(request.input.img_url).toBe("https://cdn.example/start.png");
    expect(request.parameters).toEqual({
      resolution: "480P",
      prompt_extend: true,
      audio: true,
    });
    expect(result.taskId).toBe("wan_task_123");
    expect(result.status).toBe("PENDING");
    expect(result.modelName).toBe("wan2.6-i2v");
  });

  it("uploads a local image path before submitting the task", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: {
          task_id: "wan_task_upload",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const uploader = {
      uploadReferenceImage: vi
        .fn()
        .mockResolvedValueOnce("https://cdn.example/uploaded-start.png"),
    };

    const provider = createWanVideoProvider({
      apiToken: "test-token",
      referenceImageUploader: uploader,
    });

    await provider.submitImageToVideo({
      image: "E:/tmp/start.png",
      promptText: "make animate",
    });

    expect(uploader.uploadReferenceImage).toHaveBeenCalledWith({
      localFilePath: "E:/tmp/start.png",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.input.img_url).toBe("https://cdn.example/uploaded-start.png");
  });

  it("queries a single task and normalizes status and video url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        request_id: "req_wan_query",
        output: {
          task_id: "wan_task_123",
          task_status: "SUCCEEDED",
          video_url: "https://cdn.example/output.mp4",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createWanVideoProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
    });

    const result = await provider.getImageToVideoTask({
      taskId: "wan_task_123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/alibailian/api/v1/tasks/wan_task_123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result.taskId).toBe("wan_task_123");
    expect(result.status).toBe("SUCCEEDED");
    expect(result.videoUrl).toBe("https://cdn.example/output.mp4");
    expect(result.errorMessage).toBeNull();
    expect(result.completed).toBe(true);
    expect(result.failed).toBe(false);
  });

  it("polls until the wan task reaches a terminal state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            task_id: "wan_task_123",
            task_status: "PENDING",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            task_id: "wan_task_123",
            task_status: "RUNNING",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          output: {
            task_id: "wan_task_123",
            task_status: "SUCCEEDED",
            video_url: "https://cdn.example/output.mp4",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createWanVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.waitForImageToVideoTask({
      taskId: "wan_task_123",
      pollIntervalMs: 0,
      timeoutMs: 5_000,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.status).toBe("SUCCEEDED");
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
            return name.toLowerCase() === "x-request-id" ? "req_wan_400" : null;
          },
        },
      }),
    );

    const provider = createWanVideoProvider({
      apiToken: "test-token",
    });

    await expect(
      provider.submitImageToVideo({
        image: "https://cdn.example/start.png",
        promptText: "make animate",
      }),
    ).rejects.toThrow(
      'Wan video provider request failed with status 400; requestId=req_wan_400; body={"message":"bad image"}',
    );
  });
});
