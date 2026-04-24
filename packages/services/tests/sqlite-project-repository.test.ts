import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProjectRecord, premiseRelPath } from "@sweet-star/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalDataPaths,
  createSqliteDb,
  createSqliteProjectRepository,
  initializeSqliteSchema,
} from "../src/index";

const tempDirs: string[] = [];
const dbs: Array<{ close(): void }> = [];

describe("sqlite project repository", () => {
  afterEach(async () => {
    for (const db of dbs) {
      db.close();
    }

    dbs.length = 0;
    await Promise.all(
      tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it("initializes the projects table schema", async () => {
    const { db } = await createRepositoryContext();

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'")
      .get() as { name: string } | undefined;

    expect(table?.name).toBe("projects");
    const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;

    expect(columns.map((column) => column.name)).toContain("current_master_plot_id");
    expect(columns.map((column) => column.name)).toContain("current_character_sheet_batch_id");
    expect(columns.map((column) => column.name)).toContain("current_storyboard_id");
    expect(columns.map((column) => column.name)).toContain("current_shot_script_id");
    expect(columns.map((column) => column.name)).toContain("current_image_batch_id");
    expect(columns.map((column) => column.name)).toContain("current_video_batch_id");
    expect(columns.map((column) => column.name)).toContain("visual_style_text");
    expect(columns.map((column) => column.name)).toContain("video_reference_strategy");
  });

  it("inserts and finds a project by id", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
      visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
    });

    repository.insert(project);

    expect(repository.findById("proj_20260321_ab12cd")).toEqual({
      ...project,
      videoReferenceStrategy: "auto",
    });
  });

  it("updates premise metadata fields", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
      visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
    });

    repository.insert(project);
    repository.updatePremiseMetadata({
      id: "proj_20260321_ab12cd",
      premiseBytes: 15,
      updatedAt: "2026-03-21T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T01:00:00.000Z",
    });

    expect(repository.findById("proj_20260321_ab12cd")).toEqual({
      ...project,
      premiseBytes: 15,
      visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
      updatedAt: "2026-03-21T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T01:00:00.000Z",
    });
  });

  it("updates the current master plot, storyboard, shot script, and image batch pointers on the project row", async () => {
    const { db, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
      visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
    });

    repository.insert(project);
    repository.updateCurrentMasterPlot({
      projectId: "proj_20260321_ab12cd",
      masterPlotId: "mp_20260321_ab12cd",
    });
    repository.updateCurrentCharacterSheetBatch({
      projectId: "proj_20260321_ab12cd",
      batchId: "char_batch_v1",
    });
    repository.updateCurrentStoryboard({
      projectId: "proj_20260321_ab12cd",
      storyboardId: "storyboard_20260321_ab12cd",
    });
    repository.updateCurrentShotScript({
      projectId: "proj_20260321_ab12cd",
      shotScriptId: "shot_script_20260321_ab12cd",
    });
    repository.updateCurrentImageBatch({
      projectId: "proj_20260321_ab12cd",
      batchId: "image_batch_20260321_ab12cd",
    });
    repository.updateCurrentVideoBatch?.({
      projectId: "proj_20260321_ab12cd",
      batchId: "video_batch_20260321_ab12cd",
    });

    const row = db
      .prepare(
        "SELECT current_master_plot_id, current_character_sheet_batch_id, current_storyboard_id, current_shot_script_id, current_image_batch_id, current_video_batch_id FROM projects WHERE id = ?",
      )
      .get("proj_20260321_ab12cd") as
      | {
          current_master_plot_id: string | null;
          current_character_sheet_batch_id: string | null;
          current_storyboard_id: string | null;
          current_shot_script_id: string | null;
          current_image_batch_id: string | null;
          current_video_batch_id: string | null;
        }
      | undefined;

    expect(row).toEqual({
      current_master_plot_id: "mp_20260321_ab12cd",
      current_character_sheet_batch_id: "char_batch_v1",
      current_storyboard_id: "storyboard_20260321_ab12cd",
      current_shot_script_id: "shot_script_20260321_ab12cd",
      current_image_batch_id: "image_batch_20260321_ab12cd",
      current_video_batch_id: "video_batch_20260321_ab12cd",
    });
  });

  it("updates the persisted project status", async () => {
    const { repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260321_ab12cd",
      name: "My Story",
      slug: "my-story",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 7,
      visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
    });

    repository.insert(project);
    repository.updateStatus({
      projectId: project.id,
      status: "shot_script_in_review",
      updatedAt: "2026-03-21T01:00:00.000Z",
    });

    expect(repository.findById(project.id)).toEqual({
      ...project,
      status: "shot_script_in_review",
      updatedAt: "2026-03-21T01:00:00.000Z",
    });
  });

  it("resets a project to premise_ready and deletes downstream rows", async () => {
    const { db, repository } = await createRepositoryContext();
    const project = createProjectRecord({
      id: "proj_20260325_reset",
      name: "Reset Me",
      slug: "reset-me",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T00:00:00.000Z",
      premiseBytes: 7,
      visualStyleText: "旧风格",
      currentMasterPlotId: "master-plot-v1",
      currentCharacterSheetBatchId: "character-batch-v1",
      currentStoryboardId: "storyboard-v1",
      currentShotScriptId: "shot-script-v1",
      currentImageBatchId: "image-batch-v1",
      currentVideoBatchId: "video-batch-v1",
      status: "videos_in_review",
    });

    repository.insert(project);

    db.prepare(
      `
        INSERT INTO tasks (
          id, project_id, type, status, queue_name, storage_dir, input_rel_path, output_rel_path, log_rel_path,
          error_message, created_at, updated_at, started_at, finished_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "task-reset-1",
      project.id,
      "master_plot_generate",
      "running",
      "master-plot-generate",
      `${project.storageDir}/tasks/task-reset-1`,
      "tasks/task-reset-1/input.json",
      "tasks/task-reset-1/output.json",
      "tasks/task-reset-1/log.txt",
      null,
      "2026-03-25T00:01:00.000Z",
      "2026-03-25T00:01:00.000Z",
      "2026-03-25T00:01:00.000Z",
      null,
    );
    db.prepare(
      `
        INSERT INTO storyboard_versions (
          id, project_id, source_task_id, version_number, kind, provider, model, file_rel_path, raw_response_rel_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "storyboard-v1",
      project.id,
      "task-reset-1",
      1,
      "ai",
      "gemini",
      "gemini-2.0-flash",
      "storyboard/versions/v1/storyboard.json",
      "storyboard/raw/task-reset-1.json",
      "2026-03-25T00:02:00.000Z",
    );
    db.prepare(
      `
        INSERT INTO storyboard_reviews (
          id, project_id, master_plot_id, action, reason, triggered_task_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "storyboard-review-1",
      project.id,
      "master-plot-v1",
      "reject",
      "Need changes",
      "task-reset-1",
      "2026-03-25T00:03:00.000Z",
    );
    db.prepare(
      `
        INSERT INTO character_sheet_batches (
          id, project_id, project_storage_dir, source_master_plot_id, character_count, storage_dir, manifest_rel_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "character-batch-v1",
      project.id,
      project.storageDir,
      "master-plot-v1",
      1,
      `${project.storageDir}/character-sheets/batches/character-batch-v1`,
      "character-sheets/batches/character-batch-v1/manifest.json",
      "2026-03-25T00:04:00.000Z",
      "2026-03-25T00:04:00.000Z",
    );
    db.prepare(
      `
        INSERT INTO character_sheets (
          id, project_id, project_storage_dir, batch_id, source_master_plot_id, character_name, prompt_text_generated,
          prompt_text_current, image_asset_path, image_width, image_height, provider, model, status, updated_at, approved_at,
          source_task_id, storage_dir, current_image_rel_path, current_metadata_rel_path, prompt_generated_rel_path, prompt_current_rel_path,
          prompt_variables_rel_path, image_prompt_rel_path, versions_storage_dir
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "character-1",
      project.id,
      project.storageDir,
      "character-batch-v1",
      "master-plot-v1",
      "Rin",
      "Generated prompt",
      "Current prompt",
      null,
      null,
      null,
      null,
      null,
      "draft",
      "2026-03-25T00:05:00.000Z",
      null,
      "task-reset-1",
      `${project.storageDir}/character-sheets/characters/character-1`,
      "character-sheets/characters/character-1/current.png",
      "character-sheets/characters/character-1/current.json",
      "character-sheets/characters/character-1/prompt.generated.txt",
      "character-sheets/characters/character-1/prompt.current.txt",
      "character-sheets/characters/character-1/prompt.variables.json",
      "character-sheets/characters/character-1/image.prompt.txt",
      `${project.storageDir}/character-sheets/characters/character-1/versions`,
    );
    db.prepare(
      `
        INSERT INTO shot_script_reviews (
          id, project_id, shot_script_id, action, reason, next_action, triggered_task_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "shot-script-review-1",
      project.id,
      "shot-script-v1",
      "reject",
      "Need changes",
      "regenerate",
      "task-reset-1",
      "2026-03-25T00:06:00.000Z",
    );
    db.prepare(
      `
        INSERT INTO shot_image_batches (
          id, project_id, project_storage_dir, source_shot_script_id, segment_count, total_frame_count, storage_dir, manifest_rel_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "image-batch-v1",
      project.id,
      project.storageDir,
      "shot-script-v1",
      1,
      2,
      `${project.storageDir}/images/batches/image-batch-v1`,
      "images/batches/image-batch-v1/manifest.json",
      "2026-03-25T00:07:00.000Z",
      "2026-03-25T00:07:00.000Z",
    );
    db.prepare(
      `
        INSERT INTO shot_image_frames (
          id, batch_id, project_id, project_storage_dir, source_shot_script_id, segment_id, scene_id, frame_order, frame_type, plan_status,
          image_status, selected_character_ids, matched_reference_image_paths, unmatched_character_ids, prompt_text_seed, prompt_text_current,
          negative_prompt_text_current, prompt_updated_at, image_asset_path, image_width, image_height, provider, model, approved_at, updated_at,
          source_task_id, storage_dir, planning_rel_path, prompt_seed_rel_path, prompt_current_rel_path, current_image_rel_path, current_metadata_rel_path,
          prompt_versions_storage_dir, versions_storage_dir
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "frame-1",
      "image-batch-v1",
      project.id,
      project.storageDir,
      "shot-script-v1",
      "segment-1",
      "scene-1",
      1,
      "start_frame",
      "planned",
      "draft",
      "[]",
      "[]",
      "[]",
      "seed prompt",
      "current prompt",
      null,
      "2026-03-25T00:08:00.000Z",
      null,
      null,
      null,
      null,
      null,
      null,
      "2026-03-25T00:08:00.000Z",
      "task-reset-1",
      `${project.storageDir}/images/frames/frame-1`,
      "images/frames/frame-1/planning.json",
      "images/frames/frame-1/prompt.seed.txt",
      "images/frames/frame-1/prompt.current.txt",
      "images/frames/frame-1/current.png",
      "images/frames/frame-1/current.json",
      `${project.storageDir}/images/frames/frame-1/prompt-versions`,
      `${project.storageDir}/images/frames/frame-1/versions`,
    );
    db.prepare(
      `
        INSERT INTO video_batches (
          id, project_id, project_storage_dir, source_image_batch_id, source_shot_script_id, segment_count, storage_dir, manifest_rel_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "video-batch-v1",
      project.id,
      project.storageDir,
      "image-batch-v1",
      "shot-script-v1",
      1,
      `${project.storageDir}/videos/batches/video-batch-v1`,
      "videos/batches/video-batch-v1/manifest.json",
      "2026-03-25T00:09:00.000Z",
      "2026-03-25T00:09:00.000Z",
    );
    db.prepare(
      `
        INSERT INTO segment_videos (
          id, batch_id, project_id, project_storage_dir, source_image_batch_id, source_shot_script_id, segment_id, scene_id, segment_order,
          status, video_asset_path, thumbnail_asset_path, duration_sec, provider, model, updated_at, approved_at, source_task_id, storage_dir,
          current_video_rel_path, current_metadata_rel_path, thumbnail_rel_path, versions_storage_dir
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      "video-1",
      "video-batch-v1",
      project.id,
      project.storageDir,
      "image-batch-v1",
      "shot-script-v1",
      "segment-1",
      "scene-1",
      1,
      "draft",
      null,
      null,
      null,
      null,
      null,
      "2026-03-25T00:10:00.000Z",
      null,
      "task-reset-1",
      `${project.storageDir}/videos/segments/video-1`,
      "videos/segments/video-1/current.mp4",
      "videos/segments/video-1/current.json",
      "videos/segments/video-1/thumbnail.jpg",
      `${project.storageDir}/videos/segments/video-1/versions`,
    );

    repository.resetToPremise?.({
      projectId: project.id,
      premiseBytes: 42,
      visualStyleText: "新风格",
      updatedAt: "2026-03-25T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T01:00:00.000Z",
    });

    expect(repository.findById(project.id)).toEqual({
      ...project,
      premiseBytes: 42,
      currentMasterPlotId: null,
      currentCharacterSheetBatchId: null,
      currentStoryboardId: null,
      currentShotScriptId: null,
      currentImageBatchId: null,
      currentVideoBatchId: null,
      visualStyleText: "新风格",
      status: "premise_ready",
      updatedAt: "2026-03-25T01:00:00.000Z",
      premiseUpdatedAt: "2026-03-25T01:00:00.000Z",
    });
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM storyboard_versions WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM storyboard_reviews WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM shot_script_reviews WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM character_sheet_batches WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM character_sheets WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM shot_image_batches WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM shot_image_frames WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM video_batches WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM segment_videos WHERE project_id = ?").get(project.id) as { count: number })
        .count,
    ).toBe(0);
  });

  it("inserts a project into a legacy schema that still requires script columns", async () => {
    const { db } = await createRepositoryContext({
      legacyProjectsTable: true,
    });
    const repository = createSqliteProjectRepository({ db });
    const project = createProjectRecord({
      id: "proj_20260321_legacy",
      name: "Legacy Insert",
      slug: "legacy-insert",
      createdAt: "2026-03-21T00:00:00.000Z",
      updatedAt: "2026-03-21T00:00:00.000Z",
      premiseUpdatedAt: "2026-03-21T00:00:00.000Z",
      premiseBytes: 55,
      visualStyleText: "赛璐璐动画，冷色霓虹雨夜，电影感光影",
    });

    expect(() => repository.insert(project)).not.toThrow();

    const row = db
      .prepare(
        `
          SELECT script_rel_path, script_bytes, script_updated_at
          FROM projects
          WHERE id = ?
        `,
      )
      .get(project.id) as
      | {
          script_rel_path: string;
          script_bytes: number;
          script_updated_at: string;
        }
      | undefined;

    expect(row).toEqual({
      script_rel_path: premiseRelPath,
      script_bytes: project.premiseBytes,
      script_updated_at: project.premiseUpdatedAt,
    });
  });
});

async function createRepositoryContext(options: { legacyProjectsTable?: boolean } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sweet-star-sqlite-"));
  const paths = createLocalDataPaths(tempDir);
  const db = createSqliteDb({ paths });

  tempDirs.push(tempDir);
  dbs.push(db);

  if (options.legacyProjectsTable) {
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        storage_dir TEXT NOT NULL,
        script_rel_path TEXT NOT NULL,
        script_bytes INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        script_updated_at TEXT NOT NULL
      )
    `);
  }

  initializeSqliteSchema(db);

  return {
    db,
    repository: createSqliteProjectRepository({ db }),
  };
}
