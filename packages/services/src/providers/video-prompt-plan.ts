import type { GenerateVideoPromptInput, GenerateVideoPromptResult } from "@sweet-star/core";

export const videoPromptPlanResponseJsonSchema = {
  type: "object",
  required: ["finalPrompt", "dialoguePlan", "audioPlan", "visualGuardrails", "rationale"],
  properties: {
    finalPrompt: { type: "string" },
    dialoguePlan: { type: "string" },
    audioPlan: { type: "string" },
    visualGuardrails: { type: "string" },
    rationale: { type: "string" },
  },
} as const;

export function buildVideoPromptText(input: GenerateVideoPromptInput) {
  const shots = resolveShots(input);
  const referenceImages = resolveReferenceImages(input);
  const referenceAudios = resolveReferenceAudios(input);
  const segmentDurationSec = resolveSegmentDurationSec(input, shots);

  const lines = [
    "任务：为 Seedance 2.0 短剧片段生成一个结构化 JSON prompt plan。",
    "",
    "输出字段：",
    "- finalPrompt",
    "- dialoguePlan",
    "- audioPlan",
    "- visualGuardrails",
    "- rationale",
    "",
    "关键要求：",
    "- finalPrompt 必须直接可用于 Seedance 2.0 多模态参考生视频。",
    "- finalPrompt 必须使用简体中文自然语言，不要输出 JSON 片段、标题或解释。",
    "- 这是一个连续短剧片段，不是单镜头 Kling prompt，也不要写成互相孤立的分镜清单。",
    "- 必须把内部 shots 改写成连续时间轴，明确片段开头承接状态、中段推进、结尾交接状态。",
    "- 必须优先控制连续性：人物外观、服装道具、空间关系、情绪线、动作起点和动作终点。",
    "- 不要虚构未提供的新角色设定、剧情、台词、人声、旁白、配乐或额外音效。",
    "- 如果提供参考图片，必须用“图片1 / 图片2 / ...”显式指代，说明每张图片用于保持什么连续性。",
    "- 如果提供参考音频，必须说明其只作为音色、节奏、环境声或口型节奏参考，不要凭空扩写未提供的人声内容。",
    "- 必须保留对白、旁白、环境声、拟音和连续性要求；如果没有，也要在 plan 中明确说明。",
    "- 如果存在人物台词或旁白，必须明确写出是谁说了什么，区分角色对白与旁白/画外音。",
    "- 如果有可感知语音，必须明确写出是否需要可见口型，以及哪些台词需要被观众听见。",
    "- 如果没有人物台词、没有旁白、也不需要可感知语音，必须明确写出无人物对白、无旁白、无语音。",
    "- 必须输出可听音轨，不允许静音或无声成片。",
    "- 默认不要背景音乐、BGM、配乐；最终 prompt 和 audioPlan 都要明确写无背景音乐、无BGM、无配乐。",
    "- 系统会在最终 prompt 中追加硬性语音约束和声音约束，你生成的内容必须与这组硬性约束一致。",
    "",
    "片段上下文：",
    `- projectId：${input.projectId}`,
    `- segmentId：${input.segment.segmentId}`,
    `- sceneId：${input.segment.sceneId}`,
    `- segment 顺序：${input.segment.order}`,
    `- segment 名称：${input.segment.name ?? "未命名"}`,
    `- segment 摘要：${input.segment.summary}`,
    `- segment 时长秒数：${segmentDurationSec ?? "未知"}`,
    `- 内部 shot 数：${shots.length}`,
    "",
    "参考图片：",
    ...formatReferenceImages(referenceImages),
    "",
    "参考音频：",
    ...formatReferenceAudios(referenceAudios),
    "",
    "内部 shots，需要改写成连续时间轴：",
    ...formatShotTimeline(shots, segmentDurationSec),
    "",
    "dialoguePlan 要求：",
    "- 写清是否存在人物对白、旁白/画外音、其他可感知语音。",
    "- 如果有语音，必须写清说话主体、逐句台词或旁白内容、是否需要可见口型、节奏提示。",
    "- 如果没有任何语音，必须明确写无人物对白、无旁白、无语音，不需要口型。",
    "",
    "audioPlan 要求：",
    "- 写清环境声、拟音、参考音频用途、音乐氛围、声场重点，以及是否只有环境声而无人声。",
    "- 必须明确写必须输出可听音轨，不允许静音或无声成片。",
    "- 必须明确写无背景音乐、无BGM、无配乐。",
    "",
    "visualGuardrails 要求：",
    "- 写清角色一致性、服装道具一致性、镜头运动、空间连续性、时间连续性、参考图片用途、开头承接和结尾交接状态。",
    "- 禁止新增无关角色、无关空镜、夸张特效、过度炫技运镜或破坏连续性的机位跳变。",
    "",
    "rationale 要求：",
    "- 用简短中文解释 finalPrompt 如何把内部 shots 组织成一个 Seedance 连续片段。",
  ];

  return lines.filter(Boolean).join("\n");
}

