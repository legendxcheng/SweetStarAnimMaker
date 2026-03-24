import { z } from "zod";

const requiredTextSchema = z.string().trim().min(1);
const imageFrameTypes = ["start_frame", "end_frame"] as const;
const imageFramePlanStatuses = ["pending", "planned", "plan_failed"] as const;
const imageFrameStatuses = [
  "pending",
  "generating",
  "in_review",
  "approved",
  "failed",
] as const;

export const currentImageBatchSummaryResponseSchema = z.object({
  id: z.string(),
  sourceShotScriptId: z.string(),
  segmentCount: z.number().int().positive(),
  totalFrameCount: z.number().int().positive(),
  approvedFrameCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const imageFrameResponseSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  projectId: z.string(),
  sourceShotScriptId: z.string(),
  segmentId: z.string(),
  sceneId: z.string(),
  order: z.number().int().positive(),
  frameType: z.enum(imageFrameTypes),
  planStatus: z.enum(imageFramePlanStatuses),
  imageStatus: z.enum(imageFrameStatuses),
  selectedCharacterIds: z.array(z.string()),
  matchedReferenceImagePaths: z.array(z.string()),
  unmatchedCharacterIds: z.array(z.string()),
  promptTextSeed: requiredTextSchema,
  promptTextCurrent: requiredTextSchema,
  negativePromptTextCurrent: z.string().trim().min(1).nullable(),
  promptUpdatedAt: z.string().nullable(),
  imageAssetPath: z.string().nullable(),
  imageWidth: z.number().int().positive().nullable(),
  imageHeight: z.number().int().positive().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  approvedAt: z.string().nullable(),
  updatedAt: z.string(),
  sourceTaskId: z.string().nullable(),
});

export const imageFrameListResponseSchema = z.object({
  currentBatch: currentImageBatchSummaryResponseSchema,
  frames: z.array(imageFrameResponseSchema),
});

export const updateImageFramePromptRequestSchema = z.object({
  promptTextCurrent: requiredTextSchema,
  negativePromptTextCurrent: z.string().trim().min(1).nullable(),
});

export const regenerateImageFramePromptRequestSchema = z.object({});

export const generateImageFrameRequestSchema = z.object({});

export const approveImageFrameRequestSchema = z.object({});

export const approveAllImageFramesRequestSchema = z.object({});
