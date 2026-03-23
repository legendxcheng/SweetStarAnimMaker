import { z } from "zod";

import { storyboardReviewActions } from "../constants/storyboard-review-action";
import { storyboardReviewNextActions } from "../constants/storyboard-review-next-action";
import { taskDetailResponseSchema } from "./task-api";

const requiredTextSchema = z.string().trim().min(1);
const shotScriptSegmentStatuses = [
  "pending",
  "generating",
  "in_review",
  "approved",
] as const;

export const shotScriptItemResponseSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  segmentId: z.string(),
  order: z.number().int().positive(),
  shotCode: requiredTextSchema,
  durationSec: z.number().int().positive().nullable(),
  purpose: requiredTextSchema,
  visual: requiredTextSchema,
  subject: requiredTextSchema,
  action: requiredTextSchema,
  dialogue: z.string().trim().min(1).nullable(),
  os: z.string().trim().min(1).nullable(),
  audio: z.string().trim().min(1).nullable(),
  transitionHint: z.string().trim().min(1).nullable(),
  continuityNotes: z.string().trim().min(1).nullable(),
});

export const shotScriptSegmentResponseSchema = z.object({
  segmentId: z.string(),
  sceneId: z.string(),
  order: z.number().int().positive(),
  name: z.string().trim().min(1).nullable(),
  summary: requiredTextSchema,
  durationSec: z.number().int().positive().nullable(),
  status: z.enum(shotScriptSegmentStatuses),
  lastGeneratedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  shots: z.array(shotScriptItemResponseSchema).min(1),
});

export const currentShotScriptSummaryResponseSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).nullable(),
  sourceStoryboardId: z.string(),
  sourceTaskId: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  segmentCount: z.number().int().positive(),
  shotCount: z.number().int().positive(),
  totalDurationSec: z.number().int().positive().nullable(),
});

export const currentShotScriptResponseSchema = currentShotScriptSummaryResponseSchema.extend({
  segments: z.array(shotScriptSegmentResponseSchema).min(1),
});

export const saveShotScriptSegmentRequestSchema = z.object({
  name: z.string().trim().min(1).nullable(),
  summary: requiredTextSchema,
  durationSec: z.number().int().positive().nullable(),
  shots: z.array(shotScriptItemResponseSchema).min(1),
});

export const regenerateShotScriptSegmentRequestSchema = z.object({});

export const approveShotScriptSegmentRequestSchema = z.object({});

export const approveAllShotScriptSegmentsRequestSchema = z.object({});

export const shotScriptReviewSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  shotScriptId: z.string(),
  action: z.enum(storyboardReviewActions),
  reason: z.string().nullable(),
  nextAction: z.enum(storyboardReviewNextActions).nullable(),
  triggeredTaskId: z.string().nullable(),
  createdAt: z.string(),
});

export const shotScriptReviewWorkspaceResponseSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  projectStatus: z.literal("shot_script_in_review"),
  currentShotScript: currentShotScriptResponseSchema,
  latestReview: shotScriptReviewSummarySchema.nullable(),
  latestTask: taskDetailResponseSchema.nullable(),
  availableActions: z.object({
    saveSegment: z.boolean(),
    regenerateSegment: z.boolean(),
    approveSegment: z.boolean(),
    approveAll: z.boolean(),
  }),
});
