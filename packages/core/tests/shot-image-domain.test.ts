import { describe, expect, it } from "vitest";

import {
  createShotReferenceBatchRecord,
  createShotReferenceRecord,
  toCurrentImageBatch,
  toShotReferenceStorageDir,
} from "../src/domain/shot-image";

describe("shot image domain", () => {
  it("builds shot storage paths and omits end frame for start-frame-only references", () => {
    const batch = createShotReferenceBatchRecord({
      id: "image_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      shotCount: 2,
      totalRequiredFrameCount: 3,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });

    const record = createShotReferenceRecord({
      id: "shot_ref_1",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 4,
      frameDependency: "start_frame_only",
      updatedAt: "2026-03-24T00:01:00.000Z",
    });

    expect(record.endFrame).toBeNull();
    expect(
      toShotReferenceStorageDir(batch.id, {
        sceneId: "scene_1",
        segmentId: "segment_1",
        shotId: "shot_1",
      }),
    ).toContain("/shots/");
    expect(record.startFrame.storageDir).toContain("/shots/");
    expect(toCurrentImageBatch(batch, [record]).approvedShotCount).toBe(0);
  });

  it("builds a current batch summary with approved shot counts", () => {
    const batch = createShotReferenceBatchRecord({
      id: "image_batch_v1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      shotCount: 2,
      totalRequiredFrameCount: 3,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:10:00.000Z",
    });

    const approvedShot = createShotReferenceRecord({
      id: "shot_ref_approved",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 4,
      frameDependency: "start_frame_only",
      referenceStatus: "approved",
      startFrame: {
        imageStatus: "approved",
        approvedAt: "2026-03-24T00:08:00.000Z",
      },
      updatedAt: "2026-03-24T00:08:00.000Z",
    });
    const inReviewShot = createShotReferenceRecord({
      id: "shot_ref_review",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_v1",
      sceneId: "scene_2",
      segmentId: "segment_2",
      shotId: "shot_2",
      shotCode: "SC01-SG01-SH02",
      segmentOrder: 2,
      shotOrder: 1,
      durationSec: 5,
      frameDependency: "start_and_end_frame",
      referenceStatus: "in_review",
      startFrame: {
        imageStatus: "approved",
        approvedAt: "2026-03-24T00:09:00.000Z",
      },
      endFrame: {
        imageStatus: "in_review",
      },
      updatedAt: "2026-03-24T00:10:00.000Z",
    });

    expect(toCurrentImageBatch(batch, [approvedShot, inReviewShot])).toEqual({
      id: "image_batch_v1",
      sourceShotScriptId: "shot_script_v1",
      shotCount: 2,
      totalRequiredFrameCount: 3,
      approvedShotCount: 1,
      updatedAt: "2026-03-24T00:10:00.000Z",
    });
  });
});
