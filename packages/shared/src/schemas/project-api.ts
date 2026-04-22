import { z } from "zod";

import { initialProjectStatus, projectStatuses } from "../constants/project-status";
import {
  currentCharacterSheetBatchSummaryResponseSchema,
} from "./character-sheet-api";
import { currentSceneSheetBatchSummaryResponseSchema } from "./scene-sheet-api";
import {
  currentMasterPlotResponseSchema,
  currentStoryboardSummaryResponseSchema,
} from "./storyboard-api";
import { currentImageBatchSummaryResponseSchema } from "./image-api";
import { currentShotScriptSummaryResponseSchema } from "./shot-script-api";
import { currentVideoBatchSummaryResponseSchema } from "./video-api";

const requiredTextSchema = z.string().trim().min(1);
const optionalTextSchema = z.string().trim().default("");
const premiseMetadataSchema = z.object({
  path: z.string(),
  bytes: z.number().int().nonnegative(),
  updatedAt: z.string(),
  text: z.string(),
  visualStyleText: optionalTextSchema,
});

export const createProjectRequestSchema = z.object({
  name: requiredTextSchema,
  premiseText: requiredTextSchema,
  visualStyleText: optionalTextSchema.optional().default(""),
});

export const resetProjectPremiseRequestSchema = z.object({
  premiseText: requiredTextSchema,
  visualStyleText: optionalTextSchema.optional().default(""),
  confirmReset: z.literal(true),
});

export const projectSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(projectStatuses).default(initialProjectStatus),
  storageDir: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentMasterPlot: currentMasterPlotResponseSchema.nullable(),
  currentCharacterSheetBatch: currentCharacterSheetBatchSummaryResponseSchema.nullable(),
  currentSceneSheetBatch: currentSceneSheetBatchSummaryResponseSchema.nullable().optional().default(null),
  currentStoryboard: currentStoryboardSummaryResponseSchema.nullable(),
  currentShotScript: currentShotScriptSummaryResponseSchema.nullable(),
  currentImageBatch: currentImageBatchSummaryResponseSchema.nullable().optional().default(null),
  currentVideoBatch: currentVideoBatchSummaryResponseSchema.nullable().optional().default(null),
});

export const projectListResponseSchema = z.array(projectSummaryResponseSchema);

export const projectDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(projectStatuses).default(initialProjectStatus),
  storageDir: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  premise: premiseMetadataSchema,
  currentMasterPlot: currentMasterPlotResponseSchema.nullable(),
  currentCharacterSheetBatch: currentCharacterSheetBatchSummaryResponseSchema.nullable(),
  currentSceneSheetBatch: currentSceneSheetBatchSummaryResponseSchema.nullable().optional().default(null),
  currentStoryboard: currentStoryboardSummaryResponseSchema.nullable(),
  currentShotScript: currentShotScriptSummaryResponseSchema.nullable(),
  currentImageBatch: currentImageBatchSummaryResponseSchema.nullable().optional().default(null),
  currentVideoBatch: currentVideoBatchSummaryResponseSchema.nullable().optional().default(null),
});
