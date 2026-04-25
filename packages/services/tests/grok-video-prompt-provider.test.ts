import { afterEach, describe, expect, it, vi } from "vitest";

import { createGrokVideoPromptProvider } from "../src/index";

describe("grok video prompt provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a structured Kling Omni prompt plan with deterministic dialogue and audio constraints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                finalPrompt:
                  "以<<<image_1>>>为首帧锚点，林在雨夜市场里缓慢抬头，先短暂停顿再继续向前，镜头稳定推进，保持角色外观、服装和空间连续；画面自然推进到尾帧状态，避免跳切、肢体畸变和主体漂移。",
                dialoguePlan: "模型原始返回，可被系统覆写。",
                audioPlan: "模型原始返回，可被系统覆写。",
                visualGuardrails:
                  "保持林的外观、服装、挎包、空间方位稳定；镜头为单镜头连续推进；首尾帧过渡自然。",
                rationale: "将对白、环境声和连续性要求合并进单镜头 Kling Omni 可执行提示词。",
                selectedCharacterIds: [],
                selectedSceneId: null,
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGrokVideoPromptProvider({
      apiToken: "test-token",
      model: "grok-4.2",
    });

    const result = await provider.generateVideoPrompt({
      projectId: "proj_1",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在雨夜市场里意识到有人抢先抵达。",
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "发现异常",
        visual: "林站在雨夜市场入口。",
        subject: "林",
        action: "林停步抬头，谨慎观察前方。",
        frameDependency: "start_and_end_frame",
        dialogue: "有人先到了",
        os: "这次不能再慢一步。",
        audio: "雨声、摊布拍打声、远处人群骚动。",
        transitionHint: "从犹疑到确认前进。",
        continuityNotes: "保持林的挎包始终在左肩。",
      },
      durationSec: 5,
      startFrame: {
        imageAssetPath:
          "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
        width: 1024,
        height: 576,
      },
      endFrame: {
        imageAssetPath:
          "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/end-frame/current.png",
        width: 1024,
        height: 576,
      },
    });

    expect(result.finalPrompt).toContain("<<<image_1>>>");
    expect(result.finalPrompt).toContain(
      "语音约束：子镜头1（SC01-SG01-SH01）人物对白：有人先到了。",
    );
    expect(result.finalPrompt).toContain(
      "子镜头1（SC01-SG01-SH01）旁白/画外音：这次不能再慢一步。",
    );
    expect(result.finalPrompt).toContain("声音约束：雨声、摊布拍打声、远处人群骚动。");
    expect(result.dialoguePlan).toContain("子镜头1（SC01-SG01-SH01）人物对白：有人先到了。");
    expect(result.audioPlan).toContain("环境声/音效：雨声、摊布拍打声、远处人群骚动。");
    expect(result.audioPlan).toContain("未提供参考音频。");
    expect(result.visualGuardrails).toContain("首尾帧");
    expect(result.provider).toBe("grok");
    expect(result.model).toBe("grok-4.2");

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.model).toBe("grok-4.2");
    expect(request.response_format).toEqual({
      type: "json_object",
    });
  });
});
