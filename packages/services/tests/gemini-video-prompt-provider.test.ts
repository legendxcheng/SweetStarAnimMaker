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
                    selectedCharacterIds: ["character_1"],
                    selectedSceneId: "scene_sheet_market",
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
      characterCandidates: [
        {
          id: "character_1",
          characterName: "林",
          promptTextCurrent: "背挎包的青年。",
          imageAssetPath: "character-sheets/batches/char_batch_1/characters/character_1/current.png",
        },
        {
          id: "character_2",
          characterName: "无关路人",
          promptTextCurrent: "不会出现在本片段。",
          imageAssetPath: "character-sheets/batches/char_batch_1/characters/character_2/current.png",
        },
      ],
      sceneCandidates: [
        {
          id: "scene_sheet_market",
          sceneName: "雨夜市场",
          scenePurpose: "林发现异常",
          promptTextCurrent: "雨夜市场、霓虹积水。",
          constraintsText: "保持雨夜和积水反光。",
          imageAssetPath: "scene-sheets/batches/scene_batch_1/scenes/scene_sheet_market/current.png",
        },
      ],
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
    expect(result.selectedCharacterIds).toEqual(["character_1"]);
    expect(result.selectedSceneId).toBe("scene_sheet_market");

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseJsonSchema.required).toEqual([
      "finalPrompt",
      "dialoguePlan",
      "audioPlan",
      "visualGuardrails",
      "rationale",
      "selectedCharacterIds",
      "selectedSceneId",
    ]);
    const promptText = request.contents[0]?.parts[0]?.text as string;
    expect(promptText).toContain("候选人物设定图（由你判断是否相关）");
    expect(promptText).toContain("id=character_1");
    expect(promptText).toContain("id=character_2");
    expect(promptText).toContain("候选场景设定图（由你判断是否相关）");
    expect(promptText).toContain("selectedCharacterIds 和 selectedSceneId 只能使用下方候选列表中给出的 id");
  });

  it("labels segment start and end frames independently from reference image order", async () => {
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
                      "视频以【首帧图片】作为0秒开场状态，最终定格在【尾帧图片】的稳定终态。",
                    dialoguePlan: "无人物对白，无旁白，无语音，不需要口型。",
                    audioPlan: "保留环境声。",
                    visualGuardrails: "保持首尾帧连续。",
                    rationale: "使用明确的首尾帧别名避免图片序号误解。",
                    selectedCharacterIds: ["character_1"],
                    selectedSceneId: "scene_sheet_cbd",
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
        summary: "林峰在CBD街道遭遇连环倒霉事件。",
        durationSec: 15,
        shotCount: 3,
      },
      shots: [
        {
          id: "shot_1",
          shotCode: "S01_01_001",
          purpose: "奔跑停下",
          visual: "林峰在CBD街道奔跑并查看手机。",
          subject: "林峰",
          action: "林峰急刹停下查看手机。",
          frameDependency: "start_frame_only",
          dialogue: null,
          os: "为什么倒霉的总是我？",
          audio: "嘈杂的车流声及急促的脚步声。",
          transitionHint: null,
          continuityNotes: "保持灰气特效和深灰色皱西装。",
          durationSec: 4,
        },
      ],
      referenceImages: [
        {
          id: "scene_ref",
          assetPath: "scene-sheets/cbd/current.png",
          source: "auto",
          order: 0,
          sourceShotId: null,
          label: "Scene CBD",
        },
        {
          id: "character_ref",
          assetPath: "character-sheets/linfeng/current.png",
          source: "auto",
          order: 1,
          sourceShotId: null,
          label: "Character 林峰",
        },
        {
          id: "start_ref",
          assetPath: "images/segments/segment_1/start-frame/current.png",
          source: "auto",
          order: 2,
          sourceShotId: "shot_1",
          label: "S01_01_001 start",
          frameRole: "first_frame",
        },
        {
          id: "end_ref",
          assetPath: "images/segments/segment_1/end-frame/current.png",
          source: "auto",
          order: 3,
          sourceShotId: "shot_1",
          label: "S01_01_003 end",
          frameRole: "last_frame",
        },
      ],
      startFrame: {
        imageAssetPath: "images/segments/segment_1/start-frame/current.png",
        width: 1024,
        height: 576,
      },
      endFrame: {
        imageAssetPath: "images/segments/segment_1/end-frame/current.png",
        width: 1024,
        height: 576,
      },
    });

    const request = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const promptText = request.contents[0]?.parts[0]?.text as string;

    expect(promptText).toContain("图片3");
    expect(promptText).toContain("首帧图片");
    expect(promptText).toContain("图片4");
    expect(promptText).toContain("尾帧图片");
    expect(promptText).toContain("不要把图片1、图片2等普通参考图写成片段首帧或尾帧");
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
                    selectedCharacterIds: [],
                    selectedSceneId: null,
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
                    selectedCharacterIds: [],
                    selectedSceneId: null,
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
                    selectedCharacterIds: [],
                    selectedSceneId: null,
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
    expect(promptText).toContain("尾帧图片只能作为最后一瞬间要抵达的目标状态");
    expect(promptText).toContain("不要让最后一个子镜头一开始就已经定格或静止在尾帧图片状态");
    expect(promptText).toContain("必须先完成最后动作链，再在片段最后自然抵达尾帧图片状态");
    expect(promptText).toContain("segment 起始关键帧");
    expect(promptText).toContain("segment 结尾关键帧");
  });

  it("prepends a deterministic sub-shot timeline when Gemini collapses a multi-shot segment into prose", async () => {
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
                      "视频开始，林峰走到广告牌下方，广告牌连接处崩断，他从容后退，广告牌擦着鼻尖落下并砸碎在地，路人惊慌躲避，林峰庆幸地看着碎片。",
                    dialoguePlan: "模型原始返回，可被系统覆写。",
                    audioPlan: "模型原始返回，可被系统覆写。",
                    visualGuardrails: "保持林峰服装、站位和大厅空间连续。",
                    rationale: "模型把多个子镜头合并成了连续事件描述。",
                    selectedCharacterIds: [],
                    selectedSceneId: null,
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
      projectId: "proj_20260420_b4966d",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_3",
        order: 1,
        name: "广告牌坠落危机",
        summary: "林峰在财团大厅中险些被坠落广告牌砸中。",
        durationSec: 15,
        shotCount: 5,
      },
      shots: [
        {
          id: "shot_1",
          shotCode: "S03_Seg01_01",
          purpose: "交代环境，引导角色自然进入危机发生的中心区域。",
          visual: "阳光明媚的写字楼大厅，林峰步伐平稳地向前走去，恰好走到一块半空悬挂的巨大广告牌正下方。",
          subject: "林峰",
          action: "林峰正常行走，走到广告牌下方时略微停顿了一下。",
          frameDependency: "start_frame_only",
          dialogue: null,
          os: null,
          audio: "写字楼大厅的环境音，平稳的脚步声。",
          transitionHint: "切",
          continuityNotes: "林峰服装一致，大厅光线明亮，机位稳定。",
          durationSec: 3,
        },
        {
          id: "shot_2",
          shotCode: "S03_Seg01_02",
          purpose: "利用细节展示制造突发危机，拉高紧张感和悬念。",
          visual: "半空中的沉重广告牌特写，连接处突然发生严重变形并崩断。",
          subject: "广告牌",
          action: "广告牌金属固定件崩断，结构失去平衡准备坠落。",
          frameDependency: "start_frame_only",
          dialogue: null,
          os: null,
          audio: "尖锐刺耳的金属断裂声。",
          transitionHint: "切",
          continuityNotes: "广告牌的材质与设计样式应与前一镜头的背景保持一致。",
          durationSec: 2,
        },
        {
          id: "shot_3",
          shotCode: "S03_Seg01_03",
          purpose: "精准展示林峰的预知反应与从容态度，体现转运后的直接效果。",
          visual: "中景，林峰仿佛有预知感应一般，没有任何惊慌，从容地停住脚步。",
          subject: "林峰",
          action: "林峰立刻停步，身体重心微微后移，从容地退后半步，抬头看向斜上方。",
          frameDependency: "start_frame_only",
          dialogue: null,
          os: null,
          audio: "轻微的衣物摩擦声，环境音短暂变弱带来心理压迫感。",
          transitionHint: "切",
          continuityNotes: "站位保持在广告牌的阴影边缘，保持衣着连贯。",
          durationSec: 2,
        },
        {
          id: "shot_4",
          shotCode: "S03_Seg01_04",
          purpose: "呈现擦肩而过的致命危机，放大化太岁功效带来的视觉震撼。",
          visual: "特写或近景仰拍角度，巨大的广告牌带着厚重的阴影急速坠落，极其惊险地擦着林峰的鼻尖划过。",
          subject: "林峰，广告牌",
          action: "广告牌垂直狠狠落下，林峰保持后退姿态稳住重心不动，两者险之又险地擦肩而过。",
          frameDependency: "start_frame_only",
          dialogue: null,
          os: null,
          audio: "重物划破空气的呼啸声，风声灌耳。",
          transitionHint: "切",
          continuityNotes: "林峰的姿态需符合上一个镜头后撤半步后的相对静止状态。",
          durationSec: 2,
        },
        {
          id: "shot_5",
          shotCode: "S03_Seg01_05",
          purpose: "展示灾难后果的破坏力，对比出完好无损的幸运，确立逆袭感并交代内心戏。",
          visual: "全景拉开，巨大的广告牌重重砸在林峰面前的地面上瞬间粉碎。周围路人惊慌失措地看过来，而林峰安然无恙地站在原地，凝视地上的碎片。",
          subject: "林峰，路人",
          action: "广告牌狠狠砸碎在地，碎片飞溅，路人受到极大惊吓纷纷躲避，林峰神情从紧绷逐渐转为带有明悟的庆幸。",
          frameDependency: "start_frame_only",
          dialogue: null,
          os: "好险但这感觉，跟以前完全不一样了。",
          audio: "巨大的重物坠地轰鸣声，碎片摔碎的噼啪声，路人的惊呼声。",
          transitionHint: null,
          continuityNotes: "地上的碎片散落位置需紧挨着林峰的正前方，展现距离之近。",
          durationSec: 6,
        },
      ],
    });

    expect(result.finalPrompt).toContain("【子镜头时间轴】");
    expect(result.finalPrompt).toContain("0-3秒 / S03_Seg01_01：");
    expect(result.finalPrompt).toContain("3-5秒 / S03_Seg01_02：");
    expect(result.finalPrompt).toContain("5-7秒 / S03_Seg01_03：");
    expect(result.finalPrompt).toContain("7-9秒 / S03_Seg01_04：");
    expect(result.finalPrompt).toContain("9-15秒 / S03_Seg01_05：");
    expect(result.finalPrompt).toContain("视频开始，林峰走到广告牌下方");
    expect(result.finalPrompt).toContain(
      "语音约束：无人物对白。子镜头5（S03_Seg01_05）旁白/画外音：好险但这感觉，跟以前完全不一样了。",
    );
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
                    selectedCharacterIds: [],
                    selectedSceneId: null,
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
