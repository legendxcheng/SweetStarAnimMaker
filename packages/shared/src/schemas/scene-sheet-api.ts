import { z } from "zod";

const requiredTextSchema = z.string().trim().min(1);
const sceneSheetStatuses = ["generating", "in_review", "approved", "failed"] as const;

export const currentSceneSheetBatchSummaryResponseSchema = z.object({
  id: z.string(),
  sourceMasterPlotId: z.string(),
  sourceCharacterSheetBatchId: z.string(),
  sceneCount: z.number().int().positive(),
  approvedSceneCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const sceneSheetDetailResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  batchId: z.string(),
  sourceMasterPlotId: z.string(),
  sourceCharacterSheetBatchId: z.string(),
  sceneName: requiredTextSchema,
  scenePurpose: requiredTextSchema,
  promptTextGenerated: requiredTextSchema,
  promptTextCurrent: requiredTextSchema,
  constraintsText: requiredTextSchema,
  imageAssetPath: z.string().nullable(),
  imageWidth: z.number().int().positive().nullable(),
  imageHeight: z.number().int().positive().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  status: z.enum(sceneSheetStatuses),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  sourceTaskId: z.string().nullable(),
});

export const sceneSheetListResponseSchema = z.object({
  currentBatch: currentSceneSheetBatchSummaryResponseSchema,
  scenes: z.array(sceneSheetDetailResponseSchema),
});

export const updateSceneSheetPromptRequestSchema = z.object({
  promptTextCurrent: requiredTextSchema,
});

export const regenerateSceneSheetRequestSchema = z.object({});

export const approveSceneSheetRequestSchema = z.object({});
