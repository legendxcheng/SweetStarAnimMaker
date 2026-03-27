import type { GenerateFramePromptInput } from "@sweet-star/core";

export function buildFramePromptText(input: GenerateFramePromptInput) {
  const context = {
    projectId: input.projectId,
    frameType: input.frameType,
    currentShot: input.currentShot,
    segment: {
      segmentId: input.segment.segmentId,
      sceneId: input.segment.sceneId,
      order: input.segment.order,
      summary: input.segment.summary,
      shots: input.segment.shots,
    },
    approvedCharacterRoster: input.characterRoster,
  };

  const rules = [
    "你是一名擅长为 SeaDream 图像生成规划关键帧提示词的中文视觉导演。",
    "请只针对当前这个 shot 的当前帧位生成一个 JSON 规划结果。",
    "输出语言必须是简体中文。",
    "只能从 approvedCharacterRoster 中选择 selectedCharacterIds。",
    "promptText 必须具体、可见、可执行，直接服务于出图。",
    "negativePromptText 只写需要排除的画面缺陷或风格偏差，没有则返回 null。",
    "rationale 用中文简述规划原因，没有则返回 null。",
    "start_frame 必须体现当前 shot 的开始状态、人物站位、空间关系和动作起点。",
    "end_frame 必须体现当前 shot 的结束状态、情绪落点、动作结果和下一镜承接张力。",
    "不要让 start_frame 与 end_frame 只是同义改写，必须表现同一 shot 的不同时刻。",
  ];

  if (input.currentShot.frameDependency === "start_frame_only") {
    rules.push("这是一个只需要 start_frame 的单帧镜头。");
    rules.push("不要虚构 end_frame，不要描述不存在的首尾变化。");
    rules.push("请选择当前 shot 最关键、最完整、最适合出图的代表性瞬间。");
  } else {
    rules.push("这是一个需要 start_frame 和 end_frame 的双关键帧镜头。");
    rules.push("如果当前是 start_frame，就聚焦进入状态；如果当前是 end_frame，就聚焦收束结果。");
  }

  return [
    ...rules,
    "",
    "上下文 JSON：",
    JSON.stringify(context, null, 2),
    "",
    "返回一个 JSON 对象，字段仅允许：frameType, selectedCharacterIds, promptText, negativePromptText, rationale。",
    "不要输出 markdown 代码块，不要输出额外说明。",
  ].join("\n");
}
