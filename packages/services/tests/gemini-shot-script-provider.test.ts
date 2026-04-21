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
    expect(
      request.generationConfig.responseJsonSchema.properties.shots.items.required,
    ).toContain("frameDependency");
    expect(
      request.generationConfig.responseJsonSchema.properties.shots.items.properties.frameDependency,
    ).toEqual({ type: "string" });
    expect(result.segment.segmentId).toBe("segment_1");
    expect(result.segment.summary).toBe("林夏在积水集市入口发现退路已被封住。");
    expect(result.segment.shots[0]?.shotCode).toBe("SC01-SG01-SH01");
    expect(result.segment.shots[0]?.frameDependency).toBe("start_frame_only");
    expect(result.rawResponse).toContain("雨市压境");
  });

  it("accepts Gemini responses that prepend explanatory text before the JSON object", async () => {
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
                    text: `**Generating final shot script JSON...**
{
  "name": "借运成契",
  "summary": "阿福按下血印后，借条中的金色气流涌入胸口。",
  "shots": [
    {
      "id": "shot_1",
      "sceneId": "scene_1",
      "segmentId": "segment_1",
      "order": 1,
      "shotCode": "SC01-SG01-SH01",
      "durationSec": 6,
      "purpose": "完成借运契约的关键动作。",
      "visual": "发光借条上的金色气流从纸面钻出。",
      "subject": "阿福",
      "action": "阿福按下血印后捂住胸口，金光涌入体内。",
      "frameDependency": "start_and_end_frame",
      "dialogue": "只要能救我女儿，什么代价我都愿意！",
      "os": null,
      "audio": "心跳加速的鼓点与法术声叠起。",
      "transitionHint": "切特写",
      "continuityNotes": "延续前镜头中阿福跪地持借条的姿态。"
    }
  ]
}`,
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

    const result = await provider.generateShotScriptSegment({
      promptText: "请生成中文镜头脚本。",
      variables: {
        scene: { id: "scene_1" },
        segment: { id: "segment_1", order: 1, durationSec: 6 },
      },
    });

    expect(result.segment.summary).toBe("阿福按下血印后，借条中的金色气流涌入胸口。");
    expect(result.segment.shots[0]?.frameDependency).toBe("start_and_end_frame");
    expect(result.rawResponse).toContain("**Generating final shot script JSON...**");
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

  it("includes prohibited-content details from provider error bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () =>
          JSON.stringify({
            error: {
              code: "PROHIBITED_CONTENT",
              message:
                "request blocked by Google Gemini (PROHIBITED_CONTENT): content is prohibited under official usage policies.",
            },
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
    ).rejects.toThrow(
      "Gemini shot script provider request failed with status 500; code=PROHIBITED_CONTENT; message=request blocked by Google Gemini",
    );
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
                        frameDependency: "start_frame_only",
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

  it("requests temporary anchor-planning fields in the Gemini response schema", async () => {
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
                    anchors: [
                      {
                        id: "anchor_1",
                        label: "林夏站在雨夜市场入口，抬头确认封锁线。",
                        isRequired: true,
                      },
                    ],
                    segments: [
                      {
                        id: "segment_plan_1",
                        fromAnchorId: "anchor_1",
                        toAnchorId: "anchor_1",
                        strategy: "start_frame_only",
                        transitionSmooth: true,
                        reason: "只有一个关键节点，其余过程由模型自然补足。",
                      },
                    ],
                    shots: [
                      {
                        id: "shot_1",
                        sceneId: "scene_1",
                        segmentId: "segment_1",
                        order: 1,
                        shotCode: "SC01-SG01-SH01",
                        durationSec: 6,
                        purpose: "建立入口状态。",
                        visual: "林夏站在市场入口，雨线压低前景。",
                        subject: "林夏",
                        action: "她停住脚步，抬头看向封锁线。",
                        frameDependency: "start_frame_only",
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

    const result = await provider.generateShotScriptSegment({
      promptText: "请按关键节点规划后生成中文镜头脚本。",
      variables: {
        scene: { id: "scene_1" },
        segment: { id: "segment_1", order: 1, durationSec: 6 },
      },
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);

    expect(request.generationConfig.responseJsonSchema.properties.anchors).toBeDefined();
    expect(request.generationConfig.responseJsonSchema.properties.segments).toBeDefined();
    expect(
      request.generationConfig.responseJsonSchema.properties.segments.items.properties.strategy,
    ).toEqual({
      type: "string",
      enum: ["start_frame_only", "start_and_end_frame"],
    });
    expect(result.segment.shots).toHaveLength(1);
    expect(result.segment.shots[0]).not.toHaveProperty("anchors");
    expect(result.segment.shots[0]?.frameDependency).toBe("start_frame_only");
  });

  it("retries when risky end-frame transitions are returned", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      name: "林逃出楼门",
                      summary: "林从楼道冲到街外，空间切换过猛。",
                      anchors: [
                        {
                          id: "anchor_1",
                          label: "林站在昏暗楼道门口。",
                          isRequired: true,
                        },
                        {
                          id: "anchor_2",
                          label: "林已经冲到暴雨街道中央。",
                          isRequired: true,
                        },
                      ],
                      segments: [
                        {
                          id: "segment_plan_1",
                          fromAnchorId: "anchor_1",
                          toAnchorId: "anchor_2",
                          strategy: "start_and_end_frame",
                          transitionSmooth: false,
                          reason: "室内直接跳到室外，空间变化过大。",
                        },
                      ],
                      shots: [
                        {
                          id: "shot_1",
                          sceneId: "scene_1",
                          segmentId: "segment_1",
                          order: 1,
                          shotCode: "SC01-SG01-SH01",
                          durationSec: 6,
                          purpose: "表现林的仓促逃离。",
                          visual: "林从楼道门口一瞬间切到暴雨街道中央。",
                          subject: "林",
                          action: "她推门冲出，下一刻已经在街心回头。",
                          frameDependency: "start_and_end_frame",
                          dialogue: null,
                          os: null,
                          audio: "门响后立刻切到暴雨声。",
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
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      name: "林逃出楼门",
                      summary: "林冲出楼门后，先定住门口，再由模型补足后续过程。",
                      anchors: [
                        {
                          id: "anchor_1",
                          label: "林站在昏暗楼道门口。",
                          isRequired: true,
                        },
                      ],
                      segments: [
                        {
                          id: "segment_plan_1",
                          fromAnchorId: "anchor_1",
                          toAnchorId: "anchor_1",
                          strategy: "start_frame_only",
                          transitionSmooth: true,
                          reason: "保留门口关键节点，其余过程自然补足。",
                        },
                      ],
                      shots: [
                        {
                          id: "shot_1",
                          sceneId: "scene_1",
                          segmentId: "segment_1",
                          order: 1,
                          shotCode: "SC01-SG01-SH01",
                          durationSec: 6,
                          purpose: "建立林仓促冲门的起点。",
                          visual: "林立在楼道门口，雨光从门缝灌进来。",
                          subject: "林",
                          action: "她压低重心，准备冲门。",
                          frameDependency: "start_frame_only",
                          dialogue: null,
                          os: null,
                          audio: "门外暴雨声透进来。",
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

    const result = await provider.generateShotScriptSegment({
      promptText: "请按关键节点规划后生成中文镜头脚本。",
      variables: {
        scene: { id: "scene_1" },
        segment: { id: "segment_1", order: 1, durationSec: 6 },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const retryRequest = JSON.parse(fetchMock.mock.calls[1]![1].body as string);
    expect(retryRequest.contents[0].parts[0].text).toContain("不可平滑过渡");
    expect(retryRequest.contents[0].parts[0].text).toContain("改用 start_frame_only");
    expect(result.segment.shots[0]?.frameDependency).toBe("start_frame_only");
  });

  it("downgrades unsafe end-frame shots after retry exhaustion", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    name: "林冲出楼门",
                    summary: "林从室内瞬间切到室外暴雨街口，空间跳跃过大。",
                    anchors: [
                      {
                        id: "anchor_1",
                        label: "林站在狭窄室内楼道尽头。",
                        isRequired: true,
                      },
                      {
                        id: "anchor_2",
                        label: "林已经站在室外暴雨街口中央。",
                        isRequired: true,
                      },
                    ],
                    segments: [
                      {
                        id: "segment_plan_1",
                        fromAnchorId: "anchor_1",
                        toAnchorId: "anchor_2",
                        strategy: "start_and_end_frame",
                        transitionSmooth: true,
                        reason: "虽然节奏很快，但室内直接切到室外暴雨街口。",
                      },
                    ],
                    shots: [
                      {
                        id: "shot_1",
                        sceneId: "scene_1",
                        segmentId: "segment_1",
                        order: 1,
                        shotCode: "SC01-SG01-SH01",
                        durationSec: 6,
                        purpose: "强调林仓促出逃。",
                        visual: "林从室内楼道一瞬间来到室外暴雨街口。",
                        subject: "林",
                        action: "她推门后下一拍已经站到街口中央。",
                        frameDependency: "start_and_end_frame",
                        dialogue: null,
                        os: null,
                        audio: "门响后立刻叠入暴雨声。",
                        transitionHint: null,
                        continuityNotes: "保持林的服装一致。",
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
      promptText: "请按关键节点规划后生成中文镜头脚本。",
      variables: {
        scene: { id: "scene_1" },
        segment: { id: "segment_1", order: 1, durationSec: 6 },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.segment.shots[0]?.frameDependency).toBe("start_frame_only");
    expect(result.segment.shots[0]?.visual).toContain("室外暴雨街口");
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
                          frameDependency: "start_frame_only",
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
                          frameDependency: "start_frame_only",
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

  it("rejects shorthand aliases for approved characters", async () => {
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
          characterSheets: [
            {
              characterId: "char_k",
              characterName: "职员K",
              promptTextCurrent: "黑眼圈明显，深色连帽衫。",
              imageAssetPath: "character-sheets/char_k/current.png",
            },
          ],
        },
      }),
    ).rejects.toThrow("使用了未登记简称“K”");
  });

  it("retries with correction feedback when canonical character validation fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
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
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
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
    expect(retryRequest.contents[0].parts[0].text).toContain("上一次输出存在以下角色命名问题");
    expect(retryRequest.contents[0].parts[0].text).toContain("使用了未登记简称“K”");
    expect(result.segment.shots[0]?.subject).toBe("职员K");
  });

  it("fails after the canonical character retry budget is exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
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

    await expect(
      provider.generateShotScriptSegment({
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
      }),
    ).rejects.toThrow("Gemini shot script provider failed canonical character validation after 3 attempts");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("attaches raw response text when segment planning metadata is invalid", async () => {
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
                      anchors: [
                        {
                          id: "anchor_1",
                          label: "林夏站在积水入口。",
                          isRequired: true,
                        },
                      ],
                      segments: [
                        {
                          id: "segment_plan_1",
                          fromAnchorId: "anchor_1",
                          toAnchorId: "anchor_1",
                          strategy: "single_anchor",
                          transitionSmooth: true,
                          reason: "只需要一个关键节点。",
                        },
                      ],
                      shots: [
                        {
                          id: "shot_1",
                          sceneId: "scene_1",
                          segmentId: "segment_1",
                          order: 1,
                          shotCode: "SC01-SG01-SH01",
                          durationSec: 6,
                          purpose: "建立入口状态。",
                          visual: "积水集市入口。",
                          subject: "林夏",
                          action: "停住脚步。",
                          frameDependency: "start_frame_only",
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

    let capturedError: unknown;

    try {
      await provider.generateShotScriptSegment({
        promptText: "请生成中文镜头脚本。",
        variables: {
          scene: { id: "scene_1" },
          segment: { id: "segment_1", order: 1, durationSec: 6 },
        },
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toContain("invalid segments[0].strategy");
    expect(capturedError).toMatchObject({
      rawResponse: expect.stringContaining('"strategy":"single_anchor"'),
    });
  });

  it("retries when Gemini first returns prose-only thought text instead of JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: `**JSON Shot Script Generation: My Thought Process**

I will first think about the timing and then format the result later.`,
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      name: "转运光爆",
                      summary: "林峰握住护身符，金光冲破头顶黑云。",
                      shots: [
                        {
                          id: "shot_1",
                          sceneId: "scene_2",
                          segmentId: "segment_2",
                          order: 1,
                          shotCode: "SC02-SG02-SH01",
                          durationSec: 15,
                          purpose: "完成运势转折的核心画面。",
                          visual: "林峰握紧护身符，金光向上贯穿黑云。",
                          subject: "林峰",
                          action: "林峰闭目凝神后慢慢舒展眉头。",
                          frameDependency: "start_frame_only",
                          dialogue: null,
                          os: "否极泰来，破后而立。",
                          audio: "钟鸣与管弦乐同时升起。",
                          transitionHint: "由近景推至中景",
                          continuityNotes: "护身符保持胸前位置，西装与前段一致。",
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
      promptText: "请直接输出 JSON，不要任何解释。",
      variables: {
        scene: { id: "scene_2" },
        segment: { id: "segment_2", order: 2, durationSec: 15 },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryRequest = JSON.parse(fetchMock.mock.calls[1]![1].body as string);
    expect(retryRequest.contents[0].parts[0].text).toContain("上一次输出不是合法 JSON");
    expect(retryRequest.contents[0].parts[0].text).toContain("My Thought Process");
    expect(result.segment.summary).toBe("林峰握住护身符，金光冲破头顶黑云。");
  });
});
