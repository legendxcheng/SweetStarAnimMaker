import type { ShotReferenceFrame, ShotReferenceRecord } from "@sweet-star/shared";

import { config } from "../../services/config";
import { FRAME_PROMPT_PENDING_TIMEOUT_MS } from "./constants";
import type { FrameDraftState } from "./types";

const shotHierarchyCollator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

export function createFrameDraft(frame: ShotReferenceFrame): FrameDraftState {
  return {
    promptTextCurrent: frame.promptTextCurrent,
    negativePromptTextCurrent: frame.negativePromptTextCurrent ?? "",
  };
}

export function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildFinalImagePrompt(promptTextCurrent: string, visualStyleText: string) {
  const trimmedPrompt = promptTextCurrent.trim();
  const trimmedVisualStyleText = visualStyleText.trim();

  if (!trimmedVisualStyleText) {
    return trimmedPrompt;
  }

  return `${trimmedPrompt}\n\n画面风格：${trimmedVisualStyleText}`;
}

export function getFrameImageUrl(
  projectId: string,
  frame: Pick<ShotReferenceFrame, "id" | "updatedAt">,
) {
  const url = new URL(config.imageFrameContentUrl(projectId, frame.id));
  url.searchParams.set("v", frame.updatedAt);
  return url.toString();
}

export function getRequiredFrames(
  shot: Pick<ShotReferenceRecord, "startFrame" | "endFrame">,
): ShotReferenceFrame[] {
  return shot.endFrame ? [shot.startFrame, shot.endFrame] : [shot.startFrame];
}

export function getShotSceneId(
  shot: Pick<ShotReferenceRecord, "sceneId" | "startFrame">,
) {
  return shot.sceneId ?? shot.startFrame.sceneId;
}

export function getShotSegmentId(
  shot: Pick<ShotReferenceRecord, "segmentId" | "startFrame">,
) {
  return shot.segmentId ?? shot.startFrame.segmentId;
}

export function getShotSegmentOrder(
  shot: Pick<ShotReferenceRecord, "segmentOrder">,
) {
  return shot.segmentOrder ?? null;
}

export function getShotOrder(
  shot: Pick<ShotReferenceRecord, "shotOrder" | "startFrame">,
) {
  return shot.shotOrder ?? shot.startFrame.order;
}

export function buildShotDisplayLabel(
  shot: Pick<ShotReferenceRecord, "sceneId" | "segmentId" | "shotOrder" | "startFrame">,
) {
  return `${getShotSceneId(shot)}_${getShotSegmentId(shot)}_shot_${getShotOrder(shot)}`;
}

export function sortShotsByHierarchy(shots: ShotReferenceRecord[]) {
  return [...shots].sort((left, right) => {
    const sceneCompare = shotHierarchyCollator.compare(getShotSceneId(left), getShotSceneId(right));
    if (sceneCompare !== 0) {
      return sceneCompare;
    }

    const leftSegmentOrder = getShotSegmentOrder(left);
    const rightSegmentOrder = getShotSegmentOrder(right);
    if (leftSegmentOrder !== null && rightSegmentOrder !== null && leftSegmentOrder !== rightSegmentOrder) {
      return leftSegmentOrder - rightSegmentOrder;
    }

    const segmentCompare = shotHierarchyCollator.compare(
      getShotSegmentId(left),
      getShotSegmentId(right),
    );
    if (segmentCompare !== 0) {
      return segmentCompare;
    }

    const shotOrderCompare = getShotOrder(left) - getShotOrder(right);
    if (shotOrderCompare !== 0) {
      return shotOrderCompare;
    }

    const shotIdCompare = shotHierarchyCollator.compare(left.shotId, right.shotId);
    if (shotIdCompare !== 0) {
      return shotIdCompare;
    }

    return shotHierarchyCollator.compare(left.shotCode, right.shotCode);
  });
}

export interface FrameGenerationStatusSummary {
  summary: string;
  detail: string | null;
}

