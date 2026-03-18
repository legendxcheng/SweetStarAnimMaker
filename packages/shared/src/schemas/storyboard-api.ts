import { z } from "zod";

import { projectStatuses } from "../constants/project-status";
import { storyboardReviewActions } from "../constants/storyboard-review-action";
import { storyboardReviewNextActions } from "../constants/storyboard-review-next-action";
import { storyboardVersionKinds } from "../constants/storyboard-version-kind";
import { taskDetailResponseSchema } from "./task-api";

export const storyboardSceneSchema = z.object({
  id: z.string(),
  sceneIndex: z.number().int().positive(),
  description: z.string(),
  camera: z.string(),
  characters: z.array(z.string()),
  prompt: z.string(),
});

export const storyboardVersionResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  versionNumber: z.number().int().positive(),
  kind: z.enum(storyboardVersionKinds),
  provider: z.string(),
  model: z.string(),
  filePath: z.string(),
  createdAt: z.string(),
  sourceTaskId: z.string(),
});

export const currentStoryboardResponseSchema = storyboardVersionResponseSchema.extend({
  summary: z.string(),
  scenes: z.array(storyboardSceneSchema),
});

const requiredTextSchema = z.string().trim().min(1);

export const approveStoryboardRequestSchema = z.object({
  storyboardVersionId: z.string(),
  note: z.string().trim().min(1).optional(),
});

export const rejectStoryboardRequestSchema = z.object({
  storyboardVersionId: z.string(),
  reason: requiredTextSchema,
  nextAction: z.enum(storyboardReviewNextActions),
});

export const saveHumanStoryboardVersionRequestSchema = z.object({
  baseVersionId: z.string(),
  summary: requiredTextSchema,
  scenes: z.array(storyboardSceneSchema),
});

export const storyboardReviewSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  storyboardVersionId: z.string(),
  action: z.enum(storyboardReviewActions),
  reason: z.string().nullable(),
  triggeredTaskId: z.string().nullable(),
  createdAt: z.string(),
});

export const storyboardReviewWorkspaceResponseSchema = z.object({
  projectId: z.string(),
  projectStatus: z.enum(projectStatuses),
  currentStoryboard: currentStoryboardResponseSchema,
  latestReview: storyboardReviewSummarySchema.nullable(),
  availableActions: z.object({
    saveHumanVersion: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
  }),
  latestStoryboardTask: taskDetailResponseSchema.nullable(),
});
