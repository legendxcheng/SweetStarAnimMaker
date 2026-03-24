import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProjectRecord,
  createSegmentFrameRecord,
  createShotImageBatchRecord,
} from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  createSqliteShotImageRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite shot image repository", () => {
  afterEach(async () => {
    for (const db of dbs) {
      db.close();
    }

    dbs.length = 0;
    await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("stores batches and frame records", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    projectRepository.insert(
      createProjectRecord({
        id: "proj_1",
        name: "My Story",
        slug: "my-story",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
      }),
    );
    const batch = createShotImageBatchRecord({
      id: "image_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      segmentCount: 1,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const startFrame = createSegmentFrameRecord({
      id: "frame_start_1",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "start_frame",
      promptTextSeed: "起始画面提示词",
      promptTextCurrent: "起始画面提示词",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const endFrame = createSegmentFrameRecord({
      id: "frame_end_1",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "end_frame",
      promptTextSeed: "结束画面提示词",
      promptTextCurrent: "结束画面提示词",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });

    repository.insertBatch(batch);
    repository.insertFrame(startFrame);
    repository.insertFrame(endFrame);

    expect(repository.findBatchById(batch.id)).toEqual(batch);
    expect(repository.findFrameById(startFrame.id)).toEqual(startFrame);
    expect(repository.listFramesByBatchId(batch.id)).toEqual([endFrame, startFrame]);
  });

  it("updates one frame independently and resolves the project's current image batch", async () => {
    const { projectRepository, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_1",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
    });
    projectRepository.insert(project);
    const batch = createShotImageBatchRecord({
      id: "image_batch_1",
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceShotScriptId: "shot_script_1",
      segmentCount: 1,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const startFrame = createSegmentFrameRecord({
      id: "frame_start_1",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceShotScriptId: "shot_script_1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "start_frame",
      promptTextSeed: "起始画面提示词",
      promptTextCurrent: "起始画面提示词",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const endFrame = createSegmentFrameRecord({
      id: "frame_end_1",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceShotScriptId: "shot_script_1",
      segmentId: "segment_1",
      sceneId: "scene_1",
      order: 1,
      frameType: "end_frame",
      promptTextSeed: "结束画面提示词",
      promptTextCurrent: "结束画面提示词",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });

    repository.insertBatch(batch);
    repository.insertFrame(startFrame);
    repository.insertFrame(endFrame);
    projectRepository.updateCurrentImageBatch({
      projectId: project.id,
      batchId: batch.id,
    });
    repository.updateFrame({
      ...startFrame,
      imageStatus: "approved",
      approvedAt: "2026-03-24T00:10:00.000Z",
      imageWidth: 1920,
      imageHeight: 1080,
      provider: "turnaround-image",
      model: "doubao-seedream-5-0-260128",
      updatedAt: "2026-03-24T00:10:00.000Z",
    });

    expect(repository.findCurrentBatchByProjectId(project.id)).toEqual(batch);
    expect(repository.findFrameById(startFrame.id)).toEqual(
      expect.objectContaining({
        imageStatus: "approved",
        approvedAt: "2026-03-24T00:10:00.000Z",
        imageWidth: 1920,
      }),
    );
    expect(repository.findFrameById(endFrame.id)).toEqual(
      expect.objectContaining({
        imageStatus: "pending",
        approvedAt: null,
      }),
    );
  });
});

async function createRepositoryContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-image-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);
  initializeSqliteSchema(db);

  return {
    db,
    projectRepository: createSqliteProjectRepository({ db }),
    repository: createSqliteShotImageRepository({ db }),
  };
}
