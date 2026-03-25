import { z } from "zod";

const segmentVideoStatuses = ["generating", "in_review", "approved", "failed"] as const;

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

export const regenerateVideoSegmentRequestSchema = z.object({});

export const approveAllVideoSegmentsRequestSchema = z.object({});
