import { describe, expect, it } from "vitest";

import { buildFramePromptText } from "../src/providers/frame-prompt-template";

describe("frame prompt template", () => {
  it("adds single-frame guidance for shots that only need a start frame", () => {
    const promptText = buildFramePromptText({
      projectId: "proj_1",
      frameType: "start_frame",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在市场入口停住。",
        shots: [
          {
            id: "shot_1",
            shotCode: "SC01-SG01-SH01",
            purpose: "建立入口状态。",
            visual: "雨夜市场入口。",
            subject: "林",
            action: "她停住脚步。",
            frameDependency: "start_frame_only",
            dialogue: null,
            os: null,
            audio: "雨声。",
            transitionHint: null,
            continuityNotes: null,
          },
        ],
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "建立入口状态。",
        visual: "雨夜市场入口。",
        subject: "林",
        action: "她停住脚步。",
        frameDependency: "start_frame_only",
        dialogue: null,
        os: null,
        audio: "雨声。",
        transitionHint: null,
        continuityNotes: null,
      },
      characterRoster: [],
      sceneCandidates: [],
    });

    expect(promptText).toContain('"currentShot"');
    expect(promptText).toContain('"frameDependency": "start_frame_only"');
    expect(promptText).toContain("这是一个只需要 start_frame 的单帧镜头");
    expect(promptText).toContain("不要虚构 end_frame");
    expect(promptText).toContain("选择当前 shot 最关键、最完整、最适合出图的代表性瞬间");
  });

  it("includes resolved scene context so frame planning does not degrade to character-only prompts", () => {
    const promptText = buildFramePromptText({
      projectId: "proj_1",
      frameType: "start_frame",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林在雨夜市场入口确认出口被堵住。",
        shots: [],
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH01",
        purpose: "建立堵路关系。",
        visual: "雨夜市场入口，霓虹映在积水里。",
        subject: "林",
        action: "她停住脚步看向出口。",
        frameDependency: "start_and_end_frame",
        dialogue: null,
        os: null,
        audio: "雨声。",
        transitionHint: null,
        continuityNotes: "保持市场棚顶与入口招牌位置。",
      },
      characterRoster: [],
      sceneCandidates: [
        {
          sceneId: "scene_sheet_market",
          sceneName: "雨夜市场入口",
          scenePurpose: "作为追逐戏前的核心环境锚点。",
          promptTextCurrent: "雨夜市场入口，狭窄棚顶、潮湿地面、冷暖混合霓虹，出口通道逼仄。",
          constraintsText: "保持棚顶结构、入口招牌、积水反光和逼仄出口关系。",
          imageAssetPath: "scene-sheets/scene_sheet_market/current.png",
          environmentSummary: "雨夜市场入口，狭窄棚顶、潮湿地面、冷暖混合霓虹，出口通道逼仄。",
        },
      ],
      sceneContext: {
        source: "shot_script",
        sceneId: "scene_1",
        sceneName: "雨夜市场入口",
        scenePurpose: null,
        promptTextCurrent: null,
        constraintsText: "保持棚顶结构、入口招牌、积水反光和逼仄出口关系。",
        imageAssetPath: null,
        environmentSummary: "林在雨夜市场入口确认出口被堵住。",
      },
    } as any);

    expect(promptText).toContain('"sceneCandidates"');
    expect(promptText).toContain('"sceneContext"');
    expect(promptText).toContain('"sceneName": "雨夜市场入口"');
    expect(promptText).toContain("不能只写人物");
    expect(promptText).toContain("只能从 sceneCandidates 中选择 selectedSceneId");
    expect(promptText).toContain("优先根据 selectedSceneId 对应的 sceneCandidates 锁定环境空间");
  });

  it("biases scene selection toward the closest approved environment instead of returning null for secondary detail mismatch", () => {
    const promptText = buildFramePromptText({
      projectId: "proj_1",
      frameType: "start_frame",
      segment: {
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        summary: "林峰在现代CBD连续遭遇霉运。",
        shots: [],
      },
      currentShot: {
        id: "shot_1",
        shotCode: "SC01-SG01-SH04",
        purpose: "建立街头崩溃的起点。",
        visual: "繁华CBD街头夜景，霓虹灯在玻璃幕墙间反射。",
        subject: "林峰",
        action: "他刚从耳边放下黑屏手机，双手准备抱头。",
        frameDependency: "start_and_end_frame",
        dialogue: null,
        os: null,
        audio: "远处车流与城市底噪。",
        transitionHint: null,
        continuityNotes: "保持商务街区的高层玻璃幕墙与冷色压迫感。",
      },
      characterRoster: [],
      sceneCandidates: [
        {
          sceneId: "scene_cbd",
          sceneName: "现代CBD办公区",
          scenePurpose: "作为主角连续倒霉的都市环境锚点。",
          promptTextCurrent:
            "现代CBD办公区，高层玻璃幕墙与冷灰商务大堂相连，电子屏冷光构成压迫都市氛围。",
          constraintsText: "保持高层玻璃幕墙、商务街区秩序感与冷色商务气质。",
          imageAssetPath: "scene-sheets/scene_cbd/current.png",
          environmentSummary:
            "现代CBD办公区，高层玻璃幕墙、商务街区、冷灰秩序感、电子屏冷光。",
        },
      ],
      sceneContext: {
        source: "shot_script",
        sceneId: "scene_1",
        sceneName: "现代CBD街头",
        scenePurpose: null,
        promptTextCurrent: null,
        constraintsText: "保持商务街区的高层玻璃幕墙与冷色压迫感。",
        imageAssetPath: null,
        environmentSummary:
          "繁华CBD街头夜景，霓虹灯在玻璃幕墙间反射，林峰在街头因手机黑屏濒临崩溃。",
      },
    } as any);

    expect(promptText).toContain("空间主类型和叙事功能优先于次级装饰差异");
    expect(promptText).toContain("如果 shot 是 CBD街头、商务楼外街道、办公区外立面");
    expect(promptText).toContain("优先选择同属现代CBD办公区的候选场景");
    expect(promptText).toContain("只有当所有 sceneCandidates 与当前 shot 的主空间类型或叙事功能都明显冲突时，才能返回 null");
  });
});
