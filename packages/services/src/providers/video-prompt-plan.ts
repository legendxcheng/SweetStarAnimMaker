import type { GenerateVideoPromptInput, GenerateVideoPromptResult } from "@sweet-star/core";

export const videoPromptPlanResponseJsonSchema = {
  type: "object",
  required: [
    "finalPrompt",
    "dialoguePlan",
    "audioPlan",
    "visualGuardrails",
    "rationale",
    "selectedCharacterIds",
    "selectedSceneId",
  ],
  properties: {
    finalPrompt: { type: "string" },
    dialoguePlan: { type: "string" },
    audioPlan: { type: "string" },
    visualGuardrails: { type: "string" },
    rationale: { type: "string" },
    selectedCharacterIds: {
      type: "array",
      items: { type: "string" },
    },
    selectedSceneId: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  },
} as const;

export function buildVideoPromptText(input: GenerateVideoPromptInput) {
  const shots = resolveShots(input);
  const referenceImages = resolveReferenceImages(input);
  const referenceAudios = resolveReferenceAudios(input);
  const segmentDurationSec = resolveSegmentDurationSec(input, shots);
  const shotAudioClauses = resolveShotAudioClauses(input);

  const lines = [
    "任务：为 Seedance 2.0 短剧片段生成一个结构化 JSON prompt plan。",
    "",
    "输出字段：",
    "- finalPrompt",
    "- dialoguePlan",
    "- audioPlan",
    "- visualGuardrails",
    "- rationale",
    "- selectedCharacterIds",
    "- selectedSceneId",
    "",
    "关键要求：",
    "- finalPrompt 必须直接可用于 Seedance 2.0 多模态参考生视频。",
    "- finalPrompt 必须使用简体中文自然语言，不要输出 JSON 片段、标题或解释。",
    "- 这是一个连续短剧片段，不是单镜头 Kling prompt，也不要写成互相孤立的分镜清单。",
    "- 必须把内部 shots 改写成连续时间轴，明确片段开头承接状态、中段推进、结尾交接状态。",
    "- 如果内部 shot 数大于 1，finalPrompt 必须保留【子镜头时间轴】结构，并逐行使用“0-3秒 / shotCode：画面与动作...”这种格式覆盖每个子镜头。",
    "- 多子镜头时间轴仍然属于同一次 Seedance 请求、同一个 segment 视频；不要要求为每个子镜头提供单独帧参考图。",
    "- 不允许把多个内部 shots 压缩成只有一个“视频开始...”的单段散文描述。",
    "- 必须优先控制连续性：人物外观、服装道具、空间关系、情绪线、动作起点和动作终点。",
    "- 不要虚构未提供的新角色设定、剧情、台词、人声、旁白、配乐或额外音效。",
    "- 如果提供参考图片，可以用“图片1 / 图片2 / ...”指代普通参考图，但首尾帧必须优先使用【首帧图片】和【尾帧图片】这两个别名。",
    "- 当参考图片列表中同时存在普通场景/人物参考图和首尾帧时，不要把图片1、图片2等普通参考图写成片段首帧或尾帧。",
    "- 如果提供参考音频，必须说明其只作为音色、节奏、环境声或口型节奏参考，不要凭空扩写未提供的人声内容。",
    "- 必须保留对白、旁白、环境声、拟音和连续性要求；如果没有，也要在 plan 中明确说明。",
    "- 如果存在人物台词或旁白，必须明确写出是谁说了什么，区分角色对白与旁白/画外音。",
    "- 如果有可感知语音，必须明确写出是否需要可见口型，以及哪些台词需要被观众听见。",
    "- 如果没有人物台词、没有旁白、也不需要可感知语音，必须明确写出无人物对白、无旁白、无语音。",
    "- 必须输出可听音轨，不允许静音或无声成片。",
    "- 默认不要背景音乐、BGM、配乐；最终 prompt 和 audioPlan 都要明确写无背景音乐、无BGM、无配乐。",
    "- 如果同时提供 segment.startFrame 和 segment.endFrame，它们分别代表整段片段的开场状态和片段结束时的稳定终态。",
    "- 不要把 segment.endFrame 误写成第一个子镜头的结束画面、任意中间秒数或任意中途动作终点。",
    "- 尾帧图片只能作为最后一瞬间要抵达的目标状态，不是最后一个子镜头一开始就进入的静止状态。",
    "- 不要让最后一个子镜头一开始就已经定格或静止在尾帧图片状态，也不要写成先定格再移动镜头。",
    "- 必须先完成最后动作链，再在片段最后自然抵达尾帧图片状态；可写“最终动作完成后，最后一瞬间接近/抵达【尾帧图片】状态”，避免“画面定格于【尾帧图片】”这类过早贴尾帧措辞。",
    "- 如果上游 shot.audio 含有音乐、BGM、配乐、旋律、片尾曲等描述，在当前无背景音乐约束下必须视为待剔除噪声，不要写进 finalPrompt 或 audioPlan。",
    "- 系统会在最终 prompt 中追加硬性语音约束和声音约束，你生成的内容必须与这组硬性约束一致。",
    "- 必须根据片段上下文和内部 shots 的语义，从候选人物设定图中选择本片段实际出现或需要保持一致性的角色，填入 selectedCharacterIds。",
    "- 必须根据片段上下文和内部 shots 的语义，从候选场景设定图中选择本片段所在或最相关的场景，填入 selectedSceneId；没有合适场景时填 null。",
    "- selectedCharacterIds 和 selectedSceneId 只能使用下方候选列表中给出的 id，不允许编造 id，也不要选择无关人物/无关场景。",
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
    ...formatReferenceImages(referenceImages, input),
    "",
    "候选人物设定图（由你判断是否相关）：",
    ...formatCharacterCandidates(input),
    "",
    "候选场景设定图（由你判断是否相关）：",
    ...formatSceneCandidates(input),
    "",
    "segment 关键帧语义：",
    ...formatSegmentFrameAnchors(input),
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
    "- 写清环境声、拟音、参考音频用途、声场重点，以及是否只有环境声而无人声。",
    `- 当前可保留的环境声/拟音候选：${shotAudioClauses.length > 0 ? shotAudioClauses.join("、") : "未提供明确环境声/拟音描述"}`,
    "- 必须明确写必须输出可听音轨，不允许静音或无声成片。",
    "- 必须明确写无背景音乐、无BGM、无配乐。",
    "",
    "visualGuardrails 要求：",
    "- 写清角色一致性、服装道具一致性、镜头运动、空间连续性、时间连续性、参考图片用途、开头承接和结尾交接状态。",
    "- 禁止新增无关角色、无关空镜、夸张特效、过度炫技运镜或破坏连续性的机位跳变。",
    "",
    "rationale 要求：",
    "- 用简短中文解释 finalPrompt 如何把内部 shots 组织成一个 Seedance 连续片段，并说明为什么选择这些人物/场景 id。",
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
  const selectedCharacterIds = readSelectedCharacterIds(
    (payload as { selectedCharacterIds?: unknown }).selectedCharacterIds,
    input,
  );
  const selectedSceneId = readSelectedSceneId(
    (payload as { selectedSceneId?: unknown }).selectedSceneId,
    input,
  );

  return {
    finalPrompt: appendHardConstraints(
      ensureSubShotTimeline(finalPromptBase, input),
      dialoguePlan,
      buildFinalPromptAudioConstraint(input),
    ),
    dialoguePlan,
    audioPlan,
    visualGuardrails,
    rationale,
    selectedCharacterIds,
    selectedSceneId,
  };
}

function readSelectedCharacterIds(value: unknown, input: GenerateVideoPromptInput) {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowedIds = new Set((input.characterCandidates ?? []).map((candidate) => candidate.id));
  return value.filter((id): id is string => typeof id === "string" && allowedIds.has(id));
}

function readSelectedSceneId(value: unknown, input: GenerateVideoPromptInput) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return (input.sceneCandidates ?? []).some((candidate) => candidate.id === value) ? value : null;
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
  const shotAudioClauses = resolveShotAudioClauses(input);
  const referenceAudioClauses = resolveReferenceAudios(input).map((audio, index) =>
    `音频${index + 1}${audio.label ? `（${audio.label}）` : ""}${formatDurationSuffix(
      audio.durationSec ?? null,
    )}`,
  );
  const sourceAudioText =
    shotAudioClauses.length > 0 ? shotAudioClauses.join("、") : "未提供明确环境声/拟音描述";
  const referenceAudioText =
    referenceAudioClauses.length > 0
      ? `参考音频：${referenceAudioClauses.join("、")}，只作为音色、节奏、环境声或口型节奏参考。`
      : "未提供参考音频。";

  return `环境声/音效：${sourceAudioText}。${referenceAudioText}必须输出可听音轨，不允许静音或无声成片。无背景音乐、无BGM、无配乐。禁止新增未提供的人声、背景音乐、BGM、配乐或额外音效。`;
}

