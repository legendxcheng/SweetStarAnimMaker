import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteShotImageSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shot_image_batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_storage_dir TEXT NOT NULL,
      source_shot_script_id TEXT NOT NULL,
      segment_count INTEGER NOT NULL,
      shot_count INTEGER NOT NULL DEFAULT 0,
      total_frame_count INTEGER NOT NULL,
      total_required_frame_count INTEGER NOT NULL DEFAULT 0,
      storage_dir TEXT NOT NULL,
      manifest_rel_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shot_image_shots (
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
      segment_name TEXT NULL,
      segment_summary TEXT NOT NULL DEFAULT '',
      source_shot_ids_json TEXT NOT NULL DEFAULT '[]',
      shot_order INTEGER NOT NULL,
      duration_sec INTEGER NULL,
      frame_dependency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reference_status TEXT NOT NULL,
      approved_at TEXT NULL,
      updated_at TEXT NOT NULL,
      storage_dir TEXT NOT NULL,
      manifest_rel_path TEXT NOT NULL,
      start_frame_json TEXT NOT NULL,
      end_frame_json TEXT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(batch_id) REFERENCES shot_image_batches(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shot_image_frames (
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
    )
  `);

  ensureShotImageBatchesColumn(db, "shot_count", "INTEGER NOT NULL DEFAULT 0");
  ensureShotImageBatchesColumn(db, "total_required_frame_count", "INTEGER NOT NULL DEFAULT 0");
  ensureShotImageShotsColumn(db, "segment_name", "TEXT NULL");
  ensureShotImageShotsColumn(db, "segment_summary", "TEXT NOT NULL DEFAULT ''");
  ensureShotImageShotsColumn(db, "source_shot_ids_json", "TEXT NOT NULL DEFAULT '[]'");
  ensureShotImageShotsColumn(db, "status", "TEXT NOT NULL DEFAULT 'pending'");
  ensureShotImageShotsColumn(db, "approved_at", "TEXT NULL");
}

function ensureShotImageBatchesColumn(
  db: SqliteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db
    .prepare("PRAGMA table_info(shot_image_batches)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE shot_image_batches ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function ensureShotImageShotsColumn(
  db: SqliteDatabase,
  columnName: string,
  columnDefinition: string,
) {
  const columns = db.prepare("PRAGMA table_info(shot_image_shots)").all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE shot_image_shots ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}
