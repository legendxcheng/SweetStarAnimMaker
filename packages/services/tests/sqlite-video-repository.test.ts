import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProjectRecord,
  createSegmentVideoRecord,
  createVideoBatchRecord,
} from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteVideoRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite video repository", () => {
  afterEach(async () => {
    for (const db of dbs) {
      db.close();
    }

    dbs.length = 0;
    await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
  });

  it("persists batches and current shots for the active project batch", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_video_1",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T00:00:00.000Z",
      premiseBytes: 7,
    });
    const batch = createVideoBatchRecord({
      id: "video_batch_1",
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: "image_batch_1",
      sourceShotScriptId: "shot_script_1",
      shotCount: 1,
      createdAt: "2026-03-25T01:00:00.000Z",
      updatedAt: "2026-03-25T01:00:00.000Z",
    });
    const shot = createSegmentVideoRecord({
      id: "video_shot_1",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_frame_only",
      durationSec: 3,
      status: "in_review",
      promptTextSeed: "seed prompt 1",
      promptTextCurrent: "current prompt 1",
      promptUpdatedAt: "2026-03-25T01:04:00.000Z",
      updatedAt: "2026-03-25T01:05:00.000Z",
      sourceTaskId: "task_segment_1",
    });

    projectRepository.insert(project);
    repository.insertBatch(batch);
    repository.insertSegment(shot);
    projectRepository.updateCurrentVideoBatch?.({
      projectId: project.id,
      batchId: batch.id,
    });

    expect(repository.findBatchById(batch.id)).toEqual(batch);
    expect(repository.findCurrentBatchByProjectId(project.id)).toEqual(batch);
    expect(repository.listSegmentsByBatchId(batch.id)).toEqual([shot]);
    expect(repository.findSegmentById(shot.id)).toEqual(shot);
    expect(
      repository.findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId?.(
        project.id,
        "scene_1",
        "segment_1",
        "shot_1",
      ),
    ).toEqual(shot);
  });

  it("updates persisted shot metadata and keeps shot storage paths", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_video_2",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T00:00:00.000Z",
      premiseBytes: 7,
    });
    const batch = createVideoBatchRecord({
      id: "video_batch_2",
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: "image_batch_2",
      sourceShotScriptId: "shot_script_2",
      shotCount: 1,
      createdAt: "2026-03-25T01:00:00.000Z",
      updatedAt: "2026-03-25T01:00:00.000Z",
    });
    const shot = createSegmentVideoRecord({
      id: "video_shot_2",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotId: "shot_2",
      shotCode: "SC01-SG01-SH02",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      shotOrder: 2,
      frameDependency: "start_and_end_frame",
      durationSec: 5,
      status: "generating",
      promptTextSeed: "seed prompt 2",
      promptTextCurrent: "current prompt 2",
      promptUpdatedAt: "2026-03-25T01:04:00.000Z",
      updatedAt: "2026-03-25T01:05:00.000Z",
    });

    projectRepository.insert(project);
    repository.insertBatch(batch);
    repository.insertSegment(shot);

    const updatedShot = {
      ...shot,
      status: "approved" as const,
      promptTextCurrent: "updated prompt 2",
      promptUpdatedAt: "2026-03-25T01:09:00.000Z",
      videoAssetPath: "videos/batches/video_batch_2/shots/scene_1__segment_1__shot_2/current.mp4",
      thumbnailAssetPath:
        "videos/batches/video_batch_2/shots/scene_1__segment_1__shot_2/thumbnail.webp",
      durationSec: 5,
      provider: "vector-engine",
      model: "kling-v3",
      approvedAt: "2026-03-25T01:10:00.000Z",
      updatedAt: "2026-03-25T01:10:00.000Z",
      sourceTaskId: "task_shot_2",
    };

    repository.updateSegment(updatedShot);

    const persistedShot = await repository.findSegmentById(shot.id);

    expect(persistedShot).toEqual(updatedShot);
    expect(persistedShot?.promptTextSeed).toBe("seed prompt 2");
    expect(persistedShot?.promptTextCurrent).toBe("updated prompt 2");
    expect(persistedShot?.promptUpdatedAt).toBe("2026-03-25T01:09:00.000Z");
    expect(persistedShot?.shotCode).toBe("SC01-SG01-SH02");
    expect(persistedShot?.frameDependency).toBe("start_and_end_frame");
    expect(persistedShot?.currentVideoRelPath).toContain("/shots/");
  });

  it("persists segment order for current video shots", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_video_2b",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T00:00:00.000Z",
      premiseBytes: 7,
    });
    const batch = createVideoBatchRecord({
      id: "video_batch_2b",
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: "image_batch_2b",
      sourceShotScriptId: "shot_script_2b",
      shotCount: 1,
      createdAt: "2026-03-25T01:00:00.000Z",
      updatedAt: "2026-03-25T01:00:00.000Z",
    });
    const shot = createSegmentVideoRecord({
      id: "video_shot_2b",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotId: "shot_2b",
      shotCode: "SC01-SG02-SH01",
      sceneId: "scene_1",
      segmentId: "segment_2",
      segmentOrder: 2,
      shotOrder: 1,
      frameDependency: "start_frame_only",
      durationSec: 4,
      status: "generating",
      promptTextSeed: "seed prompt 2b",
      promptTextCurrent: "current prompt 2b",
      promptUpdatedAt: "2026-03-25T01:04:00.000Z",
      updatedAt: "2026-03-25T01:05:00.000Z",
    });

    projectRepository.insert(project);
    repository.insertBatch(batch);
    repository.insertSegment(shot);

    expect(repository.findSegmentById(shot.id)).toEqual(shot);
  });

  it("finds the current shot by scene id, segment id, and shot id when ids repeat across shots", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_video_3",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T00:00:00.000Z",
      premiseBytes: 7,
    });
    const batch = createVideoBatchRecord({
      id: "video_batch_3",
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: "image_batch_3",
      sourceShotScriptId: "shot_script_3",
      shotCount: 2,
      createdAt: "2026-03-25T01:00:00.000Z",
      updatedAt: "2026-03-25T01:00:00.000Z",
    });
    const firstShot = createSegmentVideoRecord({
      id: "video_shot_scene_1",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotId: "shot_1",
      shotCode: "SC01-SG01-SH01",
      sceneId: "scene_1",
      segmentId: "segment_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_frame_only",
      durationSec: 3,
      status: "in_review",
      promptTextSeed: "seed prompt scene 1",
      promptTextCurrent: "current prompt scene 1",
      promptUpdatedAt: "2026-03-25T01:04:00.000Z",
      updatedAt: "2026-03-25T01:05:00.000Z",
      sourceTaskId: "task_segment_scene_1",
    });
    const secondShot = createSegmentVideoRecord({
      id: "video_shot_scene_2",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      shotId: "shot_1",
      shotCode: "SC02-SG01-SH01",
      sceneId: "scene_2",
      segmentId: "segment_1",
      segmentOrder: 1,
      shotOrder: 1,
      frameDependency: "start_and_end_frame",
      durationSec: 5,
      status: "in_review",
      promptTextSeed: "seed prompt scene 2",
      promptTextCurrent: "current prompt scene 2",
      promptUpdatedAt: "2026-03-25T01:04:30.000Z",
      updatedAt: "2026-03-25T01:06:00.000Z",
      sourceTaskId: "task_segment_scene_2",
    });

    projectRepository.insert(project);
    repository.insertBatch(batch);
    repository.insertSegment(firstShot);
    repository.insertSegment(secondShot);
    projectRepository.updateCurrentVideoBatch?.({
      projectId: project.id,
      batchId: batch.id,
    });

    expect(
      repository.findCurrentSegmentByProjectIdAndSceneIdAndSegmentIdAndShotId?.(
        project.id,
        "scene_2",
        "segment_1",
        "shot_1",
      ),
    ).toEqual(secondShot);
  });
});

async function createRepositoryContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-sqlite-video-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);
  initializeSqliteSchema(db);

  return {
    projectRepository: createSqliteProjectRepository({ db }),
    repository: createSqliteVideoRepository({ db }),
  };
}
