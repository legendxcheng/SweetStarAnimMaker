import { describe, expect, it } from "vitest";

import {
  createSegmentFrameRecord,
  createShotImageBatchRecord,
  toCurrentImageBatch,
} from "../src/index";

describe("shot image domain", () => {
  it("builds batch and frame storage paths for start and end frames", () => {
    const batch = createShotImageBatchRecord({
      id: "image_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      segmentCount: 2,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const startFrame = createSegmentFrameRecord({
      id: "frame_segment_1_start",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "start_frame",
      updatedAt: "2026-03-24T00:01:00.000Z",
    });
    const endFrame = createSegmentFrameRecord({
      id: "frame_segment_1_end",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "end_frame",
      updatedAt: "2026-03-24T00:01:00.000Z",
    });

    expect(batch.storageDir).toBe("projects/proj_1-my-story/images/batches/image_batch_v1");
    expect(batch.manifestRelPath).toBe("images/batches/image_batch_v1/manifest.json");
    expect(batch.totalFrameCount).toBe(4);

    expect(startFrame.storageDir).toBe(
      "projects/proj_1-my-story/images/batches/image_batch_v1/segments/segment_1/start-frame",
    );
    expect(startFrame.planningRelPath).toBe(
      "images/batches/image_batch_v1/segments/segment_1/start-frame/planning.json",
    );
    expect(startFrame.promptSeedRelPath).toBe(
      "images/batches/image_batch_v1/segments/segment_1/start-frame/prompt.seed.txt",
    );
    expect(endFrame.promptCurrentRelPath).toBe(
      "images/batches/image_batch_v1/segments/segment_1/end-frame/prompt.current.txt",
    );
    expect(endFrame.currentImageRelPath).toBe(
      "images/batches/image_batch_v1/segments/segment_1/end-frame/current.png",
    );
  });

  it("builds a current batch summary with approved frame counts", () => {
    const batch = createShotImageBatchRecord({
      id: "image_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      segmentCount: 2,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:10:00.000Z",
    });
    const frames = [
      createSegmentFrameRecord({
        id: "frame_1_start",
        batchId: batch.id,
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "start_frame",
        imageStatus: "approved",
        approvedAt: "2026-03-24T00:08:00.000Z",
        updatedAt: "2026-03-24T00:08:00.000Z",
      }),
      createSegmentFrameRecord({
        id: "frame_1_end",
        batchId: batch.id,
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_1",
        sceneId: "scene_1",
        order: 1,
        frameType: "end_frame",
        imageStatus: "in_review",
        updatedAt: "2026-03-24T00:09:00.000Z",
      }),
      createSegmentFrameRecord({
        id: "frame_2_start",
        batchId: batch.id,
        projectId: "proj_1",
        projectStorageDir: "projects/proj_1-my-story",
        sourceShotScriptId: "shot_script_v1",
        segmentId: "segment_2",
        sceneId: "scene_2",
        order: 2,
        frameType: "start_frame",
        imageStatus: "approved",
        approvedAt: "2026-03-24T00:10:00.000Z",
        updatedAt: "2026-03-24T00:10:00.000Z",
      }),
    ];

    const summary = toCurrentImageBatch(batch, frames);

    expect(summary).toEqual({
      id: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      segmentCount: 2,
      totalFrameCount: 4,
      approvedFrameCount: 2,
      updatedAt: "2026-03-24T00:10:00.000Z",
    });
  });
});
