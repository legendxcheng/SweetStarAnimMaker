import { z } from "zod";

import { projectStatuses } from "../constants/project-status";
import { taskDetailResponseSchema } from "./task-api";

const requiredTextSchema = z.string().trim().min(1);
const masterPlotReviewActions = ["approve", "reject"] as const;
const editableMasterPlotSchema = z.object({
  title: z.string().trim().min(1).nullable(),
  logline: requiredTextSchema,
  synopsis: requiredTextSchema,
  mainCharacters: z.array(requiredTextSchema),
  coreConflict: requiredTextSchema,
  emotionalArc: requiredTextSchema,
  endingBeat: requiredTextSchema,
  targetDurationSec: z.number().int().positive().nullable(),
});

export const currentMasterPlotResponseSchema = editableMasterPlotSchema.extend({
  id: z.string(),
  sourceTaskId: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
});

const storyboardSegmentResponseSchema = z.object({
  id: z.string(),
  order: z.number().int().nonnegative(),
  durationSec: z.number().int().positive().max(15).nullable(),
  visual: requiredTextSchema,
  characterAction: requiredTextSchema,
  dialogue: z.string(),
  voiceOver: z.string(),
  audio: z.string(),
  purpose: requiredTextSchema,
});

const storyboardSceneResponseSchema = z.object({
  id: z.string(),
  order: z.number().int().nonnegative(),
  name: requiredTextSchema,
  dramaticPurpose: requiredTextSchema,
  segments: z.array(storyboardSegmentResponseSchema).min(1),
});

export const currentStoryboardSummaryResponseSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).nullable(),
  episodeTitle: z.string().trim().min(1).nullable(),
  sourceMasterPlotId: z.string(),
  sourceTaskId: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  sceneCount: z.number().int().positive(),
  segmentCount: z.number().int().positive(),
  totalDurationSec: z.number().int().positive().nullable(),
});

export const currentStoryboardResponseSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).nullable(),
  episodeTitle: z.string().trim().min(1).nullable(),
  sourceMasterPlotId: z.string(),
  sourceTaskId: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  scenes: z.array(storyboardSceneResponseSchema).min(1),
});

export const saveStoryboardRequestSchema = z.object({
  title: z.string().trim().min(1).nullable(),
  episodeTitle: z.string().trim().min(1).nullable(),
  sourceMasterPlotId: z.string(),
  sourceTaskId: z.string().nullable(),
  scenes: z.array(storyboardSceneResponseSchema).min(1),
});

export const storyboardReviewWorkspaceResponseSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  projectStatus: z.literal("storyboard_in_review"),
  currentStoryboard: currentStoryboardResponseSchema,
  latestTask: taskDetailResponseSchema.nullable(),
  availableActions: z.object({
    save: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
  }),
});

export const approveMasterPlotRequestSchema = z.object({});

export const rejectMasterPlotRequestSchema = z.object({
  reason: requiredTextSchema,
});

export const saveMasterPlotRequestSchema = editableMasterPlotSchema;

export const masterPlotReviewSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  masterPlotId: z.string(),
  action: z.enum(masterPlotReviewActions),
  reason: z.string().nullable(),
  triggeredTaskId: z.string().nullable(),
  createdAt: z.string(),
});

export const masterPlotReviewWorkspaceResponseSchema = z.object({
  projectId: z.string(),
  projectStatus: z.enum(projectStatuses),
  currentMasterPlot: currentMasterPlotResponseSchema,
  latestReview: masterPlotReviewSummarySchema.nullable(),
  availableActions: z.object({
    save: z.boolean(),
    approve: z.boolean(),
    reject: z.boolean(),
  }),
  latestTask: taskDetailResponseSchema.nullable(),
});