export function normalizeVideoPromptPayload(
  rawText: string,
  input: GenerateVideoPromptInput,
  providerLabel: string,
): Omit<GenerateVideoPromptResult, "rawResponse" | "provider" | "model"> {
  let payload: unknown;

  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error(`${providerLabel} provider returned invalid prompt plan JSON`);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error(`${providerLabel} provider returned invalid prompt plan JSON`);
  }

  const finalPromptBase = readNonEmptyString(
    (payload as { finalPrompt?: unknown }).finalPrompt,
    "finalPrompt",
    providerLabel,
  );
  const visualGuardrails = readNonEmptyString(
    (payload as { visualGuardrails?: unknown }).visualGuardrails,
    "visualGuardrails",
    providerLabel,
  );
  const rationale = readNonEmptyString(
    (payload as { rationale?: unknown }).rationale,
    "rationale",
    providerLabel,
  );
  const dialoguePlan = buildDialoguePlan(input);
  const audioPlan = buildAudioPlan(input);

  return {
    finalPrompt: appendHardConstraints(
      finalPromptBase,
      dialoguePlan,
      buildFinalPromptAudioConstraint(input),
    ),
    dialoguePlan,
    audioPlan,
    visualGuardrails,
    rationale,
  };
}

function readNonEmptyString(value: unknown, fieldName: string, providerLabel: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${providerLabel} provider returned invalid ${fieldName}`);
  }

  return value.trim();
}

function buildDialoguePlan(input: GenerateVideoPromptInput) {
  const shots = resolveShots(input);
  const spokenParts: string[] = [];
  let hasDialogue = false;
  let hasNarration = false;

  shots.forEach((shot, index) => {
    const shotLabel = `子镜头${index + 1}（${shot.shotCode}）`;
    const dialogue = normalizeSentence(shot.dialogue);
    const narration = normalizeSentence(shot.os);

    if (dialogue) {
      hasDialogue = true;
      spokenParts.push(`${shotLabel}人物对白：${dialogue}对白需要可见口型。`);
    }

    if (narration) {
      hasNarration = true;
      spokenParts.push(`${shotLabel}旁白/画外音：${narration}`);
    }
  });

  if (!hasDialogue && !hasNarration) {
    return "无人物对白，无旁白，无语音，不需要口型。";
  }

  if (!hasDialogue) {
    spokenParts.unshift("无人物对白。");
  }

  if (!hasNarration) {
    spokenParts.push("无旁白。");
  }

  return spokenParts.join("");
}

function buildAudioPlan(input: GenerateVideoPromptInput) {
  const shotAudioClauses = uniqueStrings(
    resolveShots(input)
      .map((shot) => normalizeClause(shot.audio))
      .filter((value): value is string => Boolean(value)),
  );
  const referenceAudioClauses = resolveReferenceAudios(input).map((audio, index) =>
    `音频${index + 1}${audio.label ? `（${audio.label}）` : ""}${formatDurationSuffix(
      audio.durationSec ?? null,
    )}`,
  );
  const sourceAudioText =
    shotAudioClauses.length > 0 ? shotAudioClauses.join("；") : "未提供明确环境声/拟音描述";
  const referenceAudioText =
    referenceAudioClauses.length > 0
      ? `参考音频：${referenceAudioClauses.join("、")}，只作为音色、节奏、环境声或口型节奏参考。`
      : "未提供参考音频。";

  return `环境声/音效：${sourceAudioText}。${referenceAudioText}必须输出可听音轨，不允许静音或无声成片。无背景音乐、无BGM、无配乐。禁止新增未提供的人声、背景音乐、BGM、配乐或额外音效。`;
}

function buildFinalPromptAudioConstraint(input: GenerateVideoPromptInput) {
  const audioText = uniqueStrings(
    resolveShots(input)
      .map((shot) => normalizeClause(shot.audio))
      .filter((value): value is string => Boolean(value)),
  ).join("；");
  const referenceAudioText = resolveReferenceAudios(input)
    .map((audio, index) => `音频${index + 1}${audio.label ? `（${audio.label}）` : ""}`)
    .join("、");
  const parts = [
    audioText ? `声音约束：${audioText}。` : "声音约束：未提供明确环境声/拟音描述。",
  ];

  if (referenceAudioText) {
    parts.push(`参考音频约束：使用${referenceAudioText}作为声音参考，不新增未提供的人声内容。`);
  }

  parts.push("必须输出可听音轨，不允许静音或无声成片。无背景音乐、无BGM、无配乐。");

  return parts.join("");
}

function appendHardConstraints(finalPrompt: string, dialoguePlan: string, audioConstraint: string) {
  const parts = [finalPrompt.trim()];

  if (!finalPrompt.includes("语音约束：")) {
    parts.push(`语音约束：${dialoguePlan}`);
  }

  if (!finalPrompt.includes("声音约束：")) {
    parts.push(audioConstraint);
  }

  return parts.join("\n");
}

function resolveShots(input: GenerateVideoPromptInput) {
  return input.shots && input.shots.length > 0
    ? input.shots
    : input.currentShot
      ? [input.currentShot]
      : [];
}

function resolveReferenceImages(input: GenerateVideoPromptInput) {
  if (input.referenceImages && input.referenceImages.length > 0) {
    return input.referenceImages;
  }

  const references = [];

  if (input.startFrame?.imageAssetPath) {
    references.push({
      id: "image_1",
      assetPath: input.startFrame.imageAssetPath,
      source: "auto" as const,
      order: 0,
      sourceShotId: input.currentShot?.id ?? null,
      label: "首帧参考",
    });
  }

  if (input.endFrame?.imageAssetPath) {
    references.push({
      id: "image_2",
      assetPath: input.endFrame.imageAssetPath,
      source: "auto" as const,
      order: references.length,
      sourceShotId: input.currentShot?.id ?? null,
      label: "尾帧参考",
    });
  }

  return references;
}

function resolveReferenceAudios(input: GenerateVideoPromptInput) {
  return input.referenceAudios ?? [];
}

function resolveSegmentDurationSec(
  input: GenerateVideoPromptInput,
  shots: ReturnType<typeof resolveShots>,
) {
  if (typeof input.segment.durationSec === "number") {
    return input.segment.durationSec;
  }

  if (typeof input.durationSec === "number") {
    return input.durationSec;
  }

  const shotDurationSum = shots.reduce((sum, shot) => sum + (shot.durationSec ?? 0), 0);

  return shotDurationSum > 0 ? shotDurationSum : null;
}

function formatReferenceImages(images: ReturnType<typeof resolveReferenceImages>) {
  if (images.length === 0) {
    return ["- 无参考图片。"];
  }

  return images.map(
    (image, index) =>
      `- 图片${index + 1}：${image.label ?? "未命名参考图"}；assetPath=${image.assetPath}；source=${image.source}；sourceShotId=${image.sourceShotId ?? "无"}`,
  );
}

function formatReferenceAudios(audios: ReturnType<typeof resolveReferenceAudios>) {
  if (audios.length === 0) {
    return ["- 无参考音频。"];
  }

  return audios.map(
    (audio, index) =>
      `- 音频${index + 1}：${audio.label ?? "未命名参考音频"}；assetPath=${audio.assetPath}；duration=${formatDuration(audio.durationSec ?? null)}`,
  );
}

function formatShotTimeline(
  shots: ReturnType<typeof resolveShots>,
  segmentDurationSec: number | null,
) {
  if (shots.length === 0) {
    return ["- 无内部 shot 数据。"];
  }

  let cursor = 0;

  return shots.map((shot, index) => {
    const durationSec =
      shot.durationSec ??
      (segmentDurationSec ? Math.max(1, Math.round(segmentDurationSec / shots.length)) : null);
    const timeWindow = durationSec
      ? `${formatSeconds(cursor)}-${formatSeconds(cursor + durationSec)}秒`
      : `子镜头${index + 1}`;
    cursor += durationSec ?? 0;

    return [
      `- ${timeWindow} / ${shot.shotCode}`,
      `目的：${shot.purpose}`,
      `画面：${shot.visual}`,
      `主体：${shot.subject}`,
      `动作：${shot.action}`,
      `frameDependency：${shot.frameDependency}`,
      `对白：${shot.dialogue ?? "无"}`,
      `旁白/画外音：${shot.os ?? "无"}`,
      `音频/声效：${shot.audio ?? "无"}`,
      `转场提示：${shot.transitionHint ?? "无"}`,
      `连续性要求：${shot.continuityNotes ?? "无"}`,
    ].join("；");
  });
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeSentence(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return /[。！？!?]$/.test(trimmed) ? trimmed : `${trimmed}。`;
}

function normalizeClause(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/[。！？!?]+$/u, "");
}

function formatDuration(value: number | null) {
  return typeof value === "number" ? `${value}秒` : "未知";
}

function formatDurationSuffix(value: number | null) {
  return typeof value === "number" ? `，${value}秒` : "";
}

function formatSeconds(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
