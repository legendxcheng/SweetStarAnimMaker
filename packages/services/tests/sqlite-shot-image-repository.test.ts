import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProjectRecord,
  createShotReferenceBatchRecord,
  createShotReferenceRecord,
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

  it("stores batches and shot records", async () => {
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
    const batch = createShotReferenceBatchRecord({
      id: "image_batch_1",
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      shotCount: 2,
      totalRequiredFrameCount: 3,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const firstShot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_1",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "S01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 3,
      frameDependency: "start_and_end_frame",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const secondShot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_2",
      batchId: batch.id,
      projectId: "proj_1",
      projectStorageDir: "projects/proj_1-my-story",
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_2",
      shotCode: "S01-SG01-SH02",
      segmentOrder: 1,
      shotOrder: 2,
      durationSec: 2,
      frameDependency: "start_frame_only",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });

    repository.insertBatch(batch);
    repository.insertShot?.(firstShot);
    repository.insertShot?.(secondShot);

    expect(repository.findBatchById(batch.id)).toEqual(batch);
    expect(repository.findShotById?.(firstShot.id)).toEqual(firstShot);
    expect(repository.listShotsByBatchId?.(batch.id)).toEqual([firstShot, secondShot]);
    const persistedSecondShot = await repository.findShotById?.(secondShot.id);
    expect(persistedSecondShot?.endFrame).toBeNull();
  });

  it("updates one shot independently and resolves the project's current image batch", async () => {
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
    const batch = createShotReferenceBatchRecord({
      id: "image_batch_1",
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceShotScriptId: "shot_script_1",
      shotCount: 2,
      totalRequiredFrameCount: 3,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const firstShot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_1",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_1",
      shotCode: "S01-SG01-SH01",
      segmentOrder: 1,
      shotOrder: 1,
      durationSec: 3,
      frameDependency: "start_and_end_frame",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    const secondShot = createShotReferenceRecord({
      id: "shot_ref_image_batch_1_scene_1_segment_1_shot_2",
      batchId: batch.id,
      projectId: project.id,
      projectStorageDir: project.storageDir,
      sourceShotScriptId: "shot_script_1",
      sceneId: "scene_1",
      segmentId: "segment_1",
      shotId: "shot_2",
      shotCode: "S01-SG01-SH02",
      segmentOrder: 1,
      shotOrder: 2,
      durationSec: 2,
      frameDependency: "start_frame_only",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });

    repository.insertBatch(batch);
    repository.insertShot?.(firstShot);
    repository.insertShot?.(secondShot);
    projectRepository.updateCurrentImageBatch({
      projectId: project.id,
      batchId: batch.id,
    });
    repository.updateShot?.({
      ...firstShot,
      referenceStatus: "in_review",
      startFrame: {
        ...firstShot.startFrame,
        imageStatus: "approved",
        approvedAt: "2026-03-24T00:10:00.000Z",
        imageWidth: 1920,
        imageHeight: 1080,
        provider: "turnaround-image",
        model: "doubao-seedream-5-0-260128",
        updatedAt: "2026-03-24T00:10:00.000Z",
      },
      updatedAt: "2026-03-24T00:10:00.000Z",
    });

    expect(repository.findCurrentBatchByProjectId(project.id)).toEqual(batch);
    expect(repository.findShotById?.(firstShot.id)).toEqual(
      expect.objectContaining({
        referenceStatus: "in_review",
        startFrame: expect.objectContaining({
          imageStatus: "approved",
          approvedAt: "2026-03-24T00:10:00.000Z",
          imageWidth: 1920,
        }),
      }),
    );
    expect(repository.findShotById?.(secondShot.id)).toEqual(
      expect.objectContaining({
        referenceStatus: "pending",
        startFrame: expect.objectContaining({
          imageStatus: "pending",
          approvedAt: null,
        }),
      }),
    );
  });

  it("migrates legacy batch tables before inserting shot-first columns", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-shot-image-legacy-"));
    const paths = createLocalDataPaths(tempDir);
    const db = createSqliteDb({ paths });

    tempDirs.push(tempDir);
    dbs.push(db);

    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        storage_dir TEXT NOT NULL,
        premise_rel_path TEXT NOT NULL,
        premise_bytes INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        premise_updated_at TEXT NOT NULL,
        current_master_plot_id TEXT NULL,
        current_character_sheet_batch_id TEXT NULL,
        current_storyboard_id TEXT NULL,
        current_shot_script_id TEXT NULL,
        current_image_batch_id TEXT NULL,
        current_video_batch_id TEXT NULL,
        visual_style_text TEXT NOT NULL DEFAULT ''
      );
    `);
    db.exec(`
      CREATE TABLE shot_image_batches (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_storage_dir TEXT NOT NULL,
        source_shot_script_id TEXT NOT NULL,
        segment_count INTEGER NOT NULL,
        total_frame_count INTEGER NOT NULL,
        storage_dir TEXT NOT NULL,
        manifest_rel_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      );
    `);
    db.exec(`
      CREATE TABLE shot_image_shots (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        project_storage_dir TEXT NOT NULL,
        source_shot_script_id TEXT NOT NULL,
        scene_id TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        shot_id TEXT NOT NULL,
        shot_code TEXT NOT NULL,
        segment_order INTEGER NOT NULL,
        shot_order INTEGER NOT NULL,
        duration_sec INTEGER NULL,
        frame_dependency TEXT NOT NULL,
        reference_status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        storage_dir TEXT NOT NULL,
        manifest_rel_path TEXT NOT NULL,
        start_frame_json TEXT NOT NULL,
        end_frame_json TEXT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id),
        FOREIGN KEY(batch_id) REFERENCES shot_image_batches(id)
      );
    `);
    db.exec(`
      CREATE TABLE shot_image_frames (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        project_storage_dir TEXT NOT NULL,
        source_shot_script_id TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        scene_id TEXT NOT NULL,
        frame_order INTEGER NOT NULL,
        frame_type TEXT NOT NULL,
        plan_status TEXT NOT NULL,
        image_status TEXT NOT NULL,
        selected_character_ids TEXT NOT NULL,
        matched_reference_image_paths TEXT NOT NULL,
        unmatched_character_ids TEXT NOT NULL,
        prompt_text_seed TEXT NOT NULL,
        prompt_text_current TEXT NOT NULL,
        negative_prompt_text_current TEXT NULL,
        prompt_updated_at TEXT NULL,
        image_asset_path TEXT NULL,
        image_width INTEGER NULL,
        image_height INTEGER NULL,
        provider TEXT NULL,
        model TEXT NULL,
        approved_at TEXT NULL,
        updated_at TEXT NOT NULL,
        source_task_id TEXT NULL,
        storage_dir TEXT NOT NULL,
        planning_rel_path TEXT NOT NULL,
        prompt_seed_rel_path TEXT NOT NULL,
        prompt_current_rel_path TEXT NOT NULL,
        current_image_rel_path TEXT NOT NULL,
        current_metadata_rel_path TEXT NOT NULL,
        prompt_versions_storage_dir TEXT NOT NULL,
        versions_storage_dir TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id),
        FOREIGN KEY(batch_id) REFERENCES shot_image_batches(id)
      );
    `);

    initializeSqliteSchema(db);

    const projectRepository = createSqliteProjectRepository({ db });
    const repository = createSqliteShotImageRepository({ db });
    projectRepository.insert(
      createProjectRecord({
        id: "proj_legacy",
        name: "Legacy Story",
        slug: "legacy-story",
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:00:00.000Z",
        premiseUpdatedAt: "2026-03-24T00:00:00.000Z",
      }),
    );

    const batch = createShotReferenceBatchRecord({
      id: "image_batch_legacy",
      projectId: "proj_legacy",
      projectStorageDir: "projects/proj_legacy-story",
      sourceShotScriptId: "shot_script_legacy",
      shotCount: 2,
      totalRequiredFrameCount: 3,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });

    repository.insertBatch(batch);

    expect(repository.findBatchById(batch.id)).toEqual(batch);
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
