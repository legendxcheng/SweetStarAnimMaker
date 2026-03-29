import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiFramePromptProvider } from "../src/index";

describe("gemini frame-prompt provider", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("calls Gemini and normalizes frame plans against the approved roster", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    frameType: "start_frame",
                    selectedCharacterIds: ["char_ivo_2", "char_unknown", "char_rin_1"],
                    promptText: "  雨夜积水街口，林抬头望向彗星余辉，动漫电影感，细致光影。  ",
                    negativePromptText: "  低清晰度、畸形肢体、额外手指  ",
                    rationale: "开场帧聚焦林与伊沃的到场关系。",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiFramePromptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    const result = await provider.generateFramePrompt({
      projectId: "proj_20260324_ab12cd",
      frameType: "start_frame",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在雨夜市场边听见彗星歌声。",
        shots: [
          {
            id: "shot_0",
            shotCode: "SC01-SG01-SH00",
            purpose: "建立市场的前置压迫感。",
            visual: "市场入口之外的雨夜街口。",
            subject: "空旷街口、远处霓虹",
            action: "雨水顺着招牌滴落。",
            frameDependency: "start_frame_only",
            dialogue: null,
            os: null,
            audio: "雨声、远处风铃。",
            transitionHint: "镜头切入林的背影。",
            continuityNotes: "地面始终有积水反光。",
          },
          {
            id: "shot_1",
            shotCode: "SC01-SG01-SH01",
            purpose: "建立空间与人物位置。",
            visual: "雨夜积水市场，霓虹映在水面。",
            subject: "林、伊沃",
            action: "林停下脚步，伊沃在远处回头。",
            frameDependency: "start_and_end_frame",
            dialogue: null,
            os: null,
            audio: "雨声、风铃声、遥远的人声。",
            transitionHint: null,
            continuityNotes: "林的书包始终在左肩。",
          },
        ],
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "建立空间与人物位置。",
        visual: "雨夜积水市场，霓虹映在水面。",
        subject: "林、伊沃",
        action: "林停下脚步，伊沃在远处回头。",
        frameDependency: "start_and_end_frame",
        dialogue: null,
        os: null,
        audio: "雨声、风铃声、遥远的人声。",
        transitionHint: null,
        continuityNotes: "林的书包始终在左肩。",
      },
      characterRoster: [
        {
          characterId: "char_rin_1",
          characterName: "林",
          promptTextCurrent: "银色飞行夹克，黑色短发。",
          imageAssetPath: "character-sheets/char_rin/current.png",
        },
        {
          characterId: "char_ivo_2",
          characterName: "伊沃",
          promptTextCurrent: "深蓝长外套，金属护目镜。",
          imageAssetPath: "character-sheets/char_ivo/current.png",
        },
      ],
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
    const requestText = request.contents[0].parts[0].text as string;

    expect(request.systemInstruction.parts[0].text).toContain("SeaDream");
    expect(requestText).toContain('"characterId": "char_rin_1"');
    expect(requestText).toContain('"currentShot"');
    expect(requestText).toContain('"shotCode": "SC01-SG01-SH01"');
    expect(requestText).toContain("start_frame 必须体现当前 shot 的开始状态");
    expect(requestText).toContain("end_frame 必须体现当前 shot 的结束状态");
    expect(requestText).toContain("不要让 start_frame 与 end_frame 只是同义改写");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(result).toEqual({
      frameType: "start_frame",
      selectedCharacterIds: ["char_ivo_2", "char_rin_1"],
      promptText: "雨夜积水街口，林抬头望向彗星余辉，动漫电影感，细致光影。",
      negativePromptText: "低清晰度、畸形肢体、额外手指",
      rationale: "开场帧聚焦林与伊沃的到场关系。",
      rawResponse: expect.any(String),
      provider: "gemini",
      model: "gemini-3.1-pro-preview",
    });
  });

  it("rejects plans whose prompt text is empty after trimming", async () => {
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
                      frameType: "end_frame",
                      selectedCharacterIds: [],
                      promptText: "   ",
                      negativePromptText: null,
                      rationale: null,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    );

    const provider = createGeminiFramePromptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
    });

    await expect(
      provider.generateFramePrompt({
        projectId: "proj_20260324_ab12cd",
        frameType: "end_frame",
        segment: {
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          summary: "结尾定格在市场边缘。",
          shots: [],
        },
        currentShot: {
          id: "shot_1",
          shotCode: "SC01-SG01-SH01",
          purpose: "定格结尾。",
          visual: "市场边缘的冷光。",
          subject: "林",
          action: "她停在出口前。",
          frameDependency: "start_and_end_frame",
          dialogue: null,
          os: null,
          audio: null,
          transitionHint: null,
          continuityNotes: null,
        },
        characterRoster: [],
      }),
    ).rejects.toThrow("Gemini frame prompt provider returned invalid promptText");
  });

  it("includes startFrameContext and continuity rules in end-frame requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    frameType: "end_frame",
                    selectedCharacterIds: [],
                    promptText: "尾帧定格在出口前。",
                    negativePromptText: null,
                    rationale: "延续首帧并落到结果状态。",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiFramePromptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await provider.generateFramePrompt({
      projectId: "proj_20260324_ab12cd",
      frameType: "end_frame",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在雨夜市场边确认出口被堵住。",
        shots: [],
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "表现尾帧结果。",
        visual: "雨夜积水市场，冷白霓虹横穿积水。",
        subject: "林",
        action: "她停在出口前回望。",
        frameDependency: "start_and_end_frame",
        dialogue: null,
        os: null,
        audio: "雨声渐弱。",
        transitionHint: null,
        continuityNotes: "林的左肩背包保持不变。",
      },
      startFrameContext: {
        promptTextCurrent: "首帧里林站在雨夜市场入口，银色飞行夹克沾着雨水。",
        selectedCharacterIds: ["char_rin"],
        imageStatus: "approved",
        imageAssetPath: "images/frame-start/current.png",
      },
      characterRoster: [],
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const requestText = request.contents[0].parts[0].text as string;

    expect(requestText).toContain('"startFrameContext"');
    expect(requestText).toContain("保持同一 shot 的角色造型、服装、主体数量、镜头逻辑、基础环境和主导光色方向连续");
    expect(requestText).toContain("用 startFrameContext.promptTextCurrent 作为连续性锚点");
    expect(requestText).toContain("表达该 shot 的结果状态或情绪落点，而不是复述 start_frame");
  });

  it("aborts hung requests with a 300s default timeout when timeoutMs is omitted", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiFramePromptProvider({
      apiToken: "test-token",
    });

    const resultPromise = provider.generateFramePrompt({
      projectId: "proj_20260324_ab12cd",
      frameType: "start_frame",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在雨夜市场边听见彗星歌声。",
        shots: [],
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "建立空间与人物位置。",
        visual: "雨夜积水市场，霓虹映在水面。",
        subject: "林、伊沃",
        action: "林停下脚步，伊沃在远处回头。",
        frameDependency: "start_frame_only",
        dialogue: null,
        os: null,
        audio: "雨声、风铃声、遥远的人声。",
        transitionHint: null,
        continuityNotes: "林的书包始终在左肩。",
      },
      characterRoster: [],
    });
    const expectation = expect(resultPromise).rejects.toThrow(
      "Gemini frame prompt provider request timed out",
    );

    await vi.advanceTimersByTimeAsync(300_001);

    await expectation;
  });
});
