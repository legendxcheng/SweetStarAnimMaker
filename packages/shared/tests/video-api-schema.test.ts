import { describe, expect, it } from "vitest";
import * as shared from "../src/index";

describe("video api schema", () => {
  it("accepts a segment-based current video batch summary payload", () => {
    const parsed = shared.currentVideoBatchSummaryResponseSchema.parse({
      id: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      segmentCount: 2,
      approvedSegmentCount: 1,
      updatedAt: "2026-03-25T12:00:00.000Z",
    });

    expect(parsed.segmentCount).toBe(2);
    expect(parsed.approvedSegmentCount).toBe(1);
  });

  it("accepts a segment video record payload with persisted references", () => {
    const parsed = shared.segmentVideoResponseSchema.parse({
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentName: "Arrival at the harbor",
      segmentSummary: "The heroine reaches the harbor and scans the crowd for her contact.",
      shotCount: 2,
      sourceShotIds: ["shot_1", "shot_2"],
      status: "in_review",
      promptTextSeed: "seed prompt",
      promptTextCurrent: "current prompt",
      promptUpdatedAt: "2026-03-25T12:00:30.000Z",
      referenceImages: [
        {
          id: "ref_image_1",
          assetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/references/images/ref_image_1.webp",
          source: "auto",
          order: 0,
          sourceShotId: "shot_1",
          label: "Shot 1 start",
        },
      ],
      referenceAudios: [
        {
          id: "ref_audio_1",
          assetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/references/audios/ref_audio_1.wav",
          source: "manual",
          order: 0,
          label: "Harbor ambience",
          durationSec: 2.4,
        },
      ],
      videoAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
      durationSec: 8,
      provider: "seedance",
      model: "seedance-2.0-pro",
      updatedAt: "2026-03-25T12:01:00.000Z",
      approvedAt: null,
      sourceTaskId: "task_video_segment_1",
    });

    expect(parsed.status).toBe("in_review");
    expect(parsed.model).toBe("seedance-2.0-pro");
    expect(parsed.segmentName).toBe("Arrival at the harbor");
    expect(parsed.sourceShotIds).toEqual(["shot_1", "shot_2"]);
    expect(parsed.referenceImages).toHaveLength(1);
    expect(parsed.referenceAudios).toHaveLength(1);
    expect(parsed.promptTextSeed).toBe("seed prompt");
    expect(parsed.promptTextCurrent).toBe("current prompt");
    expect(parsed.promptUpdatedAt).toBe("2026-03-25T12:00:30.000Z");
  });

  it("rejects legacy shot-only fields in the public segment schema", () => {
    expect(() =>
      shared.segmentVideoResponseSchema.parse({
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
      }),
    ).toThrow();
  });

  it("accepts a list response for the current segment videos batch", () => {
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
          id: "segment_video_1",
          projectId: "proj_1",
          batchId: "video_batch_v1",
          sourceImageBatchId: "image_batch_v1",
          sourceShotScriptId: "shot_script_v1",
          sceneId: "scene_1",
          segmentId: "segment_1",
          segmentOrder: 1,
          segmentName: "Arrival at the harbor",
          segmentSummary: "The heroine reaches the harbor and scans the crowd for her contact.",
          shotCount: 2,
          sourceShotIds: ["shot_1", "shot_2"],
          status: "approved",
          promptTextSeed: "segment seed",
          promptTextCurrent: "segment prompt",
          promptUpdatedAt: "2026-03-25T12:00:30.000Z",
          referenceImages: [
            {
              id: "ref_image_1",
              assetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/references/images/ref_image_1.webp",
              source: "auto",
              order: 0,
              sourceShotId: "shot_1",
              label: "Shot 1 start",
            },
          ],
          referenceAudios: [],
          videoAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.mp4",
          thumbnailAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
          durationSec: 8,
          provider: "seedance",
          model: "seedance-2.0-pro",
          updatedAt: "2026-03-25T12:01:00.000Z",
          approvedAt: "2026-03-25T12:02:00.000Z",
          sourceTaskId: "task_video_segment_1",
        },
      ],
    });

    expect(parsed.segments).toHaveLength(1);
    expect(parsed.currentBatch.segmentCount).toBe(2);
    expect(parsed.currentBatch.approvedSegmentCount).toBe(1);
    expect(parsed.currentBatch.sourceImageBatchId).toBe("image_batch_v1");
    expect(parsed.segments[0]?.segmentSummary).toContain("harbor");
    expect(parsed.segments[0]?.referenceImages[0]?.sourceShotId).toBe("shot_1");
    expect(parsed.segments[0]?.referenceAudios).toEqual([]);
    expect(parsed.segments[0]?.promptTextCurrent).toBe("segment prompt");
  });

  it("accepts a segment video config payload", () => {
    const parsed = shared.saveVideoPromptRequestSchema.parse({
      promptTextCurrent: "用户保存后的片段提示词",
      referenceImages: [
        {
          id: "ref_image_1",
          assetPath: "videos/segments/segment_1/references/images/ref_image_1.webp",
          source: "manual",
          order: 1,
          sourceShotId: null,
          label: "Manual insert",
        },
      ],
      referenceAudios: [
        {
          id: "ref_audio_1",
          assetPath: "videos/segments/segment_1/references/audios/ref_audio_1.wav",
          source: "manual",
          order: 0,
          label: "Dialogue guide",
          durationSec: 3.2,
        },
      ],
    });

    expect(parsed.promptTextCurrent).toBe("用户保存后的片段提示词");
    expect(parsed.referenceImages[0]?.source).toBe("manual");
    expect(parsed.referenceAudios[0]?.durationSec).toBe(3.2);
  });

  it("accepts reference audio upload metadata if present", () => {
    const parsed = shared.referenceAudioUploadMetadataRequestSchema.parse({
      fileName: "harbor-guide.wav",
      mimeType: "audio/wav",
      bytes: 2048,
      label: "Harbor guide track",
      durationSec: 2.4,
    });

    expect(parsed.fileName).toBe("harbor-guide.wav");
    expect(parsed.mimeType).toBe("audio/wav");
    expect(parsed.bytes).toBe(2048);
    expect(parsed.durationSec).toBe(2.4);
  });

  it("rejects the legacy shot list field in the public list response", () => {
    const parsed = shared.segmentVideoResponseSchema.parse({
      id: "video_segment_1",
      projectId: "proj_1",
      batchId: "video_batch_v1",
      sourceImageBatchId: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      segmentName: "Arrival at the harbor",
      segmentSummary: "The heroine reaches the harbor and scans the crowd for her contact.",
      shotCount: 2,
      sourceShotIds: ["shot_1", "shot_2"],
      status: "approved",
      promptTextSeed: "seed prompt",
      promptTextCurrent: "current prompt",
      promptUpdatedAt: "2026-03-25T12:00:30.000Z",
      referenceImages: [],
      referenceAudios: [],
      videoAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_v1/segments/scene_1__segment_1/thumbnail.webp",
      durationSec: 8,
      provider: "seedance",
      model: "seedance-2.0-pro",
      updatedAt: "2026-03-25T12:01:00.000Z",
      approvedAt: "2026-03-25T12:02:00.000Z",
      sourceTaskId: "task_video_segment_1",
    });

    expect(parsed.sceneId).toBe("scene_1");
    expect(parsed.status).toBe("approved");

    expect(() =>
      shared.videoListResponseSchema.parse({
        currentBatch: {
          id: "video_batch_v1",
          sourceImageBatchId: "image_batch_v1",
          sourceShotScriptId: "shot_script_v1",
          segmentCount: 1,
          approvedSegmentCount: 0,
          updatedAt: "2026-03-25T12:00:00.000Z",
        },
        shots: [parsed],
      }),
    ).toThrow();
  });

  it("accepts final cut response payloads", () => {
    const parsed = shared.finalCutResponseSchema.parse({
      currentFinalCut: {
        id: "final_cut_1",
        projectId: "proj_1",
        sourceVideoBatchId: "video_batch_1",
        status: "ready",
        videoAssetPath: "final-cut/current.mp4",
        manifestAssetPath: "final-cut/manifests/final_cut_1.txt",
        shotCount: 3,
        createdAt: "2026-03-31T00:00:00.000Z",
        updatedAt: "2026-03-31T00:01:00.000Z",
        errorMessage: null,
      },
    });

    expect(parsed.currentFinalCut?.status).toBe("ready");
    expect(parsed.currentFinalCut?.videoAssetPath).toBe("final-cut/current.mp4");
  });
});
