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

  it("persists batches and current segments for the active project batch", async () => {
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
      segmentCount: 1,
      createdAt: "2026-03-25T01:00:00.000Z",
      updatedAt: "2026-03-25T01:00:00.000Z",
    });
    const segment = createSegmentVideoRecord({
      id: "video_segment_1",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      status: "in_review",
      updatedAt: "2026-03-25T01:05:00.000Z",
      sourceTaskId: "task_segment_1",
    });

    projectRepository.insert(project);
    repository.insertBatch(batch);
    repository.insertSegment(segment);
    projectRepository.updateCurrentVideoBatch?.({
      projectId: project.id,
      batchId: batch.id,
    });

    expect(repository.findBatchById(batch.id)).toEqual(batch);
    expect(repository.findCurrentBatchByProjectId(project.id)).toEqual(batch);
    expect(repository.listSegmentsByBatchId(batch.id)).toEqual([segment]);
    expect(repository.findCurrentSegmentByProjectIdAndSegmentId(project.id, "segment_1")).toEqual(
      segment,
    );
  });

  it("updates persisted segment metadata", async () => {
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
      segmentCount: 1,
      createdAt: "2026-03-25T01:00:00.000Z",
      updatedAt: "2026-03-25T01:00:00.000Z",
    });
    const segment = createSegmentVideoRecord({
      id: "video_segment_2",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceImageBatchId: batch.sourceImageBatchId,
      sourceShotScriptId: batch.sourceShotScriptId,
      segmentId: "segment_2",
      sceneId: "scene_1",
      order: 1,
      status: "generating",
      updatedAt: "2026-03-25T01:05:00.000Z",
    });

    projectRepository.insert(project);
    repository.insertBatch(batch);
    repository.insertSegment(segment);

    const updatedSegment = {
      ...segment,
      status: "approved" as const,
      videoAssetPath: "videos/batches/video_batch_2/segments/scene_1-segment_2/current.mp4",
      thumbnailAssetPath: "videos/batches/video_batch_2/segments/scene_1-segment_2/thumbnail.webp",
      durationSec: 8,
      provider: "vector-engine",
      model: "sora-2-all",
      approvedAt: "2026-03-25T01:10:00.000Z",
      updatedAt: "2026-03-25T01:10:00.000Z",
      sourceTaskId: "task_segment_2",
    };

    repository.updateSegment(updatedSegment);

    expect(repository.findSegmentById(segment.id)).toEqual(updatedSegment);
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
