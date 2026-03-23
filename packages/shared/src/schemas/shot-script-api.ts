import { z } from "zod";

import { storyboardReviewActions } from "../constants/storyboard-review-action";
import { storyboardReviewNextActions } from "../constants/storyboard-review-next-action";
import { taskDetailResponseSchema } from "./task-api";

const requiredTextSchema = z.string().trim().min(1);

export const shotScriptItemResponseSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  segmentId: z.string(),
  order: z.number().int().positive(),
  shotCode: requiredTextSchema,
  shotPurpose: requiredTextSchema,
  subjectCharacters: z.array(requiredTextSchema),
  environment: requiredTextSchema,
  framing: requiredTextSchema,
  cameraAngle: requiredTextSchema,
  composition: requiredTextSchema,
  actionMoment: requiredTextSchema,
  emotionTone: requiredTextSchema,
  continuityNotes: requiredTextSchema,
  imagePrompt: requiredTextSchema,
  negativePrompt: z.string().nullable(),
  motionHint: z.string().nullable(),
  durationSec: z.number().int().positive().nullable(),
});

export const currentShotScriptSummaryResponseSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).nullable(),
  sourceStoryboardId: z.string(),
  sourceTaskId: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  shotCount: z.number().int().positive(),
  totalDurationSec: z.number().int().positive().nullable(),
});

export const currentShotScriptResponseSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).nullable(),
  sourceStoryboardId: z.string(),
  sourceTaskId: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  shots: z.array(shotScriptItemResponseSchema).min(1),
});

export const saveShotScriptRequestSchema = z.object({
  title: z.string().trim().min(1).nullable(),
  sourceStoryboardId: z.string(),
  sourceTaskId: z.string().nullable(),
  shots: z.array(shotScriptItemResponseSchema).min(1),
});

export const approveShotScriptRequestSchema = z.object({});

export const rejectShotScriptRequestSchema = z.object({
  reason: requiredTextSchema,
  nextAction: z.enum(storyboardReviewNextActions),
});

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
    save: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
  }),
});
