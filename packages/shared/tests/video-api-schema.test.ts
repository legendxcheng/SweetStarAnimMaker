import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("video api schema", () => {
  it("accepts a current video batch summary payload", () => {
    const parsed = shared.currentVideoBatchSummaryResponseSchema.parse({
      id: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      segmentCount: 3,
      approvedSegmentCount: 1,
      updatedAt: "2026-03-25T12:00:00.000Z",
    });

    expect(parsed.segmentCount).toBe(3);
    expect(parsed.approvedSegmentCount).toBe(1);
  });

  it("accepts a segment video record payload", () => {
    const parsed = shared.segmentVideoResponseSchema.parse({
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      status: "in_review",
      promptTextSeed: "seed prompt",
      promptTextCurrent: "current prompt",
      promptUpdatedAt: "2026-03-25T12:00:30.000Z",
      videoAssetPath: "videos/batches/video_batch_v1/segments/segment_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_v1/segments/segment_1/thumbnail.webp",
      durationSec: 8,
      provider: "vector-engine",
      model: "sora-2-all",
      updatedAt: "2026-03-25T12:01:00.000Z",
      approvedAt: null,
      sourceTaskId: "task_video_segment_1",
    });

    expect(parsed.status).toBe("in_review");
    expect(parsed.model).toBe("sora-2-all");
    expect(parsed.promptTextSeed).toBe("seed prompt");
    expect(parsed.promptTextCurrent).toBe("current prompt");
    expect(parsed.promptUpdatedAt).toBe("2026-03-25T12:00:30.000Z");
  });

  it("accepts a list response for the current videos batch", () => {
    const parsed = shared.videoListResponseSchema.parse({
      currentBatch: {
        id: "video_batch_v1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        segmentCount: 2,
        approvedSegmentCount: 1,
        updatedAt: "2026-03-25T12:00:00.000Z",
      },
      segments: [
        {
          id: "video_segment_1",
          projectId: "proj_1",
          batchId: "video_batch_v1",
          sourceImageBatchId: "image_batch_v1",
          sourceShotScriptId: "shot_script_v1",
          segmentId: "segment_1",
          sceneId: "scene_1",
          order: 1,
          status: "approved",
          promptTextSeed: "seed prompt",
          promptTextCurrent: "current prompt",
          promptUpdatedAt: "2026-03-25T12:00:30.000Z",
          videoAssetPath: "videos/batches/video_batch_v1/segments/segment_1/current.mp4",
          thumbnailAssetPath: "videos/batches/video_batch_v1/segments/segment_1/thumbnail.webp",
          durationSec: 8,
          provider: "vector-engine",
          model: "sora-2-all",
          updatedAt: "2026-03-25T12:01:00.000Z",
          approvedAt: "2026-03-25T12:02:00.000Z",
          sourceTaskId: "task_video_segment_1",
        },
      ],
    });

    expect(parsed.segments).toHaveLength(1);
    expect(parsed.currentBatch.sourceImageBatchId).toBe("image_batch_v1");
    expect(parsed.segments[0]?.promptTextCurrent).toBe("current prompt");
  });

  it("accepts prompt-related video request payloads", () => {
    const savePrompt = shared.saveVideoPromptRequestSchema.parse({
      promptTextCurrent: "用户保存后的提示词",
    });
    const regeneratePrompt = shared.regenerateVideoPromptRequestSchema.parse({});
    const regenerateAllPrompts = shared.regenerateAllVideoPromptsRequestSchema.parse({});

    expect(savePrompt.promptTextCurrent).toBe("用户保存后的提示词");
    expect(regeneratePrompt).toEqual({});
    expect(regenerateAllPrompts).toEqual({});
  });
});
