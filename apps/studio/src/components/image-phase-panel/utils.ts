import type { SegmentFrameRecord } from "@sweet-star/shared";

import { config } from "../../services/config";
import type { FrameDraftState } from "./types";

export function createFrameDraft(frame: SegmentFrameRecord): FrameDraftState {
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
  frame: Pick<SegmentFrameRecord, "id" | "updatedAt">,
) {
  const url = new URL(config.imageFrameContentUrl(projectId, frame.id));
  url.searchParams.set("v", frame.updatedAt);
  return url.toString();
}
