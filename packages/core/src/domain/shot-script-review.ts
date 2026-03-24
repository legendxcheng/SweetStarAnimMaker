import { randomUUID } from "node:crypto";

import type {
  ShotScriptReviewSummary,
  StoryboardReviewAction,
  StoryboardReviewNextAction,
} from "@sweet-star/shared";

export interface CreateShotScriptReviewRecordInput {
  id: string;
  projectId: string;
  shotScriptId: string;
  action: StoryboardReviewAction;
  reason: string | null;
  nextAction: StoryboardReviewNextAction | null;
  triggeredTaskId?: string | null;
  createdAt: string;
}

export function createShotScriptReviewRecord(
  input: CreateShotScriptReviewRecordInput,
): ShotScriptReviewSummary {
  return {
    id: input.id,
    projectId: input.projectId,
    shotScriptId: input.shotScriptId,
    action: input.action,
    reason: input.reason,
    nextAction: input.nextAction,
    triggeredTaskId: input.triggeredTaskId ?? null,
    createdAt: input.createdAt,
  };
}

export function createShotScriptReviewId(...parts: string[]) {
  return ["ssr", ...parts, randomUUID()].join("_");
}
