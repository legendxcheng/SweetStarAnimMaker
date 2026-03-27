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
    });

    expect(promptText).toContain('"currentShot"');
    expect(promptText).toContain('"frameDependency": "start_frame_only"');
    expect(promptText).toContain("这是一个只需要 start_frame 的单帧镜头");
    expect(promptText).toContain("不要虚构 end_frame");
    expect(promptText).toContain("选择当前 shot 最关键、最完整、最适合出图的代表性瞬间");
  });
});
