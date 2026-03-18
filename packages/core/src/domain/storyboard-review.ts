import { type StoryboardReviewAction, type StoryboardReviewRecord } from "@sweet-star/shared";

import { RejectStoryboardReasonRequiredError } from "../errors/storyboard-review-errors";

export interface CreateStoryboardReviewRecordInput {
  id: string;
  projectId: string;
  storyboardVersionId: string;
  action: StoryboardReviewAction;
  createdAt: string;
  note?: string;
  reason?: string;
  triggeredTaskId?: string | null;
}

export function createStoryboardReviewRecord(
  input: CreateStoryboardReviewRecordInput,
): StoryboardReviewRecord {
  const note = input.note?.trim();
  const reason = input.reason?.trim();

  if (input.action === "reject" && !reason) {
    throw new RejectStoryboardReasonRequiredError();
  }

  return {
    id: input.id,
    projectId: input.projectId,
    storyboardVersionId: input.storyboardVersionId,
    action: input.action,
    reason: input.action === "approve" ? note ?? null : reason ?? null,
    triggeredTaskId: input.triggeredTaskId ?? null,
    createdAt: input.createdAt,
  };
}
