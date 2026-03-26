import { afterEach, describe, expect, it, vi } from "vitest";

import { createGrokFramePromptProvider } from "../src/index";

describe("grok frame-prompt provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls chat completions and normalizes frame plans against the approved roster", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                frameType: "start_frame",
                selectedCharacterIds: ["char_ivo_2", "char_unknown", "char_rin_1"],
                promptText: "  雨夜积水街口，林抬头望向彗星余辉，动漫电影感，细致光影。  ",
                negativePromptText: "  低清晰度、畸形肢体、额外手指  ",
                rationale: "开场帧聚焦林与伊沃的到场关系。",
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGrokFramePromptProvider({
      baseUrl: "https://api.vectorengine.ai",
      apiToken: "test-token",
      model: "grok-4.2",
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
            id: "shot_1",
            shotCode: "SC01-SG01-SH01",
            purpose: "建立空间与人物位置。",
            visual: "雨夜积水市场，霓虹映在水面。",
            subject: "林、伊沃",
            action: "林停下脚步，伊沃在远处回头。",
            dialogue: null,
            os: null,
            audio: "雨声、风铃声、遥远的人声。",
            transitionHint: null,
            continuityNotes: "林的书包始终在左肩。",
          },
        ],
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

    expect(request.messages[0].content).toContain("SeaDream");
    expect(request.messages[1].content).toContain('"characterId": "char_rin_1"');
    expect(request.response_format).toEqual({
      type: "json_object",
    });
    expect(result).toEqual({
      frameType: "start_frame",
      selectedCharacterIds: ["char_ivo_2", "char_rin_1"],
      promptText: "雨夜积水街口，林抬头望向彗星余辉，动漫电影感，细致光影。",
      negativePromptText: "低清晰度、畸形肢体、额外手指",
      rationale: "开场帧聚焦林与伊沃的到场关系。",
      rawResponse: expect.any(String),
      provider: "grok",
      model: "grok-4.2",
    });
  });

  it("rejects plans whose prompt text is empty after trimming", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  frameType: "end_frame",
                  selectedCharacterIds: [],
                  promptText: "   ",
                  negativePromptText: null,
                  rationale: null,
                }),
              },
            },
          ],
        }),
      }),
    );

    const provider = createGrokFramePromptProvider({
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
        characterRoster: [],
      }),
    ).rejects.toThrow("Grok frame prompt provider returned invalid promptText");
  });
});
