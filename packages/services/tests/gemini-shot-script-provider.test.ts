import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiShotScriptProvider } from "../src/index";

describe("gemini shot script provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the Gemini generateContent endpoint with segment JSON schema output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
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
                        dialogue: "果然有人先到了。",
                        os: null,
                        audio: "环境声压低，心跳声轻起。",
                        transitionHint: null,
                        continuityNotes: "保持上一镜头朝向。",
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
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
      "https://api.vectorengine.ai/v1beta/models/gemini-3.1-pro-preview:generateContent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.systemInstruction.parts[0].text).toContain("Simplified Chinese");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseJsonSchema.properties.shots).toBeDefined();
    expect(result.segment.segmentId).toBe("segment_1");
    expect(result.segment.summary).toBe("林夏在积水集市入口发现退路已被封住。");
    expect(result.segment.shots[0]?.shotCode).toBe("SC01-SG01-SH01");
    expect(result.rawResponse).toContain("雨市压境");
  });

  it("rejects non-2xx provider responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "unauthorized",
      }),
    );

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateShotScriptSegment({
        promptText: "请生成镜头脚本。",
        variables: {
          scene: { id: "scene_1" },
          segment: { id: "segment_1", order: 1, durationSec: 6 },
        },
      }),
    ).rejects.toThrow("Gemini shot script provider request failed with status 401");
  });

  it("rejects responses without usable shot script content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      }),
    );

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateShotScriptSegment({
        promptText: "请生成镜头脚本。",
        variables: {
          scene: { id: "scene_1" },
          segment: { id: "segment_1", order: 1, durationSec: 6 },
        },
      }),
    ).rejects.toThrow("Gemini shot script provider returned no usable content");
  });

  it("includes the prompt text in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    name: "雨市压境",
                    summary: "林夏在积水集市入口发现退路已被封住。",
                    shots: [
                      {
                        id: "shot_1",
                        sceneId: "scene_1",
                        segmentId: "segment_1",
                        order: 1,
                        shotCode: "SC01-SG01-SH01",
                        durationSec: 6,
                        purpose: "建立段落空间。",
                        visual: "积水集市入口压迫感很强。",
                        subject: "林夏",
                        action: "停下脚步。",
                        dialogue: null,
                        os: null,
                        audio: "雨声。",
                        transitionHint: null,
                        continuityNotes: null,
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await provider.generateShotScriptSegment({
      promptText: "Focus only on this one segment.",
      variables: {
        scene: { id: "scene_1" },
        segment: { id: "segment_1", order: 1, durationSec: 6 },
      },
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0].parts[0].text as string;

    expect(promptText).toContain("Focus only on this one segment.");
  });

  it("rejects clearly English segment output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      name: "Flooded Market",
                      summary: "Rin sees the blocked exit and stops.",
                      shots: [
                        {
                          id: "shot_1",
                          sceneId: "scene_1",
                          segmentId: "segment_1",
                          order: 1,
                          shotCode: "SC01-SG01-SH01",
                          durationSec: 6,
                          purpose: "Establish the blocked entrance.",
                          visual: "Rainy market entrance.",
                          subject: "Rin",
                          action: "She stops walking.",
                          dialogue: null,
                          os: null,
                          audio: "Rain.",
                          transitionHint: null,
                          continuityNotes: null,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateShotScriptSegment({
        promptText: "请生成中文镜头脚本。",
        variables: {
          scene: { id: "scene_1" },
          segment: { id: "segment_1", order: 1, durationSec: 6 },
        },
      }),
    ).rejects.toThrow("Gemini shot script provider returned non-Chinese summary");
  });

  it("rejects mismatched total duration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      name: "雨市压境",
                      summary: "林夏在积水集市入口发现退路已被封住。",
                      shots: [
                        {
                          id: "shot_1",
                          sceneId: "scene_1",
                          segmentId: "segment_1",
                          order: 1,
                          shotCode: "SC01-SG01-SH01",
                          durationSec: 1,
                          purpose: "先交代主角位置。",
                          visual: "积水集市入口。",
                          subject: "林夏",
                          action: "停住脚步。",
                          dialogue: null,
                          os: null,
                          audio: "雨声。",
                          transitionHint: null,
                          continuityNotes: null,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const provider = createGeminiShotScriptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await expect(
      provider.generateShotScriptSegment({
        promptText: "请生成中文镜头脚本。",
        variables: {
          scene: { id: "scene_1" },
          segment: { id: "segment_1", order: 1, durationSec: 6 },
        },
      }),
    ).rejects.toThrow("Gemini shot script provider returned mismatched total duration");
  });
});
