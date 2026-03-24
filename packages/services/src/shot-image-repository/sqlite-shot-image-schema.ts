import type { SqliteDatabase } from "../project-repository/sqlite-db";

export function initializeSqliteShotImageSchema(db: SqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shot_image_batches (
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
}
