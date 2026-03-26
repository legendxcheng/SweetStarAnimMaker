import { afterEach, describe, expect, it, vi } from "vitest";

import { createGrokShotScriptProvider } from "../src/index";

describe("grok shot script provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls chat completions with JSON-object output for segment generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: "雨市压境",
                summary: "林夏在积水集市入口发现退路已被封住。",
                shots: [
                  {
                    id: "shot_1",
                    sceneId: "scene_1",
                    segmentId: "segment_1",
                    order: 1,
                    shotCode: "SC01-SG01-SH01",
                    durationSec: 2,
                    purpose: "先交代主角被堵在入口。",
                    visual: "清晨积水漫过青石路。",
                    subject: "林夏站在水线边。",
                    action: "她停住脚步。",
                    frameDependency: "start_frame_only",
                    dialogue: null,
                    os: "来得真快。",
                    audio: "雨声和摊贩叫卖声。",
                    transitionHint: "切近景",
                    continuityNotes: "布包在左肩。",
                  },
                  {
                    id: "shot_2",
                    sceneId: "scene_1",
                    segmentId: "segment_1",
                    order: 2,
                    shotCode: "SC01-SG01-SH02",
                    durationSec: 4,
                    purpose: "推进她的警觉反应。",
                    visual: "她盯住前方杂乱摊棚后的黑影。",
                    subject: "林夏",
                    action: "抬眼锁定目标。",
                    frameDependency: "start_and_end_frame",
                    dialogue: "果然有人先到了。",
                    os: null,
                    audio: "环境声压低，心跳声轻起。",
                    transitionHint: null,
                    continuityNotes: "保持上一镜头朝向。",
                  },
                ],
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGrokShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
    });

    const result = await provider.generateShotScriptSegment({
      promptText: "请把这个 segment 拆成多个中文镜头。",
      variables: {
        scene: {
          id: "scene_1",
        },
        segment: {
          id: "segment_1",
          order: 1,
          durationSec: 6,
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vectorengine.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.messages[0].content).toContain("Simplified Chinese");
    expect(request.response_format).toEqual({
      type: "json_object",
    });
    expect(result.segment.segmentId).toBe("segment_1");
    expect(result.segment.summary).toBe("林夏在积水集市入口发现退路已被封住。");
    expect(result.segment.shots[0]?.shotCode).toBe("SC01-SG01-SH01");
    expect(result.rawResponse).toContain("雨市压境");
  });

  it("retries with correction feedback when canonical character validation fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: "办公室寒光",
                  summary: "职员K在深夜工位上强撑。",
                  shots: [
                    {
                      id: "shot_1",
                      sceneId: "scene_1",
                      segmentId: "segment_1",
                      order: 1,
                      shotCode: "SC01-SG01-SH01",
                      durationSec: 6,
                      purpose: "建立主角状态。",
                      visual: "冷色屏幕光打在K的脸上。",
                      subject: "K",
                      action: "K疲惫地敲击键盘。",
                      frameDependency: "start_frame_only",
                      dialogue: null,
                      os: null,
                      audio: "键盘声。",
                      transitionHint: null,
                      continuityNotes: null,
                    },
                  ],
                }),
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  name: "办公室寒光",
                  summary: "职员K在深夜工位上强撑。",
                  shots: [
                    {
                      id: "shot_1",
                      sceneId: "scene_1",
                      segmentId: "segment_1",
                      order: 1,
                      shotCode: "SC01-SG01-SH01",
                      durationSec: 6,
                      purpose: "建立主角状态。",
                      visual: "冷色屏幕光打在职员K的脸上。",
                      subject: "职员K",
                      action: "职员K疲惫地敲击键盘。",
                      frameDependency: "start_frame_only",
                      dialogue: null,
                      os: null,
                      audio: "键盘声。",
                      transitionHint: null,
                      continuityNotes: null,
                    },
                  ],
                }),
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGrokShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
    });

    const result = await provider.generateShotScriptSegment({
      promptText: "请生成中文镜头脚本。",
      variables: {
        scene: { id: "scene_1" },
        segment: { id: "segment_1", order: 1, durationSec: 6 },
        characterSheets: [
          {
            characterId: "char_k",
            characterName: "职员K",
            promptTextCurrent: "黑眼圈明显，深色连帽衫。",
            imageAssetPath: "character-sheets/char_k/current.png",
          },
        ],
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryRequest = JSON.parse(fetchMock.mock.calls[1]![1].body as string);
    expect(retryRequest.messages[1].content).toContain("上一次输出存在以下角色命名问题");
    expect(retryRequest.messages[1].content).toContain("使用了未登记简称“K”");
    expect(result.segment.shots[0]?.subject).toBe("职员K");
  });
});
