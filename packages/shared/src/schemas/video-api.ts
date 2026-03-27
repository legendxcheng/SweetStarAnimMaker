import { z } from "zod";

const requiredTextSchema = z.string().trim().min(1);
const shotFrameDependencies = ["start_frame_only", "start_and_end_frame"] as const;
const shotVideoStatuses = ["generating", "in_review", "approved", "failed"] as const;

export const currentVideoBatchSummaryResponseSchema = z.object({
  id: z.string(),
  sourceImageBatchId: z.string(),
  sourceShotScriptId: z.string(),
  shotCount: z.number().int().positive(),
  approvedShotCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const shotVideoResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  batchId: z.string(),
  sourceImageBatchId: z.string(),
  sourceShotScriptId: z.string(),
  shotId: z.string(),
  shotCode: z.string(),
  sceneId: z.string(),
  segmentId: z.string(),
  segmentOrder: z.number().int().positive(),
  shotOrder: z.number().int().positive(),
  frameDependency: z.enum(shotFrameDependencies),
  status: z.enum(shotVideoStatuses),
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

export const segmentVideoResponseSchema = shotVideoResponseSchema;

export const videoListResponseSchema = z.object({
  currentBatch: currentVideoBatchSummaryResponseSchema,
  shots: z.array(shotVideoResponseSchema),
});

export const approveVideoSegmentRequestSchema = z.object({});

export const saveVideoPromptRequestSchema = z.object({
  promptTextCurrent: requiredTextSchema,
});

export const regenerateVideoPromptRequestSchema = z.object({});

export const regenerateVideoSegmentRequestSchema = z.object({});

export const regenerateAllVideoPromptsRequestSchema = z.object({});

export const approveAllVideoSegmentsRequestSchema = z.object({});
