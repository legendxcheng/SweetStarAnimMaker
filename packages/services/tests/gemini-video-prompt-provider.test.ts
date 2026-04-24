import { afterEach, describe, expect, it, vi } from "vitest";

import { createGeminiVideoPromptProvider } from "../src/index";

describe("gemini video prompt provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a structured Kling Omni prompt plan with the final prompt and review fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    finalPrompt:
                      "以<<<image_1>>>为首帧锚点，林在雨夜市场里缓慢抬头，先短暂停顿再继续向前，口型清晰说出“有人先到了”，环境保留雨声、摊布拍打声和压低的人群底噪，镜头稳定推进，保持角色外观、服装和空间连续；画面自然推进到尾帧状态，避免跳切、肢体畸变和主体漂移。",
                    dialoguePlan: "说话主体：林；可见口型台词：有人先到了；无额外旁白。",
                    audioPlan: "环境声以雨声、摊布拍打声、人群底噪为主，不额外强化配乐。",
                    visualGuardrails:
                      "保持林的外观、服装、挎包、空间方位稳定；镜头为单镜头连续推进；首尾帧过渡自然。",
                    rationale: "将对白、环境声和连续性要求合并进单镜头 Kling Omni 可执行提示词。",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiVideoPromptProvider({
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
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
    expect(result.finalPrompt).toContain("必须输出可听音轨，不允许静音或无声成片。");
    expect(result.dialoguePlan).toContain("子镜头1（SC01-SG01-SH01）人物对白：有人先到了。");
    expect(result.dialoguePlan).toContain("子镜头1（SC01-SG01-SH01）旁白/画外音：这次不能再慢一步。");
    expect(result.audioPlan).toContain("环境声/音效：雨声、摊布拍打声、远处人群骚动。");
    expect(result.audioPlan).toContain("未提供参考音频。");
    expect(result.audioPlan).toContain("必须输出可听音轨，不允许静音或无声成片。");
    expect(result.visualGuardrails).toContain("首尾帧");
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-3.1-pro-preview");

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseJsonSchema.required).toEqual([
      "finalPrompt",
      "dialoguePlan",
      "audioPlan",
      "visualGuardrails",
      "rationale",
    ]);
  });

  it("sends explicit speech, narration, and no-background-music constraints to Gemini", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    finalPrompt:
                      "以<<<image_1>>>为首帧锚点，镜头保持单镜头连续推进，无人物对白，无旁白，无语音，仅保留雨声与空间环境声。",
                    dialoguePlan: "无人物对白，无旁白，无语音，不需要口型。",
                    audioPlan: "保留环境雨声，不加入额外人声或配乐。",
                    visualGuardrails: "保持角色和空间连续。",
                    rationale: "明确约束无语音，避免模型补充额外说话内容。",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiVideoPromptProvider({
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await provider.generateVideoPrompt({
      projectId: "proj_1",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在雨夜市场中停下观察。",
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "建立警觉",
        visual: "林站在雨夜市场入口。",
        subject: "林",
        action: "林停步抬头，谨慎观察前方。",
        frameDependency: "start_frame_only",
        dialogue: null,
        os: null,
        audio: "雨声、远处摊布拍打声。",
        transitionHint: null,
        continuityNotes: "保持林的挎包始终在左肩。",
      },
      durationSec: 5,
      startFrame: {
        imageAssetPath:
          "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
        width: 1024,
        height: 576,
      },
      endFrame: null,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0]?.parts[0]?.text as string;

    expect(promptText).toContain("如果存在人物台词或旁白，必须明确写出是谁说了什么");
    expect(promptText).toContain(
      "如果没有人物台词、没有旁白、也不需要可感知语音，必须明确写出无人物对白、无旁白、无语音",
    );
    expect(promptText).toContain("不要虚构未提供的新角色设定、剧情、台词、人声、旁白、配乐或额外音效");
    expect(promptText).toContain("默认不要背景音乐、BGM、配乐");
    expect(promptText).toContain("必须输出可听音轨，不允许静音或无声成片");
    expect(promptText).toContain("系统会在最终 prompt 中追加硬性语音约束和声音约束");
  });

  it("appends deterministic no-voice constraints when the shot has no dialogue or narration", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    finalPrompt:
                      "以<<<image_1>>>为首帧锚点，镜头保持单镜头连续推进，仅表现人物观察环境与雨幕变化。",
                    dialoguePlan: "模型原始返回，可被系统覆写。",
                    audioPlan: "模型原始返回，可被系统覆写。",
                    visualGuardrails: "保持角色和空间连续。",
                    rationale: "明确约束无语音，避免模型补充额外说话内容。",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiVideoPromptProvider({
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    const result = await provider.generateVideoPrompt({
      projectId: "proj_1",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在雨夜市场中停下观察。",
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "建立警觉",
        visual: "林站在雨夜市场入口。",
        subject: "林",
        action: "林停步抬头，谨慎观察前方。",
        frameDependency: "start_frame_only",
        dialogue: null,
        os: null,
        audio: "雨声、远处摊布拍打声。",
        transitionHint: null,
        continuityNotes: "保持林的挎包始终在左肩。",
      },
      durationSec: 5,
      startFrame: {
        imageAssetPath:
          "images/batches/image_batch_1/shots/scene_1__segment_1__shot_1/start-frame/current.png",
        width: 1024,
        height: 576,
      },
      endFrame: null,
    });

    expect(result.finalPrompt).toContain("语音约束：无人物对白，无旁白，无语音，不需要口型。");
    expect(result.finalPrompt).toContain("声音约束：雨声、远处摊布拍打声。");
    expect(result.finalPrompt).toContain("必须输出可听音轨，不允许静音或无声成片。");
    expect(result.finalPrompt).toContain("无背景音乐、无BGM、无配乐。");
    expect(result.dialoguePlan).toBe("无人物对白，无旁白，无语音，不需要口型。");
    expect(result.audioPlan).toBe(
      "环境声/音效：雨声、远处摊布拍打声。未提供参考音频。必须输出可听音轨，不允许静音或无声成片。无背景音乐、无BGM、无配乐。禁止新增未提供的人声、背景音乐、BGM、配乐或额外音效。",
    );
  });

  it("tells Gemini that segment endFrame maps to the clip ending state instead of an intermediate shot timestamp", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    finalPrompt: "图片1用于开头，图片2用于结尾，片段按时间轴推进。",
                    dialoguePlan: "无人物对白，无旁白，无语音，不需要口型。",
                    audioPlan: "保留城市环境音和脚步声。",
                    visualGuardrails: "保持人物与场景连续。",
                    rationale: "通过两张参考图锚定片段开头和片段结尾。",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiVideoPromptProvider({
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    await provider.generateVideoPrompt({
      projectId: "proj_1",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林峰在街头遭遇连续霉运。",
        durationSec: 15,
      },
      shots: [
        {
          id: "shot_1",
          shotCode: "S01_01_001",
          purpose: "建立焦急状态",
          visual: "林峰在人群中奔跑。",
          subject: "林峰",
          action: "他急刹步停下看手机。",
          frameDependency: "start_and_end_frame",
          durationSec: 4,
          dialogue: null,
          os: "为什么倒霉的总是我？",
          audio: "嘈杂车流声和急促脚步声。",
          transitionHint: "硬切",
          continuityNotes: "灰气固定在头顶。",
        },
        {
          id: "shot_2",
          shotCode: "S01_01_004",
          purpose: "落到终态",
          visual: "林峰胸前布满咖啡污渍。",
          subject: "林峰",
          action: "他踉跄后退两三步才勉强站稳。",
          frameDependency: "start_and_end_frame",
          durationSec: 4,
          dialogue: null,
          os: null,
          audio: "沉闷压抑的环境音渐渐推高。",
          transitionHint: "硬切",
          continuityNotes: "咖啡污渍位置固定。",
        },
      ],
      referenceImages: [
        {
          id: "ref_img_1",
          assetPath: "images/segment_1/start-frame.png",
          source: "auto",
          order: 0,
          sourceShotId: "shot_1",
          label: "S01_01_001 start",
        },
        {
          id: "ref_img_2",
          assetPath: "images/segment_1/end-frame.png",
          source: "auto",
          order: 1,
          sourceShotId: "shot_1",
          label: "S01_01_001 end",
        },
      ],
      startFrame: {
        imageAssetPath: "images/segment_1/start-frame.png",
        width: 1024,
        height: 576,
      },
      endFrame: {
        imageAssetPath: "images/segment_1/end-frame.png",
        width: 1024,
        height: 576,
      },
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0]?.parts[0]?.text as string;

    expect(promptText).toContain("segment.startFrame 和 segment.endFrame");
    expect(promptText).toContain("不要把 segment.endFrame 误写成第一个子镜头的结束画面");
    expect(promptText).toContain("segment 起始关键帧");
    expect(promptText).toContain("segment 结尾关键帧");
  });

  it("filters music-like clauses out of deterministic audio constraints and prompt context", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    finalPrompt: "片段保留鸟鸣、脚步声和人物动作拟音。",
                    dialoguePlan: "模型原始返回，可被系统覆写。",
                    audioPlan: "模型原始返回，可被系统覆写。",
                    visualGuardrails: "保持彩虹广场和人物服装连续。",
                    rationale: "测试系统是否剔除配乐描述。",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiVideoPromptProvider({
      apiToken: "test-token",
      model: "gemini-3.1-pro-preview",
    });

    const result = await provider.generateVideoPrompt({
      projectId: "proj_1",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_4",
        order: 1,
        summary: "雨后彩虹下的林峰感受到转运。",
      },
      shots: [
        {
          id: "shot_1",
          shotCode: "S04_SEG01_01",
          purpose: "建立雨后空间",
          visual: "暴雨初歇的广场上挂着彩虹。",
          subject: "林峰",
          action: "林峰深呼吸，感受雨后空气。",
          frameDependency: "start_frame_only",
          durationSec: 5,
          dialogue: null,
          os: null,
          audio: "雨后清脆的鸟鸣声，舒缓治愈的吉他旋律淡入。",
          transitionHint: null,
          continuityNotes: "保持光线明亮稳定。",
        },
        {
          id: "shot_2",
          shotCode: "S04_SEG01_02",
          purpose: "沉淀情绪",
          visual: "林峰低头注视胸前微光。",
          subject: "林峰",
          action: "他轻拍胸口，随后释然微笑。",
          frameDependency: "start_frame_only",
          durationSec: 5,
          dialogue: null,
          os: "转运真的就在一瞬间。",
          audio: "背景音乐开始向高潮推升，衣物轻微摩擦声。",
          transitionHint: null,
          continuityNotes: "金光位置与手部动作对应。",
        },
      ],
      startFrame: {
        imageAssetPath: "images/segment_4/start-frame.png",
        width: 1024,
        height: 576,
      },
      endFrame: null,
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0]?.parts[0]?.text as string;

    expect(promptText).not.toContain("吉他旋律");
    expect(promptText).not.toContain("背景音乐开始向高潮推升");
    expect(result.audioPlan).toContain("雨后清脆的鸟鸣声");
    expect(result.audioPlan).toContain("衣物轻微摩擦声");
    expect(result.audioPlan).not.toContain("吉他旋律");
    expect(result.audioPlan).not.toContain("背景音乐开始向高潮推升");
  });
});
