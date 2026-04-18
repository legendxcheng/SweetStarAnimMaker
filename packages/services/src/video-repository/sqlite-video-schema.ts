import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteVideoSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      source_image_batch_id TEXT NOT NULL,
      source_shot_script_id TEXT NOT NULL,
      shot_count INTEGER NOT NULL DEFAULT 0,
      segment_count INTEGER NOT NULL DEFAULT 0,
      storage_dir TEXT NOT NULL,
      manifest_rel_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS segment_videos (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      source_image_batch_id TEXT NOT NULL,
      source_shot_script_id TEXT NOT NULL,
      shot_id TEXT NOT NULL DEFAULT '',
      shot_code TEXT NOT NULL DEFAULT '',
      scene_id TEXT NOT NULL,
      segment_id TEXT NOT NULL,
      segment_order INTEGER NOT NULL DEFAULT 0,
      segment_name TEXT NULL,
      segment_summary TEXT NOT NULL DEFAULT '',
      shot_count INTEGER NOT NULL DEFAULT 0,
      source_shot_ids_json TEXT NOT NULL DEFAULT '[]',
      reference_images_json TEXT NOT NULL DEFAULT '[]',
      reference_audios_json TEXT NOT NULL DEFAULT '[]',
      shot_order INTEGER NOT NULL DEFAULT 0,
      frame_dependency TEXT NOT NULL DEFAULT 'start_and_end_frame',
      status TEXT NOT NULL,
      prompt_text_seed TEXT NOT NULL DEFAULT '',
      prompt_text_current TEXT NOT NULL DEFAULT '',
      prompt_updated_at TEXT NOT NULL DEFAULT '',
      video_asset_path TEXT NULL,
      thumbnail_asset_path TEXT NULL,
      duration_sec REAL NULL,
      provider TEXT NULL,
      model TEXT NULL,
      updated_at TEXT NOT NULL,
      approved_at TEXT NULL,
      source_task_id TEXT NULL,
      storage_dir TEXT NOT NULL,
      current_video_rel_path TEXT NOT NULL,
      current_metadata_rel_path TEXT NOT NULL,
      thumbnail_rel_path TEXT NOT NULL,
      versions_storage_dir TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(batch_id) REFERENCES video_batches(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS final_cuts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      project_storage_dir TEXT NOT NULL,
      source_video_batch_id TEXT NOT NULL,
      status TEXT NOT NULL,
      video_asset_path TEXT NULL,
      manifest_asset_path TEXT NULL,
      shot_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      error_message TEXT NULL,
      storage_dir TEXT NOT NULL,
      current_video_rel_path TEXT NOT NULL,
      current_metadata_rel_path TEXT NOT NULL,
      manifest_storage_rel_path TEXT NOT NULL,
      versions_storage_dir TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    )
  `);

  ensureVideoBatchesColumn(db, "shot_count", "INTEGER NOT NULL DEFAULT 0");
  ensureVideoBatchesColumn(db, "segment_count", "INTEGER NOT NULL DEFAULT 0");
  ensureSegmentVideosColumn(db, "shot_id", "TEXT NOT NULL DEFAULT ''");
  ensureSegmentVideosColumn(db, "shot_code", "TEXT NOT NULL DEFAULT ''");
  ensureSegmentVideosColumn(db, "segment_order", "INTEGER NOT NULL DEFAULT 0");
  ensureSegmentVideosColumn(db, "segment_name", "TEXT NULL");
  ensureSegmentVideosColumn(db, "segment_summary", "TEXT NOT NULL DEFAULT ''");
  ensureSegmentVideosColumn(db, "shot_count", "INTEGER NOT NULL DEFAULT 0");
  ensureSegmentVideosColumn(db, "source_shot_ids_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureSegmentVideosColumn(db, "reference_images_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureSegmentVideosColumn(db, "reference_audios_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureSegmentVideosColumn(
    db,
    "frame_dependency",
    "TEXT NOT NULL DEFAULT 'start_and_end_frame'",
  );
  ensureSegmentVideosColumn(db, "shot_order", "INTEGER NOT NULL DEFAULT 0");
  ensureSegmentVideosColumn(db, "prompt_text_seed", "TEXT NOT NULL DEFAULT ''");
  ensureSegmentVideosColumn(db, "prompt_text_current", "TEXT NOT NULL DEFAULT ''");
  ensureSegmentVideosColumn(db, "prompt_updated_at", "TEXT NOT NULL DEFAULT ''");
  ensureFinalCutsColumn(db, "error_message", "TEXT NULL");
}

function ensureVideoBatchesColumn(
  db: SqliteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db.prepare("PRAGMA table_info(video_batches)").all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE video_batches ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function ensureSegmentVideosColumn(
  db: SqliteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db.prepare("PRAGMA table_info(segment_videos)").all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE segment_videos ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function ensureFinalCutsColumn(
  db: SqliteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db.prepare("PRAGMA table_info(final_cuts)").all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE final_cuts ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}
