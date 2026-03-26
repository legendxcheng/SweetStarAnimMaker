import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteVideoSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS video_batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      source_image_batch_id TEXT NOT NULL,
      source_shot_script_id TEXT NOT NULL,
      segment_count INTEGER NOT NULL,
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
      segment_id TEXT NOT NULL,
      scene_id TEXT NOT NULL,
      segment_order INTEGER NOT NULL,
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

  ensureSegmentVideosColumn(db, "prompt_text_seed", "TEXT NOT NULL DEFAULT ''");
  ensureSegmentVideosColumn(db, "prompt_text_current", "TEXT NOT NULL DEFAULT ''");
  ensureSegmentVideosColumn(db, "prompt_updated_at", "TEXT NOT NULL DEFAULT ''");
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