export function getFrameGenerationStatusSummary(
  shots: Array<
    Pick<
      ShotReferenceRecord,
      "sceneId" | "segmentId" | "shotOrder" | "shotCode" | "startFrame" | "endFrame"
    >
  >,
): FrameGenerationStatusSummary {
  const orderedEntries = shots.flatMap((shot) =>
    getRequiredFrames(shot).map((frame) => ({
      shotLabel: buildShotDisplayLabel(shot),
      sceneId: getShotSceneId(shot),
      segmentId: getShotSegmentId(shot),
      frameLabel: frame.frameType === "start_frame" ? "起始帧" : "结束帧",
      frame,
    })),
  );
  const frames = orderedEntries.map((entry) => entry.frame);
  const totalFrameCount = frames.length;

  if (totalFrameCount === 0) {
    return { summary: "暂无帧", detail: null };
  }

  const promptGeneratingCount = frames.filter((frame) => isFramePromptPending(frame)).length;

  if (promptGeneratingCount > 0) {
    return { summary: `Prompt 生成中 ${promptGeneratingCount}/${totalFrameCount}`, detail: null };
  }

  const promptFailedCount = frames.filter((frame) => isFramePromptFailed(frame)).length;

  if (promptFailedCount > 0) {
    const firstPromptFailure = orderedEntries.find((entry) => isFramePromptFailed(entry.frame));
    return {
      summary: `Prompt 失败 ${promptFailedCount}/${totalFrameCount}`,
      detail: firstPromptFailure
        ? `${firstPromptFailure.sceneId} / ${firstPromptFailure.segmentId} / ${firstPromptFailure.shotLabel} / ${firstPromptFailure.frameLabel}`
        : null,
    };
  }

  const imageFailedCount = frames.filter(
    (frame) => frame.planStatus === "planned" && frame.imageStatus === "failed",
  ).length;

  if (imageFailedCount > 0) {
    const firstImageFailure = orderedEntries.find(
      (entry) => entry.frame.planStatus === "planned" && entry.frame.imageStatus === "failed",
    );
    return {
      summary: `图片失败 ${imageFailedCount}/${totalFrameCount}`,
      detail: firstImageFailure
        ? `${firstImageFailure.sceneId} / ${firstImageFailure.segmentId} / ${firstImageFailure.shotLabel} / ${firstImageFailure.frameLabel}`
        : null,
    };
  }

  const imageGeneratingCount = frames.filter(
    (frame) => frame.planStatus === "planned" && frame.imageStatus === "generating",
  ).length;

  if (imageGeneratingCount > 0) {
    return { summary: `图片生成中 ${imageGeneratingCount}/${totalFrameCount}`, detail: null };
  }

  const pendingImageCount = frames.filter(
    (frame) => frame.planStatus === "planned" && frame.imageStatus === "pending",
  ).length;

  if (pendingImageCount > 0) {
    const promptReadyCount = frames.filter(
      (frame) => frame.planStatus === "planned" && frame.promptTextCurrent.trim().length > 0,
    ).length;
    return { summary: `Prompt 已就绪 ${promptReadyCount}/${totalFrameCount}`, detail: null };
  }

  const reviewableImageCount = frames.filter(
    (frame) => frame.imageStatus === "in_review" || frame.imageStatus === "approved",
  ).length;
  const approvedImageCount = frames.filter((frame) => frame.imageStatus === "approved").length;

  if (approvedImageCount === totalFrameCount) {
    return { summary: `全部已通过 ${approvedImageCount}/${totalFrameCount}`, detail: null };
  }

  if (reviewableImageCount > 0) {
    return { summary: `图片待审核 ${reviewableImageCount}/${totalFrameCount}`, detail: null };
  }

  return { summary: "处理中", detail: null };
}

export function isFramePromptPending(frame: Pick<ShotReferenceFrame, "planStatus" | "updatedAt">) {
  return frame.planStatus === "pending" && !isFramePromptTimedOut(frame);
}

export function isFramePromptTimedOut(
  frame: Pick<ShotReferenceFrame, "planStatus" | "updatedAt">,
  now = Date.now(),
) {
  if (frame.planStatus !== "pending") {
    return false;
  }

  const startedAt = Date.parse(frame.updatedAt);

  if (Number.isNaN(startedAt)) {
    return false;
  }

  return now - startedAt >= FRAME_PROMPT_PENDING_TIMEOUT_MS;
}

export function isFramePromptFailed(frame: Pick<ShotReferenceFrame, "planStatus" | "updatedAt">) {
  return frame.planStatus === "plan_failed" || isFramePromptTimedOut(frame);
}

export function isShotReadyForApproval(
  shot: Pick<ShotReferenceRecord, "startFrame" | "endFrame">,
) {
  return getRequiredFrames(shot).every(
    (frame) => frame.imageStatus === "in_review" || frame.imageStatus === "approved",
  );
}

export function replaceFrameOnShot(
  shot: ShotReferenceRecord,
  nextFrame: ShotReferenceFrame,
): ShotReferenceRecord {
  if (shot.startFrame.id === nextFrame.id) {
    return {
      ...shot,
      startFrame: nextFrame,
      updatedAt: nextFrame.updatedAt,
    };
  }

  if (shot.endFrame?.id === nextFrame.id) {
    if (shot.frameDependency === "start_and_end_frame") {
      return {
        ...shot,
        endFrame: nextFrame,
        updatedAt: nextFrame.updatedAt,
      };
    }
  }

  return shot;
}
