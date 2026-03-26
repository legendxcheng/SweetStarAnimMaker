import { afterEach, describe, expect, it, vi } from "vitest";

import { createKlingStageVideoProvider, createKlingVideoProvider } from "../src/index";

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

  it("reads the video url from task_result.videos when Kling nests completed results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          task_id: "kling_task_nested",
          task_status: "succeed",
          task_result: {
            videos: [
              {
                id: "video_nested_1",
                url: "https://cdn.example/nested-output.mp4",
                duration: "10.041",
              },
            ],
          },
        },
        message: "SUCCEED",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.getImageToVideoTask({
      taskId: "kling_task_nested",
    });

    expect(result.taskId).toBe("kling_task_nested");
    expect(result.status).toBe("succeed");
    expect(result.videoUrl).toBe("https://cdn.example/nested-output.mp4");
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

  it("uses Kling stage defaults with multi_prompt for production video generation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_stage",
            task_status: "submitted",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_stage",
            task_status: "succeed",
            video_url: "https://cdn.example/stage-output.mp4",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingStageVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.generateSegmentVideo({
      projectId: "proj_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      frameDependency: "start_and_end_frame",
      promptText: "保持主体稳定，镜头缓慢推进。",
      startFramePath: "https://cdn.example/start.png",
      endFramePath: "https://cdn.example/end.png",
      durationSec: 6,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.image).toBe("https://cdn.example/start.png");
    expect(request.image_tail).toBe("https://cdn.example/end.png");
    expect(request.mode).toBe("std");
    expect(request.sound).toBe("on");
    expect(request.multi_shot).toBeUndefined();
    expect(request.duration).toBe(10);
    expect(request.prompt).toBeUndefined();
    expect(request.multi_prompt).toEqual([
      {
        index: 1,
        prompt: "保持主体稳定，镜头缓慢推进。",
        duration: "10",
      },
    ]);
    expect(result.provider).toBe("kling-video");
    expect(result.model).toBe("kling-v3");
    expect(result.videoUrl).toBe("https://cdn.example/stage-output.mp4");
    expect(result.thumbnailUrl).toBeNull();
    expect(result.durationSec).toBe(10);
  });

  it("omits image_tail when generating a start-frame-only shot clip", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_start_only",
            task_status: "submitted",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_start_only",
            task_status: "succeed",
            video_url: "https://cdn.example/start-only-output.mp4",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingStageVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.generateSegmentVideo({
      projectId: "proj_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      frameDependency: "start_frame_only",
      promptText: "保持主体稳定，镜头缓慢推进。",
      startFramePath: "https://cdn.example/start.png",
      durationSec: 3,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.image).toBe("https://cdn.example/start.png");
    expect(request.image_tail).toBeUndefined();
    expect(result.videoUrl).toBe("https://cdn.example/start-only-output.mp4");
  });

  it("condenses long stage prompts so Kling multi_prompt stays within provider limits", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_compact",
            task_status: "submitted",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            task_id: "kling_task_compact",
            task_status: "succeed",
            video_url: "https://cdn.example/compact-output.mp4",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createKlingStageVideoProvider({
      apiToken: "test-token",
    });

    await provider.generateSegmentVideo({
      projectId: "proj_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      frameDependency: "start_and_end_frame",
      promptText: `你是一个电影级 image-to-video 提示词编排器。

任务目标：
- 使用已审核通过的 start_frame 和 end_frame
- 生成一个单段、连续、稳定的 segment 视频片段

已知输入：
- segment 摘要：阿福的包子摊在暴雨中被毁，他在泥水中拼命捡拾包子，陷入极度绝望并质问苍天。
- shots 摘要：S01_SEG01_SH01: 阿福跌跌撞撞地扑向散落的蒸笼，四肢着地跪在积水里寻找包子。; S01_SEG01_SH02: 阿福双手剧烈颤抖，小心翼翼又无助地试图把烂在泥里的包子捧起来，泥水从指缝间流走。; S01_SEG01_SH03: 阿福死死攥住手中的泥包子，猛地仰起头看向漆黑的夜空，脖颈青筋暴起，撕心裂肺地嚎哭质问。; S01_SEG01_SH04: 阿福保持跪地仰天的姿态，一动不动，任凭冰冷的暴雨无情地冲刷着他单薄的身躯。

输出要求：
- 明确描述从 start_frame 过渡到 end_frame 的镜头运动和主体动作
- 强调角色身份稳定、服装稳定、空间连续性、时间连续性
- 保持电影镜头语言，避免突兀跳切、畸形肢体、主体漂移`,
      startFramePath: "https://cdn.example/start.png",
      endFramePath: "https://cdn.example/end.png",
      durationSec: 10,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.multi_prompt).toHaveLength(1);
    expect(request.multi_prompt[0].prompt.length).toBeLessThanOrEqual(512);
    expect(request.multi_prompt[0].prompt).toContain(
      "阿福的包子摊在暴雨中被毁，他在泥水中拼命捡拾包子",
    );
    expect(request.multi_prompt[0].prompt).toContain(
      "阿福跌跌撞撞地扑向散落的蒸笼",
    );
    expect(request.multi_prompt[0].prompt).not.toContain("你是一个电影级");
    expect(request.multi_prompt[0].prompt).not.toContain("start_frame");
    expect(request.multi_prompt[0].prompt).not.toContain("end_frame");
    expect(request.multi_prompt[0].prompt).not.toContain("从 start_frame 过渡到 end_frame");
    expect(request.multi_prompt[0].prompt).toContain("多镜头");
    expect(request.multi_prompt[0].prompt).toContain("镜头衔接自然");
  });
});
