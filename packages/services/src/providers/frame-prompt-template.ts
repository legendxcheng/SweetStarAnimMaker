import type { GenerateFramePromptInput } from "@sweet-star/core";

export function buildFramePromptText(input: GenerateFramePromptInput) {
  const context = {
    projectId: input.projectId,
    frameType: input.frameType,
    currentShot: input.currentShot,
    startFrameContext: input.startFrameContext,
    sceneCandidates: input.sceneCandidates,
    sceneContext: input.sceneContext,
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
    "只能从 sceneCandidates 中选择 selectedSceneId；只有当所有 sceneCandidates 与当前 shot 的主空间类型或叙事功能都明显冲突时，才能返回 null。",
    "promptText 必须具体、可见、可执行，直接服务于出图。",
    "negativePromptText 只写需要排除的画面缺陷或风格偏差，没有则返回 null。",
    "rationale 用中文简述规划原因，没有则返回 null。",
    "promptText 必须同时处理人物与场景，不能只写人物、忽略环境。",
    "优先根据 selectedSceneId 对应的 sceneCandidates 锁定环境空间、关键陈设、光线氛围和空间关系。",
    "做场景选择时，空间主类型和叙事功能优先于次级装饰差异；不要因为昼夜、霓虹、天气、机位、局部街角/大堂切换等细节不同，就放弃本质上匹配的候选场景。",
    "如果 shot 是 CBD街头、商务楼外街道、办公区外立面、商务大堂、玻璃幕墙办公楼周边，而候选中有“现代CBD办公区”这类同一主空间类型的场景，应优先选择同属现代CBD办公区的候选场景，而不是返回 null。",
    "当 sceneCandidates 已能提供同一主环境锚点时，可以在 promptText 中补充当前 shot 特有的街头霓虹、夜景、雨后反光、局部角落等细节。",
    "如果 selectedSceneId 为 null，仍要利用 sceneContext 中的 shot_script 环境摘要，把场景写成明确可见的描述。",
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

  if (input.frameType === "end_frame") {
    rules.push(
      "保持同一 shot 的角色造型、服装、主体数量、镜头逻辑、基础环境和主导光色方向连续。",
    );
    rules.push("表达该 shot 的结果状态或情绪落点，而不是复述 start_frame。");

    if (input.startFrameContext?.promptTextCurrent) {
      rules.push("用 startFrameContext.promptTextCurrent 作为连续性锚点。");
      rules.push(
        "必须在 startFrameContext.promptTextCurrent 的基础上生成尾帧：保留人物身份、服装、场景和光线连续性，但根据 currentShot.action / visual / continuityNotes 推进到同一段落的最终状态。",
      );
      rules.push(
        "promptText 必须明确写出相对首帧已经发生的画面变化，例如人物站位变化、手中道具/符咒状态变化、动作完成结果、情绪落点或空间关系变化。",
      );
      rules.push("不要复制或同义改写首帧，不要让尾帧与首帧只有轻微措辞差异。");
    }
  }

  return [
    ...rules,
    "",
    "上下文 JSON：",
    JSON.stringify(context, null, 2),
    "",
    "返回一个 JSON 对象，字段仅允许：frameType, selectedCharacterIds, selectedSceneId, promptText, negativePromptText, rationale。",
    "不要输出 markdown 代码块，不要输出额外说明。",
  ].join("\n");
}
