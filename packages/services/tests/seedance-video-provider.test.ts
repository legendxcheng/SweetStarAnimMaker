import { afterEach, describe, expect, it, vi } from "vitest";

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn<(path: string) => Promise<Buffer>>(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

import {
  createSeedanceStageVideoProvider,
  createSeedanceVideoProvider,
} from "../src/index";

describe("seedance video provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    readFileMock.mockReset();
  });

  it("submits a multimodal seedance task with mixed reference assets", async () => {
    readFileMock.mockImplementation(async (filePath: string) => {
      if (filePath === "E:/tmp/ref.png") {
        return Buffer.from("image-bytes");
      }

      if (filePath === "E:/tmp/ref.mp3") {
        return Buffer.from("audio-bytes");
      }

      if (filePath === "E:/tmp/ref.mp4") {
        return Buffer.from("video-bytes");
      }

      throw new Error(`Unexpected file path: ${filePath}`);
    });

    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string) => {
        if (url.startsWith("https://p.sda1.dev/")) {
          return {
            ok: true,
            json: async () => ({
              data: {
                url: "https://cdn.example/uploaded-ref.mp4",
              },
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            id: "cgt-seedance-submit",
            status: "queued",
          }),
        };
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSeedanceVideoProvider({
      apiToken: "test-token",
      modelName: "doubao-seedance-2-0-260128",
    });

    const result = await provider.submitVideoGenerationTask({
      promptText: "参考图片和视频节奏，生成克制写实的连续短剧片段。",
      referenceImages: ["E:/tmp/ref.png"],
      referenceVideos: ["E:/tmp/ref.mp4"],
      referenceAudios: ["E:/tmp/ref.mp3"],
      durationSeconds: 8,
      resolution: "720p",
      ratio: "9:16",
      generateAudio: false,
      returnLastFrame: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://p.sda1.dev/api/v1/upload_external_noform?filename=ref.mp4",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[1]![1].body as string);
    expect(request.model).toBe("doubao-seedance-2-0-260128");
    expect(request.duration).toBe(8);
    expect(request.resolution).toBe("720p");
    expect(request.ratio).toBe("9:16");
    expect(request.generate_audio).toBe(false);
    expect(request.return_last_frame).toBe(true);
    expect(request.content).toEqual([
      {
        type: "text",
        text:
          "参考图片和视频节奏，生成克制写实的连续短剧片段。\n\n参考图别名说明：\n图片1 = ref.png",
      },
      {
        type: "image_url",
        role: "first_frame",
        image_url: {
          url: "data:image/png;base64,aW1hZ2UtYnl0ZXM=",
        },
      },
      {
        type: "video_url",
        role: "reference_video",
        video_url: {
          url: "https://cdn.example/uploaded-ref.mp4",
        },
      },
      {
        type: "audio_url",
        role: "reference_audio",
        audio_url: {
          url: "data:audio/mp3;base64,YXVkaW8tYnl0ZXM=",
        },
      },
    ]);
    expect(result.taskId).toBe("cgt-seedance-submit");
    expect(result.status).toBe("queued");
    expect(result.modelName).toBe("doubao-seedance-2-0-260128");
  });

  it("queries a seedance task and normalizes output urls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "cgt-seedance-done",
        status: "succeeded",
        content: {
          video_url: "https://cdn.example/output.mp4",
          last_frame_url: "https://cdn.example/last-frame.png",
        },
        duration: 8,
        generate_audio: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSeedanceVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.getVideoGenerationTask({
      taskId: "cgt-seedance-done",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/cgt-seedance-done",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result.taskId).toBe("cgt-seedance-done");
    expect(result.status).toBe("succeeded");
    expect(result.videoUrl).toBe("https://cdn.example/output.mp4");
    expect(result.lastFrameUrl).toBe("https://cdn.example/last-frame.png");
    expect(result.durationSec).toBe(8);
    expect(result.generateAudio).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.failed).toBe(false);
  });

  it("polls until the seedance task reaches a terminal state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-poll",
          status: "queued",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-poll",
          status: "running",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-poll",
          status: "succeeded",
          content: {
            video_url: "https://cdn.example/poll-output.mp4",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSeedanceVideoProvider({
      apiToken: "test-token",
    });

    const result = await provider.waitForVideoGenerationTask({
      taskId: "cgt-seedance-poll",
      pollIntervalMs: 0,
      timeoutMs: 5_000,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.status).toBe("succeeded");
    expect(result.videoUrl).toBe("https://cdn.example/poll-output.mp4");
  });

  it("uses legacy startFramePath as a Seedance first frame in the stage adapter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-stage",
          status: "queued",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-stage",
          status: "succeeded",
          content: {
            video_url: "https://cdn.example/stage-output.mp4",
            last_frame_url: "https://cdn.example/stage-last-frame.png",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSeedanceStageVideoProvider({
      apiToken: "test-token",
      modelName: "doubao-seedance-2-0-260128",
      durationSeconds: 12,
      ratio: "16:9",
      generateAudio: true,
      returnLastFrame: true,
    });

    const result = await provider.generateSegmentVideo({
      projectId: "proj_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      frameDependency: "start_and_end_frame",
      promptText: "保持角色外观一致，生成连续的中间剧情片段。",
      startFramePath: "https://cdn.example/start.png",
      endFramePath: "https://cdn.example/end.png",
      durationSec: 6,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("doubao-seedance-2-0-260128");
    expect(request.duration).toBe(6);
    expect(request.ratio).toBe("16:9");
    expect(request.generate_audio).toBe(true);
    expect(request.return_last_frame).toBe(true);
    expect(request.content).toEqual([
      {
        type: "text",
        text:
          "保持角色外观一致，生成连续的中间剧情片段。\n\n参考图别名说明：\n图片1 = start.png",
      },
      {
        type: "image_url",
        role: "first_frame",
        image_url: {
          url: "https://cdn.example/start.png",
        },
      },
    ]);
    expect(result.provider).toBe("seedance-video");
    expect(result.model).toBe("doubao-seedance-2-0-260128");
    expect(result.videoUrl).toBe("https://cdn.example/stage-output.mp4");
    expect(result.thumbnailUrl).toBe("https://cdn.example/stage-last-frame.png");
    expect(result.durationSec).toBe(6);
  });

  it("retries with fewer reference images and finally prompt-only when Seedance rejects input images as real-person privacy content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: {
              code: "InputImageSensitiveContentDetected.PrivacyInformation",
              message: "input image may contain real person",
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: {
              code: "InputImageSensitiveContentDetected.PrivacyInformation",
              message: "input image may contain real person",
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-stage-retry",
          status: "queued",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-stage-retry",
          status: "succeeded",
          content: {
            video_url: "https://cdn.example/stage-retry-output.mp4",
            last_frame_url: "https://cdn.example/stage-retry-last-frame.png",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSeedanceStageVideoProvider({
      apiToken: "test-token",
      modelName: "doubao-seedance-2-0-260128",
      durationSeconds: 12,
      generateAudio: true,
      returnLastFrame: true,
    });

    const result = await provider.generateSegmentVideo({
      projectId: "proj_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      promptText: "保持角色外观一致，生成连续的中间剧情片段。",
      referenceImages: [
        {
          assetPath: "https://cdn.example/start.png",
          label: "start",
          order: 0,
        },
        {
          assetPath: "https://cdn.example/end.png",
          label: "end",
          order: 1,
        },
      ],
      referenceAudios: [],
      durationSec: 6,
    });

    const firstRequest = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(firstRequest.content).toEqual([
      {
        type: "text",
        text:
          "保持角色外观一致，生成连续的中间剧情片段。\n\n参考图别名说明：\n图片1 = start\n图片2 = end",
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://cdn.example/start.png",
        },
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://cdn.example/end.png",
        },
      },
    ]);

    const secondRequest = JSON.parse(fetchMock.mock.calls[1]![1].body as string);
    expect(secondRequest.content).toEqual([
      {
        type: "text",
        text:
          "保持角色外观一致，生成连续的中间剧情片段。\n\n参考图别名说明：\n图片1 = start",
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://cdn.example/start.png",
        },
      },
    ]);

    const thirdRequest = JSON.parse(fetchMock.mock.calls[2]![1].body as string);
    expect(thirdRequest.content).toEqual([
      {
        type: "text",
        text: "保持角色外观一致，生成连续的中间剧情片段。",
      },
    ]);

    expect(result.videoUrl).toBe("https://cdn.example/stage-retry-output.mp4");
    expect(result.thumbnailUrl).toBe("https://cdn.example/stage-retry-last-frame.png");
    expect(result.model).toBe("doubao-seedance-2-0-260128");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("submits scene, character, and frame references with image aliases", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-stage-frames",
          status: "queued",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cgt-seedance-stage-frames",
          status: "succeeded",
          content: {
            video_url: "https://cdn.example/stage-frame-output.mp4",
            last_frame_url: "https://cdn.example/stage-frame-last-frame.png",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createSeedanceStageVideoProvider({
      apiToken: "test-token",
      modelName: "doubao-seedance-2-0-260128",
      returnLastFrame: true,
    });

    await provider.generateSegmentVideo({
      projectId: "proj_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      promptText: "按首尾状态生成连续短剧片段。",
      referenceImages: [
        {
          assetPath: "https://cdn.example/scene.png",
          label: "Scene Ritual Room",
          order: 0,
        },
        {
          assetPath: "https://cdn.example/character.png",
          label: "Character Hero",
          order: 1,
        },
        {
          assetPath: "https://cdn.example/end.png",
          label: "SH01 end",
          order: 2,
        },
        {
          assetPath: "https://cdn.example/start.png",
          label: "SH01 start",
          order: 3,
        },
      ],
      referenceAudios: [],
      durationSec: 6,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.content).toEqual([
      {
        type: "text",
        text:
          "按首尾状态生成连续短剧片段。\n\n参考图别名说明：\n图片1 = Scene Ritual Room\n图片2 = Character Hero\n图片3 = SH01 end\n图片4 = SH01 start",
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://cdn.example/scene.png",
        },
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://cdn.example/character.png",
        },
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://cdn.example/end.png",
        },
      },
      {
        type: "image_url",
        role: "reference_image",
        image_url: {
          url: "https://cdn.example/start.png",
        },
      },
    ]);
  });
});
