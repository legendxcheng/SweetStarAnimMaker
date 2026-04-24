import { z } from "zod";

const requiredTextSchema = z.string().trim().min(1);
const optionalFrameTextSchema = z.string();
const imageFrameTypes = ["start_frame", "end_frame"] as const;
const imageFramePlanStatuses = ["pending", "planned", "plan_failed"] as const;
const imageFrameStatuses = [
  "pending",
  "generating",
  "in_review",
  "approved",
  "failed",
] as const;
const shotReferenceStatuses = ["pending", "in_review", "approved", "failed"] as const;

export const currentImageBatchSummaryResponseSchema = z.object({
  id: z.string(),
  sourceShotScriptId: z.string(),
  segmentCount: z.number().int().positive(),
  totalRequiredFrameCount: z.number().int().positive(),
  approvedSegmentCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const imageFrameResponseSchema = z
  .object({
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
    selectedSceneId: z.string().nullable(),
    selectedSceneName: z.string().nullable(),
    selectedSceneImageAssetPath: z.string().nullable().optional(),
    matchedReferenceImagePaths: z.array(z.string()),
    unmatchedCharacterIds: z.array(z.string()),
    promptTextSeed: optionalFrameTextSchema,
    promptTextCurrent: optionalFrameTextSchema,
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
  })
  .superRefine((frame, ctx) => {
    const requiresPrompt =
      frame.planStatus === "planned" ||
      frame.imageStatus === "generating" ||
      frame.imageStatus === "in_review" ||
      frame.imageStatus === "approved";

    if (!requiresPrompt) {
      return;
    }

    if (frame.promptTextSeed.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        exact: false,
        message: "String must contain at least 1 character(s)",
        path: ["promptTextSeed"],
      });
    }

    if (frame.promptTextCurrent.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        exact: false,
        message: "String must contain at least 1 character(s)",
        path: ["promptTextCurrent"],
      });
    }
  });

const segmentImageRecordBaseSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  projectId: z.string(),
  sourceShotScriptId: z.string(),
  sceneId: z.string(),
  segmentId: z.string(),
  segmentOrder: z.number().int().positive(),
  segmentName: z.string().nullable(),
  segmentSummary: z.string(),
  sourceShotIds: z.array(z.string()),
  status: z.enum(shotReferenceStatuses),
  startFrame: imageFrameResponseSchema,
  approvedAt: z.string().nullable(),
  updatedAt: z.string(),
  shotId: z.string().optional(),
  shotCode: z.string().optional(),
  shotOrder: z.number().int().positive().optional(),
  referenceStatus: z.enum(shotReferenceStatuses).optional(),
});

const segmentImageRecordSchema = z.discriminatedUnion("frameDependency", [
  segmentImageRecordBaseSchema.extend({
    frameDependency: z.literal("start_frame_only"),
    endFrame: z.null(),
  }),
  segmentImageRecordBaseSchema.extend({
    frameDependency: z.literal("start_and_end_frame"),
    endFrame: imageFrameResponseSchema,
  }),
]);
export const imageFrameListResponseSchema = z.object({
  currentBatch: currentImageBatchSummaryResponseSchema,
  segments: z.array(segmentImageRecordSchema),
});

export const regenerateAllImagePromptsResponseSchema = z.object({
  batchId: z.string(),
  frameCount: z.number().int().nonnegative(),
  taskIds: z.array(z.string()),
});

export const updateImageFramePromptRequestSchema = z.object({
  promptTextCurrent: requiredTextSchema,
  negativePromptTextCurrent: z.string().trim().min(1).nullable(),
});

export const regenerateImageFramePromptRequestSchema = z.object({});

export const generateImageFrameRequestSchema = z.object({});

export const approveImageFrameRequestSchema = z.object({});

export const approveAllImageFramesRequestSchema = z.object({});