function buildFinalPromptAudioConstraint(input: GenerateVideoPromptInput) {
  const audioText = resolveShotAudioClauses(input).join("、");
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

function ensureSubShotTimeline(finalPrompt: string, input: GenerateVideoPromptInput) {
  const shots = resolveShots(input);

  if (shots.length <= 1) {
    return finalPrompt.trim();
  }

  const timelineEntries = buildSubShotTimelineEntries(
    shots,
    resolveSegmentDurationSec(input, shots),
  );

  if (hasCompleteSubShotTimeline(finalPrompt, timelineEntries)) {
    return finalPrompt.trim();
  }

  return [
    "【子镜头时间轴】",
    ...timelineEntries.map((entry) => `${entry.timeWindow} / ${entry.shotCode}：${entry.text}`),
    "",
    "【连续片段描述】",
    finalPrompt.trim(),
  ].join("\n");
}

function hasCompleteSubShotTimeline(
  finalPrompt: string,
  timelineEntries: ReturnType<typeof buildSubShotTimelineEntries>,
) {
  return timelineEntries.every(
    (entry) => finalPrompt.includes(entry.timeWindow) && finalPrompt.includes(entry.shotCode),
  );
}

function buildSubShotTimelineEntries(
  shots: ReturnType<typeof resolveShots>,
  segmentDurationSec: number | null,
) {
  let cursor = 0;

  return shots.map((shot, index) => {
    const durationSec =
      shot.durationSec ??
      (segmentDurationSec ? Math.max(1, Math.round(segmentDurationSec / shots.length)) : null);
    const timeWindow = durationSec
      ? `${formatSeconds(cursor)}-${formatSeconds(cursor + durationSec)}秒`
      : `子镜头${index + 1}`;
    cursor += durationSec ?? 0;

    return {
      timeWindow,
      shotCode: shot.shotCode,
      text: buildSubShotTimelineText(shot),
    };
  });
}

function buildSubShotTimelineText(shot: ReturnType<typeof resolveShots>[number]) {
  const parts = [
    `目的：${shot.purpose}`,
    `画面：${shot.visual}`,
    `主体：${shot.subject}`,
    `动作：${shot.action}`,
  ];

  if (shot.dialogue) {
    parts.push(`对白：${shot.dialogue}`);
  }

  if (shot.os) {
    parts.push(`旁白/画外音：${shot.os}`);
  }

  parts.push(`音频/声效：${summarizeShotAudio(shot.audio)}`);

  if (shot.transitionHint) {
    parts.push(`转场提示：${shot.transitionHint}`);
  }

  if (shot.continuityNotes) {
    parts.push(`连续性要求：${shot.continuityNotes}`);
  }

  return parts.join("；");
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

function resolveShotAudioClauses(input: GenerateVideoPromptInput) {
  return uniqueStrings(
    resolveShots(input)
      .flatMap((shot) => splitAudioClauses(shot.audio))
      .map((clause) => normalizeClause(clause))
      .filter((value): value is string => Boolean(value))
      .filter((value) => !isMusicLikeClause(value)),
  );
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

function formatReferenceImages(
  images: ReturnType<typeof resolveReferenceImages>,
  input: GenerateVideoPromptInput,
) {
  if (images.length === 0) {
    return ["- 无参考图片。"];
  }

  return images.map(
    (image, index) => {
      const segmentRole = describeSegmentFrameRole(image.assetPath, input);
      const frameAlias = formatFrameAlias(segmentRole);

      return `- 图片${index + 1}${frameAlias ? ` / ${frameAlias}` : ""}：${image.label ?? "未命名参考图"}；assetPath=${image.assetPath}；source=${image.source}；sourceShotId=${image.sourceShotId ?? "无"}${segmentRole ? `；segmentRole=${segmentRole}` : ""}`;
    },
  );
}

function formatFrameAlias(segmentRole: ReturnType<typeof describeSegmentFrameRole>) {
  if (segmentRole === "segment_start_frame") {
    return "首帧图片";
  }

  if (segmentRole === "segment_end_frame") {
    return "尾帧图片";
  }

  return null;
}

function formatCharacterCandidates(input: GenerateVideoPromptInput) {
  const candidates = input.characterCandidates ?? [];
  if (candidates.length === 0) {
    return ["- 无候选人物设定图。"];
  }

  return candidates.map(
    (candidate) =>
      `- id=${candidate.id}；name=${candidate.characterName}；image=${candidate.imageAssetPath}；设定=${candidate.promptTextCurrent}`,
  );
}

function formatSceneCandidates(input: GenerateVideoPromptInput) {
  const candidates = input.sceneCandidates ?? [];
  if (candidates.length === 0) {
    return ["- 无候选场景设定图。"];
  }

  return candidates.map(
    (candidate) =>
      `- id=${candidate.id}；name=${candidate.sceneName}；purpose=${candidate.scenePurpose}；image=${candidate.imageAssetPath}；约束=${candidate.constraintsText ?? "无"}；设定=${candidate.promptTextCurrent}`,
  );
}

function formatSegmentFrameAnchors(input: GenerateVideoPromptInput) {
  const lines: string[] = [];

  if (input.startFrame?.imageAssetPath) {
    lines.push(
      `- segment 起始关键帧：assetPath=${input.startFrame.imageAssetPath}；代表整段片段的0秒开场状态。`,
    );
  }

  if (input.endFrame?.imageAssetPath) {
    lines.push(
      `- segment 结尾关键帧：assetPath=${input.endFrame.imageAssetPath}；代表整段片段结束时的稳定终态，不是任意中间秒数。`,
    );
  }

  return lines.length > 0 ? lines : ["- 未单独提供 segment 起始/结尾关键帧。"];
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
      `音频/声效：${summarizeShotAudio(shot.audio)}`,
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

function splitAudioClauses(value: string | null) {
  const normalized = normalizeClause(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[，,；;、]/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function summarizeShotAudio(value: string | null) {
  const clauses = splitAudioClauses(value).filter((clause) => !isMusicLikeClause(clause));

  return clauses.length > 0 ? clauses.join("、") : "无";
}

function isMusicLikeClause(value: string) {
  return /背景音乐|BGM|配乐|片尾曲|旋律|古琴|古筝|弦乐|吉他|钢琴|提琴|琴音|音乐/u.test(
    value,
  );
}

function describeSegmentFrameRole(assetPath: string, input: GenerateVideoPromptInput) {
  if (input.startFrame?.imageAssetPath && assetPath === input.startFrame.imageAssetPath) {
    return "segment_start_frame";
  }

  if (input.endFrame?.imageAssetPath && assetPath === input.endFrame.imageAssetPath) {
    return "segment_end_frame";
  }

  return null;
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
