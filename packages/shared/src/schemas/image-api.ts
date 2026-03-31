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
  shotCount: z.number().int().positive(),
  totalRequiredFrameCount: z.number().int().positive(),
  approvedShotCount: z.number().int().nonnegative(),
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

const shotReferenceRecordBaseSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  projectId: z.string(),
  sourceShotScriptId: z.string(),
  sceneId: z.string().optional(),
  segmentId: z.string().optional(),
  segmentOrder: z.number().int().positive().optional(),
  shotOrder: z.number().int().positive().optional(),
  shotId: z.string(),
  shotCode: z.string(),
  referenceStatus: z.enum(shotReferenceStatuses),
  startFrame: imageFrameResponseSchema,
  updatedAt: z.string(),
});

const shotReferenceRecordSchema = z.discriminatedUnion("frameDependency", [
  shotReferenceRecordBaseSchema.extend({
    frameDependency: z.literal("start_frame_only"),
    endFrame: z.null(),
  }),
  shotReferenceRecordBaseSchema.extend({
    frameDependency: z.literal("start_and_end_frame"),
    endFrame: imageFrameResponseSchema,
  }),
]);
export const imageFrameListResponseSchema = z.object({
  currentBatch: currentImageBatchSummaryResponseSchema,
  shots: z.array(shotReferenceRecordSchema),
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
