import { z } from "zod";

const segmentVideoStatuses = ["generating", "in_review", "approved", "failed"] as const;
const requiredTextSchema = z.string().trim().min(1);

export const currentVideoBatchSummaryResponseSchema = z.object({
  id: z.string(),
  sourceImageBatchId: z.string(),
  sourceShotScriptId: z.string(),
  segmentCount: z.number().int().positive(),
  approvedSegmentCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const segmentVideoResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  batchId: z.string(),
  sourceImageBatchId: z.string(),
  sourceShotScriptId: z.string(),
  segmentId: z.string(),
  sceneId: z.string(),
  order: z.number().int().positive(),
  status: z.enum(segmentVideoStatuses),
  promptTextSeed: requiredTextSchema,
  promptTextCurrent: requiredTextSchema,
  promptUpdatedAt: z.string(),
  videoAssetPath: z.string().nullable(),
  thumbnailAssetPath: z.string().nullable(),
  durationSec: z.number().positive().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  sourceTaskId: z.string().nullable(),
});

export const videoListResponseSchema = z.object({
  currentBatch: currentVideoBatchSummaryResponseSchema,
  segments: z.array(segmentVideoResponseSchema),
});

export const approveVideoSegmentRequestSchema = z.object({});

export const saveVideoPromptRequestSchema = z.object({
  promptTextCurrent: requiredTextSchema,
});

export const regenerateVideoPromptRequestSchema = z.object({});

export const regenerateVideoSegmentRequestSchema = z.object({});

export const regenerateAllVideoPromptsRequestSchema = z.object({});

export const approveAllVideoSegmentsRequestSchema = z.object({});
