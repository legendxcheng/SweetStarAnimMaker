import type { ShotReferenceFrame, ShotReferenceRecord } from "@sweet-star/shared";

import { config } from "../../services/config";
import type { FrameDraftState } from "./types";

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
