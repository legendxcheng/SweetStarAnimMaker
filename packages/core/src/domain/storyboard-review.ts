import {
  type MasterPlotReviewSummary,
  type StoryboardReviewAction,
} from "@sweet-star/shared";

import { RejectStoryboardReasonRequiredError } from "../errors/storyboard-review-errors";

export interface CreateStoryboardReviewRecordInput {
  id: string;
  projectId: string;
  masterPlotId: string;
  action: StoryboardReviewAction;
  createdAt: string;
  note?: string;
  reason?: string;
  triggeredTaskId?: string | null;
}

export function createStoryboardReviewRecord(
  input: CreateStoryboardReviewRecordInput,
): MasterPlotReviewSummary {
  const note = input.note?.trim();
  const reason = input.reason?.trim();

  if (input.action === "reject" && !reason) {
    throw new RejectStoryboardReasonRequiredError();
  }

  return {
    id: input.id,
    projectId: input.projectId,
    masterPlotId: input.masterPlotId,
    action: input.action,
    reason: input.action === "approve" ? note ?? null : reason ?? null,
    triggeredTaskId: input.triggeredTaskId ?? null,
    createdAt: input.createdAt,
  };
}
