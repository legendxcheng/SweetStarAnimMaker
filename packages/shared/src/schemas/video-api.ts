import { z } from "zod";

const requiredTextSchema = z.string().trim().min(1);
const segmentVideoStatuses = ["generating", "in_review", "approved", "failed"] as const;
const finalCutStatuses = ["generating", "ready", "failed"] as const;

export const currentVideoBatchSummaryResponseSchema = z.object({
  id: z.string(),
  sourceImageBatchId: z.string(),
  sourceShotScriptId: z.string(),
  segmentCount: z.number().int().positive(),
  approvedSegmentCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const segmentVideoReferenceImageResponseSchema = z.object({
  id: z.string(),
  assetPath: requiredTextSchema,
  source: z.enum(["auto", "manual"]),
  order: z.number().int().nonnegative(),
  sourceShotId: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
});

export const segmentVideoReferenceAudioResponseSchema = z.object({
  id: z.string(),
  assetPath: requiredTextSchema,
  source: z.literal("manual"),
  order: z.number().int().nonnegative(),
  label: z.string().nullable().optional(),
  durationSec: z.number().positive().nullable().optional(),
});

export const segmentVideoResponseSchema = z
  .object({
  id: z.string(),
  projectId: z.string(),
  batchId: z.string(),
  sourceImageBatchId: z.string(),
  sourceShotScriptId: z.string(),
  sceneId: z.string(),
  segmentId: z.string(),
  segmentOrder: z.number().int().positive(),
  segmentName: z.string().nullable(),
  segmentSummary: requiredTextSchema,
  shotCount: z.number().int().positive(),
  sourceShotIds: z.array(z.string()),
  status: z.enum(segmentVideoStatuses),
  promptTextSeed: requiredTextSchema,
  promptTextCurrent: requiredTextSchema,
  promptUpdatedAt: z.string(),
  referenceImages: z.array(segmentVideoReferenceImageResponseSchema),
  referenceAudios: z.array(segmentVideoReferenceAudioResponseSchema),
  videoAssetPath: z.string().nullable(),
  thumbnailAssetPath: z.string().nullable(),
  durationSec: z.number().positive().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  sourceTaskId: z.string().nullable(),
})
  .strict();

export const shotVideoResponseSchema = segmentVideoResponseSchema;

export const finalCutRecordResponseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sourceVideoBatchId: z.string(),
  status: z.enum(finalCutStatuses),
  videoAssetPath: z.string().nullable(),
  manifestAssetPath: z.string().nullable(),
  shotCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  errorMessage: z.string().nullable(),
});

export const finalCutResponseSchema = z.object({
  currentFinalCut: finalCutRecordResponseSchema.nullable(),
});

export const videoListResponseSchema = z.object({
  currentBatch: currentVideoBatchSummaryResponseSchema,
  segments: z.array(segmentVideoResponseSchema),
});

export const approveVideoSegmentRequestSchema = z.object({});

export const saveSegmentVideoConfigRequestSchema = z.object({
  promptTextCurrent: requiredTextSchema,
  referenceImages: z.array(segmentVideoReferenceImageResponseSchema),
  referenceAudios: z.array(segmentVideoReferenceAudioResponseSchema),
});

export const saveVideoPromptRequestSchema = saveSegmentVideoConfigRequestSchema;

export const referenceAudioUploadMetadataRequestSchema = z.object({
  fileName: requiredTextSchema,
  mimeType: requiredTextSchema,
  bytes: z.number().int().positive(),
  label: z.string().trim().min(1).nullable().optional(),
  durationSec: z.number().positive().nullable().optional(),
});

export const regenerateVideoPromptRequestSchema = z.object({});

export const regenerateVideoSegmentRequestSchema = z.object({});

export const regenerateAllVideoPromptsRequestSchema = z.object({});

export const approveAllVideoSegmentsRequestSchema = z.object({});
export const generateFinalCutRequestSchema = z.object({});
