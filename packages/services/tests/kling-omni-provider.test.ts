import { afterEach, describe, expect, it, vi } from "vitest";

import { createKlingOmniProvider, createKlingOmniStageVideoProvider } from "../src/index";

describe("kling omni provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("submits a single-shot omni video task with only a start frame", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "omni_task_start_only",
          task_status: "submitted",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
    });

    const result = await provider.submitOmniVideoWithStartFrame({
      promptText: "让<<<image_1>>>中的角色保持构图稳定，只做轻微表情和头部变化。",
      startImage: "https://cdn.example/start-only.png",
      durationSeconds: 3,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model_name).toBe("kling-v3-omni");
    expect(request.mode).toBe("pro");
    expect(request.prompt).toBe("让<<<image_1>>>中的角色保持构图稳定，只做轻微表情和头部变化。");
    expect(request.duration).toBe("3");
    expect(request.image_list).toEqual([
      {
        image_url: "https://cdn.example/start-only.png",
        type: "first_frame",
      },
    ]);
    expect(result.taskId).toBe("omni_task_start_only");
    expect(result.status).toBe("submitted");
  });

  it("submits a single-shot omni video task with start and end frames", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "omni_task_123",
          task_status: "submitted",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
    });

    const result = await provider.submitOmniVideoWithFrames({
      promptText: "让<<<image_1>>>中的角色缓慢转身看向镜头。",
      startImage: "https://cdn.example/start.png",
      endImage: "https://cdn.example/end.png",
      durationSeconds: 3,
      aspectRatio: "16:9",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/kling/v1/videos/omni-video",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model_name).toBe("kling-v3-omni");
    expect(request.mode).toBe("pro");
    expect(request.prompt).toBe("让<<<image_1>>>中的角色缓慢转身看向镜头。");
    expect(request.duration).toBe("3");
    expect(request.aspect_ratio).toBe("16:9");
    expect(request.image_list).toEqual([
      {
        image_url: "https://cdn.example/start.png",
        type: "first_frame",
      },
      {
        image_url: "https://cdn.example/end.png",
        type: "end_frame",
      },
    ]);
    expect(result.taskId).toBe("omni_task_123");
    expect(result.status).toBe("submitted");
    expect(result.modelName).toBe("kling-v3-omni");
    expect(result.mode).toBe("pro");
  });

  it("submits a single-shot omni video task with subject elements", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "omni_task_elements",
          task_status: "submitted",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
    });

    await provider.submitOmniVideoWithElements({
      promptText: "<<<element_1>>>走向<<<element_2>>>并拥抱对方。",
      elementIds: ["101", 202],
      durationSeconds: 5,
      aspectRatio: "1:1",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model_name).toBe("kling-v3-omni");
    expect(request.prompt).toBe("<<<element_1>>>走向<<<element_2>>>并拥抱对方。");
    expect(request.duration).toBe("5");
    expect(request.aspect_ratio).toBe("1:1");
    expect(request.element_list).toEqual([
      { element_id: 101 },
      { element_id: 202 },
    ]);
    expect(request.image_list).toBeUndefined();
  });

  it("queries a single omni task and reads nested video url", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          task_id: "omni_task_done",
          task_status: "succeed",
          task_result: {
            videos: [
              {
                id: "video_1",
                url: "https://cdn.example/omni-output.mp4",
              },
            ],
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
    });

    const result = await provider.getOmniVideoTask({
      taskId: "omni_task_done",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/kling/v1/videos/omni-video/omni_task_done",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(result.taskId).toBe("omni_task_done");
    expect(result.status).toBe("succeed");
    expect(result.videoUrl).toBe("https://cdn.example/omni-output.mp4");
    expect(result.completed).toBe(true);
    expect(result.failed).toBe(false);
    expect(result.errorMessage).toBeNull();
  });

  it("uploads local image paths when creating an image-reference element", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "element_task_123",
          task_status: "submitted",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const uploader = {
      uploadReferenceImage: vi
        .fn()
        .mockResolvedValueOnce("https://cdn.example/frontal.png")
        .mockResolvedValueOnce("https://cdn.example/ref-1.png")
        .mockResolvedValueOnce("https://cdn.example/ref-2.png"),
    };

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
      referenceImageUploader: uploader,
    });

    const result = await provider.createElement({
      name: "阿福",
      description: "雨夜包子摊老板，中年男性。",
      frontalImage: "E:/tmp/frontal.png",
      referenceImages: ["E:/tmp/ref-1.png", "E:/tmp/ref-2.png"],
      tagIds: ["o_102"],
    });

    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(1, {
      localFilePath: "E:/tmp/frontal.png",
    });
    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(2, {
      localFilePath: "E:/tmp/ref-1.png",
    });
    expect(uploader.uploadReferenceImage).toHaveBeenNthCalledWith(3, {
      localFilePath: "E:/tmp/ref-2.png",
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.element_name).toBe("阿福");
    expect(request.element_description).toBe("雨夜包子摊老板，中年男性。");
    expect(request.reference_type).toBe("image_refer");
    expect(request.element_image_list).toEqual({
      frontal_image: "https://cdn.example/frontal.png",
      refer_images: [
        { image_url: "https://cdn.example/ref-1.png" },
        { image_url: "https://cdn.example/ref-2.png" },
      ],
    });
    expect(request.tag_list).toEqual([{ tag_id: "o_102" }]);
    expect(result.taskId).toBe("element_task_123");
    expect(result.status).toBe("submitted");
  });

  it("queries a single custom element task and normalizes the first returned element", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          task_id: "element_task_done",
          task_status: "succeed",
          task_result: {
            elements: [
              {
                element_id: 987654321,
                element_name: "阿福",
                element_description: "雨夜包子摊老板，中年男性。",
                reference_type: "image_refer",
                status: "succeed",
              },
            ],
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
    });

    const result = await provider.getElement({
      taskId: "element_task_done",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/kling/v1/general/advanced-custom-elements/element_task_done",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(result.taskId).toBe("element_task_done");
    expect(result.status).toBe("succeed");
    expect(result.completed).toBe(true);
    expect(result.elementId).toBe("987654321");
    expect(result.elementName).toBe("阿福");
    expect(result.referenceType).toBe("image_refer");
  });

  it("lists custom element tasks and normalizes each first returned element", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            task_id: "element_task_1",
            task_status: "succeed",
            task_result: {
              elements: [
                {
                  element_id: 1,
                  element_name: "阿福",
                  reference_type: "image_refer",
                  status: "succeed",
                },
              ],
            },
          },
          {
            task_id: "element_task_2",
            task_status: "processing",
            task_result: {
              elements: [],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
    });

    const result = await provider.listElements({
      pageNum: 2,
      pageSize: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/kling/v1/general/advanced-custom-elements?pageNum=2&pageSize=10",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(result.items).toEqual([
      expect.objectContaining({
        taskId: "element_task_1",
        status: "succeed",
        completed: true,
        failed: false,
        elementId: "1",
        elementName: "阿福",
      }),
      expect.objectContaining({
        taskId: "element_task_2",
        status: "processing",
        completed: false,
        failed: false,
        elementId: null,
        elementName: null,
      }),
    ]);
  });

  it("surfaces response body and request id on failed requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"message":"invalid element payload"}',
        headers: {
          get(name: string) {
            return name.toLowerCase() === "x-request-id" ? "req_omni_400" : null;
          },
        },
      }),
    );

    const provider = createKlingOmniProvider({
      apiToken: "test-token",
    });

    await expect(
      provider.createElement({
        name: "阿福",
        description: "雨夜包子摊老板，中年男性。",
        frontalImage: "https://cdn.example/frontal.png",
        referenceImages: ["https://cdn.example/ref-1.png"],
      }),
    ).rejects.toThrow(
      'Kling omni provider request failed with status 400; requestId=req_omni_400; body={"message":"invalid element payload"}',
    );
  });

  it("uses Omni stage defaults with sound enabled for production video generation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "omni_task_stage",
            task_status: "submitted",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "omni_task_stage",
            task_status: "succeed",
            task_result: {
              videos: [
                {
                  url: "https://cdn.example/omni-stage-output.mp4",
                },
              ],
            },
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingOmniStageVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.generateSegmentVideo({
      projectId: "proj_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      frameDependency: "start_and_end_frame",
      promptText: "让<<<image_1>>>中的角色缓慢转身看向镜头。",
      startFramePath: "https://cdn.example/start.png",
      endFramePath: "https://cdn.example/end.png",
      durationSec: 6,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model_name).toBe("kling-v3-omni");
    expect(request.sound).toBe("on");
    expect(request.duration).toBe("6");
    expect(request.image_list).toEqual([
      {
        image_url: "https://cdn.example/start.png",
        type: "first_frame",
      },
      {
        image_url: "https://cdn.example/end.png",
        type: "end_frame",
      },
    ]);
    expect(result.provider).toBe("kling-omni");
    expect(result.model).toBe("kling-v3-omni");
    expect(result.videoUrl).toBe("https://cdn.example/omni-stage-output.mp4");
    expect(result.thumbnailUrl).toBeNull();
    expect(result.durationSec).toBe(6);
  });
});
