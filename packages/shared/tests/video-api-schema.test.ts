import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("video api schema", () => {
  it("accepts a shot-based current video batch summary payload", () => {
    const parsed = shared.currentVideoBatchSummaryResponseSchema.parse({
      id: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      shotCount: 2,
      approvedShotCount: 1,
      updatedAt: "2026-03-25T12:00:00.000Z",
    });

    expect(parsed.shotCount).toBe(2);
    expect(parsed.approvedShotCount).toBe(1);
  });

  it("accepts a shot video record payload", () => {
    const parsed = shared.shotVideoResponseSchema.parse({
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_and_end_frame",
      status: "in_review",
      promptTextSeed: "seed prompt",
      promptTextCurrent: "current prompt",
      promptUpdatedAt: "2026-03-25T12:00:30.000Z",
      videoAssetPath: "videos/batches/video_batch_v1/shots/shot_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_v1/shots/shot_1/thumbnail.webp",
      durationSec: 8,
      provider: "vector-engine",
      model: "sora-2-all",
      updatedAt: "2026-03-25T12:01:00.000Z",
      approvedAt: null,
      sourceTaskId: "task_video_shot_1",
    });

    expect(parsed.status).toBe("in_review");
    expect(parsed.model).toBe("sora-2-all");
    expect(parsed.shotCode).toBe("SC01-SG01-SH01");
    expect(parsed.frameDependency).toBe("start_and_end_frame");
    expect(parsed.promptTextSeed).toBe("seed prompt");
    expect(parsed.promptTextCurrent).toBe("current prompt");
    expect(parsed.promptUpdatedAt).toBe("2026-03-25T12:00:30.000Z");
    expect(parsed.shotCode).toBe("SC01-SG01-SH01");
    expect(parsed.frameDependency).toBe("start_and_end_frame");
  });

  it("keeps the legacy segment schema alias working", () => {
    const parsed = shared.segmentVideoResponseSchema.parse({
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_frame_only",
      status: "approved",
      promptTextSeed: "seed prompt",
      promptTextCurrent: "current prompt",
      promptUpdatedAt: "2026-03-25T12:00:30.000Z",
      videoAssetPath: "videos/batches/video_batch_v1/shots/shot_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_v1/shots/shot_1/thumbnail.webp",
      durationSec: 8,
      provider: "vector-engine",
      model: "sora-2-all",
      updatedAt: "2026-03-25T12:01:00.000Z",
      approvedAt: "2026-03-25T12:02:00.000Z",
      sourceTaskId: "task_video_shot_1",
    });

    expect(parsed.sceneId).toBe("scene_1");
    expect(parsed.status).toBe("approved");
  });

  it("accepts a list response for the current shot videos batch", () => {
    const parsed = shared.videoListResponseSchema.parse({
      currentBatch: {
        id: "video_batch_v1",
        sourceImageBatchId: "image_batch_v1",
        sourceShotScriptId: "shot_script_v1",
        shotCount: 2,
        approvedShotCount: 1,
        updatedAt: "2026-03-25T12:00:00.000Z",
      },
      shots: [
        {
          id: "shot_video_1",
          projectId: "proj_1",
          batchId: "video_batch_v1",
          sourceImageBatchId: "image_batch_v1",
          sourceShotScriptId: "shot_script_v1",
          shotId: "shot_1",
          shotCode: "SC01-SG01-SH01",
          sceneId: "scene_1",
          segmentId: "segment_1",
          segmentOrder: 1,
          shotOrder: 1,
          frameDependency: "start_and_end_frame",
          status: "approved",
          promptTextSeed: "shot seed",
          promptTextCurrent: "shot prompt",
          promptUpdatedAt: "2026-03-25T12:00:30.000Z",
          videoAssetPath: "videos/batches/video_batch_v1/shots/shot_1/current.mp4",
          thumbnailAssetPath: "videos/batches/video_batch_v1/shots/shot_1/thumbnail.webp",
          durationSec: 8,
          provider: "vector-engine",
          model: "sora-2-all",
          updatedAt: "2026-03-25T12:01:00.000Z",
          approvedAt: "2026-03-25T12:02:00.000Z",
          sourceTaskId: "task_video_shot_1",
        },
      ],
    });

    expect(parsed.shots).toHaveLength(1);
    expect(parsed.currentBatch.shotCount).toBe(2);
    expect(parsed.currentBatch.approvedShotCount).toBe(1);
    expect(parsed.currentBatch.sourceImageBatchId).toBe("image_batch_v1");
    expect(parsed.shots[0]?.shotCode).toBe("SC01-SG01-SH01");
    expect(parsed.shots[0]?.frameDependency).toBe("start_and_end_frame");
    expect(parsed.shots[0]?.promptTextCurrent).toBe("shot prompt");
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
