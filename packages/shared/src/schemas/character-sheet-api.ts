import { z } from "zod";

const requiredTextSchema = z.string().trim().min(1);
const characterSheetStatuses = ["generating", "in_review", "approved", "failed"] as const;

export const currentCharacterSheetBatchSummaryResponseSchema = z.object({
  id: z.string(),
  sourceMasterPlotId: z.string(),
  characterCount: z.number().int().positive(),
  approvedCharacterCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const characterSheetDetailResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  batchId: z.string(),
  sourceMasterPlotId: z.string(),
  characterName: requiredTextSchema,
  promptTextGenerated: requiredTextSchema,
  promptTextCurrent: requiredTextSchema,
  imageAssetPath: z.string().nullable(),
  imageWidth: z.number().int().positive().nullable(),
  imageHeight: z.number().int().positive().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  status: z.enum(characterSheetStatuses),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  sourceTaskId: z.string().nullable(),
});

export const characterSheetListResponseSchema = z.object({
  currentBatch: currentCharacterSheetBatchSummaryResponseSchema,
  characters: z.array(characterSheetDetailResponseSchema),
});

export const updateCharacterSheetPromptRequestSchema = z.object({
  promptTextCurrent: requiredTextSchema,
});

export const regenerateCharacterSheetRequestSchema = z.object({});

export const approveCharacterSheetRequestSchema = z.object({});
